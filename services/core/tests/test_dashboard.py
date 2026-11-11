"""Tổng quan: số liệu tổng hợp cho Operator/Admin; doanh thu chỉ Admin thấy (server không trả cho Operator)."""
import datetime as dt
import uuid

import pytest
from conftest import make_token
from sqlalchemy import text

from app import clock

TZ = clock.TZ


@pytest.fixture()
def shop(client, admin):
    """1 phòng, 4 khay, 1 gói 30 ngày giá 100 / khay (dựng bằng quyền Admin)."""
    room = client.post("/rooms", json={"name": "P1"}, headers=admin).json()["id"]
    for i in range(4):
        r = client.post("/trays", json={"trayCode": f"T{i}", "roomId": room, "row": 1, "shelf": 1, "slot": i + 1}, headers=admin)
        assert r.status_code == 201, r.text
    pkg = client.post("/packages", json={"name": "30 ngày", "durationDays": 30, "pricePerTray": 100}, headers=admin)
    assert pkg.status_code == 201, pkg.text
    return {"room": room, "pkg": pkg.json()["id"]}


def rent(client, shop, n=1, **choice):
    h = make_token("CUSTOMER", str(uuid.uuid4()), "Khách A")
    r = client.post("/rentals", json={"packageId": shop["pkg"], "trayCount": n, **choice}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def sql(db, q, **p):
    with db.begin() as c:
        return c.execute(text(q), p)


def get(client, headers):
    r = client.get("/dashboard", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def real_today():
    return dt.datetime.now(TZ).date()


def at(d: dt.date, hour=12) -> dt.datetime:
    return dt.datetime.combine(d, dt.time(hour), tzinfo=TZ)


def termination(db, rental_id, status, amount, reviewed: dt.datetime | None):
    sql(db, """INSERT INTO rental_termination_requests(rental_id,customer_id,status,used_days,remaining_days,refund_amount,
                 bank_name,account_number,account_holder,reviewed_at)
               SELECT id,customer_id,:s,5,25,:a,'VCB','123456','A',:rv FROM rentals WHERE id=CAST(:r AS uuid)""",
        s=status, a=amount, rv=reviewed, r=rental_id)


def test_only_staff_can_open(client, customer):
    assert client.get("/dashboard", headers=customer).status_code == 403
    assert client.get("/dashboard").status_code in (401, 403)


def test_empty_system(client, operator):
    d = get(client, operator)
    assert d["activeRentals"] == 0 and d["pendingVarieties"] == {"cycles": 0, "rentals": 0}
    assert d["expiring"]["items"] == [] and d["expiredGrowing"] == 0 and d["awaitingClearance"] == 0


def test_operator_never_receives_money_or_termination_blocks(client, shop, operator, admin, db):
    r = rent(client, shop)
    termination(db, r["id"], "PENDING_REVIEW", 70, None)
    op = get(client, operator)
    assert op["revenue"] is None and op["terminations"] is None
    assert "total_amount" not in str(op) and "refund" not in str(op).lower()
    ad = get(client, admin)
    assert ad["revenue"] is not None and ad["terminations"] == {"pendingReview": 1, "awaitingTransfer": 0}


def test_pending_varieties_counted_per_cycle_and_rental(client, shop, operator):
    rent(client, shop, 2, customVariety="Nấm Lạ")
    rent(client, shop, 1, customVariety="Nấm Khác")
    rent(client, shop, 1)                                    # chưa chọn giống: không tính
    d = get(client, operator)
    assert d["pendingVarieties"] == {"cycles": 3, "rentals": 2}
    assert d["activeRentals"] == 3


def test_expiring_window_and_order(client, shop, operator, db):
    today = clock.today()
    a, b, c_, e = (rent(client, shop) for _ in range(4))
    for r, delta in ((a, 3), (b, 0), (c_, 4), (e, 1)):       # trong 3 ngày: a, b, e; c_ còn xa
        sql(db, "UPDATE rentals SET end_date=:d, start_date=LEAST(start_date,:d) WHERE id=CAST(:i AS uuid)", d=today + dt.timedelta(days=delta), i=r["id"])
    d = get(client, operator)["expiring"]
    assert d["days"] == 3 and d["total"] == 3
    assert [i["id"] for i in d["items"]] == [b["id"], e["id"], a["id"]]
    assert [i["daysLeft"] for i in d["items"]] == [0, 1, 3]
    assert {"customerName", "packageName", "trayCount", "endDate"} <= set(d["items"][0])


def test_expired_rental_with_growing_cycle_needs_action(client, shop, operator, db):
    r = rent(client, shop)
    sql(db, "UPDATE rentals SET status='EXPIRED' WHERE id=CAST(:i AS uuid)", i=r["id"])
    d = get(client, operator)
    assert d["expiredGrowing"] == 1 and d["activeRentals"] == 0 and d["expiring"]["total"] == 0
    sql(db, "UPDATE cultivation_cycles SET status='HARVESTED', weight_kg=1, harvested_at=now() WHERE rental_id=CAST(:i AS uuid)", i=r["id"])
    assert get(client, operator)["expiredGrowing"] == 0


def test_awaiting_clearance_and_admin_termination_counts(client, shop, operator, admin, db):
    ids = [rent(client, shop)["id"] for _ in range(3)]
    termination(db, ids[0], "REFUNDED", 70, at(real_today()))
    termination(db, ids[1], "APPROVED", 70, at(real_today()))
    termination(db, ids[2], "PENDING_REVIEW", 70, None)
    assert get(client, operator)["awaitingClearance"] == 1
    assert get(client, admin)["terminations"] == {"pendingReview": 1, "awaitingTransfer": 1}


def test_revenue_counts_every_created_rental_and_subtracts_approved_refunds(client, shop, admin, db):
    today = real_today()
    first = today.replace(day=1)
    last_month = (first - dt.timedelta(days=1)).replace(day=1)
    r1 = rent(client, shop, 2)       # 200
    r2 = rent(client, shop, 1)       # 100
    r3 = rent(client, shop, 1)       # 100, tạo tháng trước
    sql(db, "UPDATE rentals SET created_at=:t WHERE id=CAST(:i AS uuid)", t=at(first), i=r1["id"])
    sql(db, "UPDATE rentals SET created_at=:t WHERE id=CAST(:i AS uuid)", t=at(first), i=r2["id"])
    sql(db, "UPDATE rentals SET created_at=:t WHERE id=CAST(:i AS uuid)", t=at(last_month), i=r3["id"])
    termination(db, r1["id"], "APPROVED", 70, at(first))                        # trừ
    termination(db, r2["id"], "REJECTED", 70, at(first))                        # bị từ chối: không trừ
    termination(db, r3["id"], "COMPLETED", 30, at(first))                       # hoàn cho đơn tháng trước nhưng duyệt tháng này: trừ vào tháng này
    rev = get(client, admin)["revenue"]
    assert rev["thisMonth"] == {"gross": 300.0, "refunds": 100.0, "net": 200.0, "orders": 2}
    assert rev["lastMonth"] == {"gross": 100.0, "refunds": 0.0, "net": 100.0, "orders": 1}
    assert rev["monthStart"] == first.isoformat()


def test_revenue_day_follows_vietnam_time_and_chart_is_zero_filled(client, shop, admin, db):
    today = real_today()
    r = rent(client, shop)
    # 17:30 UTC hôm qua = 00:30 hôm nay ở Việt Nam: phải tính vào hôm nay, không phải hôm qua
    utc = dt.datetime.combine(today - dt.timedelta(days=1), dt.time(17, 30), tzinfo=dt.timezone.utc)
    sql(db, "UPDATE rentals SET created_at=:t WHERE id=CAST(:i AS uuid)", t=utc, i=r["id"])
    daily = get(client, admin)["revenue"]["daily"]
    assert len(daily) == 30 and daily[-1]["date"] == today.isoformat() and daily[0]["date"] == (today - dt.timedelta(days=29)).isoformat()
    assert daily[-1]["gross"] == 100.0 and daily[-2]["gross"] == 0.0
    assert sum(x["gross"] for x in daily) == 100.0


def test_refund_reduces_the_day_admin_approved_it(client, shop, admin, db):
    today = real_today()
    r = rent(client, shop, 1)
    termination(db, r["id"], "APPROVED", 70, at(today - dt.timedelta(days=2)))
    daily = {x["date"]: x for x in get(client, admin)["revenue"]["daily"]}
    assert daily[(today - dt.timedelta(days=2)).isoformat()]["refunds"] == 70.0
    assert daily[today.isoformat()]["refunds"] == 0.0

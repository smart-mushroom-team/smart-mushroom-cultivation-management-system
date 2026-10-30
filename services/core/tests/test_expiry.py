"""Bước 1c: job hết hạn (lifecycle.run_expiry) - FR-22, FR-23, FR-24, FR-26, BR-05, BR-07, BR-14."""
import datetime as dt

from conftest import advance, cycles, rent
from sqlalchemy import text

from app import clock, lifecycle

D = dt.date


def set_end(db, rental_id, end: dt.date):
    with db.begin() as c:
        c.execute(text("UPDATE rentals SET end_date=:e, start_date=LEAST(start_date,:e) WHERE id=:i"), {"e": end, "i": rental_id})


def status(db, rental_id):
    with db.connect() as c:
        return c.execute(text("SELECT status FROM rentals WHERE id=:i"), {"i": rental_id}).scalar()


def count(db, sql):
    with db.connect() as c:
        return c.execute(text(sql)).scalar()


# ---------------------------------------------------------------- ranh giới ngày (BR-05)
def test_rental_not_expired_on_its_last_day(client, farm, db):
    _, _, r = rent(client, farm)
    set_end(db, r["id"], D(2030, 1, 30))
    stats = lifecycle.run_expiry(D(2030, 1, 30))                  # ngày cuối vẫn còn hiệu lực
    assert stats["expired"] == 0 and status(db, r["id"]) == "ACTIVE"
    assert lifecycle.run_expiry(D(2030, 1, 31))["expired"] == 1   # hôm sau mới hết hạn
    assert status(db, r["id"]) in ("EXPIRED", "COMPLETED")


def test_future_rentals_untouched(client, farm, db):
    _, _, r = rent(client, farm, 2)
    stats = lifecycle.run_expiry(dt.date.today())
    assert stats == {"expired": 0, "completed": 0, "errors": 0} and status(db, r["id"]) == "ACTIVE"
    assert count(db, "SELECT count(*) FROM trays WHERE occupancy_status='RENTED'") == 2


# ---------------------------------------------------------------- FR-23: còn đợt đang nuôi
def test_expired_with_growing_cycle_notifies_operator_once(client, farm, operator, customer, db):
    h, uid, r = rent(client, farm, 2)
    set_end(db, r["id"], D(2030, 1, 1))
    s1 = lifecycle.run_expiry(D(2030, 1, 2))
    assert s1["expired"] == 1 and s1["completed"] == 0 and status(db, r["id"]) == "EXPIRED"
    assert count(db, "SELECT count(*) FROM trays WHERE occupancy_status='RENTED'") == 2          # khay chưa trả (BR-07)
    for _ in range(3):                                                                           # job chạy lặp / chạy bù
        assert lifecycle.run_expiry(D(2030, 1, 3)) == {"expired": 0, "completed": 0, "errors": 0}
    staff = [n for n in client.get("/notifications", headers=operator).json() if n["type"] == "RENTAL_EXPIRED_GROWING"]
    assert len(staff) == 1 and staff[0]["data"]["rentalId"] == r["id"]
    assert all(n["type"] != "RENTAL_EXPIRED_GROWING" for n in client.get("/notifications", headers=h).json())   # không gửi cho khách


def test_never_completed_while_growing(client, farm, operator, db):
    _, _, r = rent(client, farm, 2)
    set_end(db, r["id"], D(2030, 1, 1))
    a, b = [c["id"] for c in cycles(client, operator)]
    lifecycle.run_expiry(D(2030, 2, 1))
    client.post(f"/cycles/{a}/discard", json={"reason": "x"}, headers=operator)
    lifecycle.run_expiry(D(2030, 2, 2))                                                          # còn 1 đợt GROWING
    assert status(db, r["id"]) == "EXPIRED"
    # BR-07: khay chỉ được trả khi CẢ đơn COMPLETED -> khay của đợt đã loại bỏ vẫn RENTED
    assert count(db, "SELECT count(*) FROM trays WHERE occupancy_status='RENTED'") == 2
    assert count(db, "SELECT count(*) FROM trays WHERE occupancy_status='AVAILABLE'") == 1


# ---------------------------------------------------------------- FR-24: hết hạn và không còn gì nuôi
def test_expired_without_growing_cycle_completes_immediately(client, farm, operator, db):
    h, uid, r = rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    advance(client, operator, cid, "INCUBATING", "FRUITING")
    client.post(f"/cycles/{cid}/harvest", json={"weightKg": 1}, headers=operator)              # thu hoạch sớm khi còn hạn
    assert status(db, r["id"]) == "ACTIVE"
    set_end(db, r["id"], D(2030, 1, 1))
    s = lifecycle.run_expiry(D(2030, 1, 2))
    assert s == {"expired": 1, "completed": 1, "errors": 0}
    assert status(db, r["id"]) == "COMPLETED"
    assert count(db, "SELECT count(*) FROM trays WHERE occupancy_status='RENTED'") == 0
    assert count(db, "SELECT count(*) FROM rental_trays WHERE is_active") == 0
    assert count(db, "SELECT count(*) FROM notifications WHERE type='RENTAL_EXPIRED_GROWING'") == 0   # không còn gì dang dở


# ---------------------------------------------------------------- chạy bù, idempotent, cô lập lỗi
def test_catch_up_after_missed_days(client, farm, db):
    rentals = [rent(client, farm)[2] for _ in range(3)]
    for i, r in enumerate(rentals):
        set_end(db, r["id"], D(2030, 1, 1 + i))                                                  # hết hạn rải rác trong nhiều ngày
    s = lifecycle.run_expiry(D(2030, 3, 1))                                                       # server tắt cả tháng
    assert s["expired"] == 3 and s["errors"] == 0
    assert all(status(db, r["id"]) == "EXPIRED" for r in rentals)


def test_idempotent(client, farm, db):
    _, _, r = rent(client, farm)
    set_end(db, r["id"], D(2030, 1, 1))
    first = lifecycle.run_expiry(D(2030, 2, 1))
    again = lifecycle.run_expiry(D(2030, 2, 1))
    assert first["expired"] == 1 and again == {"expired": 0, "completed": 0, "errors": 0}
    assert count(db, "SELECT count(*) FROM notifications WHERE type='RENTAL_EXPIRED_GROWING'") == 1


def test_one_failing_rental_does_not_block_others(client, farm, db, monkeypatch):
    rs = [rent(client, farm)[2] for _ in range(3)]
    for r in rs:
        set_end(db, r["id"], D(2030, 1, 1))
    real = lifecycle.try_complete

    def flaky(conn, rental_id):
        if rental_id == rs[1]["id"]:
            raise RuntimeError("lỗi giả lập")
        return real(conn, rental_id)

    monkeypatch.setattr(lifecycle, "try_complete", flaky)
    s = lifecycle.run_expiry(D(2030, 2, 1))
    assert s["errors"] == 1 and s["expired"] == 3
    # 2 đơn còn lại vẫn được xử lý đầy đủ (mỗi đơn còn đợt GROWING -> thông báo cho Operator)
    assert count(db, "SELECT count(*) FROM notifications WHERE type='RENTAL_EXPIRED_GROWING'") == 2
    monkeypatch.setattr(lifecycle, "try_complete", real)
    assert lifecycle.run_expiry(D(2030, 2, 2))["errors"] == 0                                    # lần sau tự xử lý nốt đơn lỗi
    assert count(db, "SELECT count(*) FROM notifications WHERE type='RENTAL_EXPIRED_GROWING'") == 3


# ---------------------------------------------------------------- FR-26: chế độ demo
def test_demo_endpoints_locked_when_demo_off(client, admin, operator, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "false")
    assert client.post("/demo/run-expiry", headers=admin).status_code == 403
    assert client.put("/demo/date", json={"date": "2030-01-01"}, headers=admin).status_code == 403


def test_demo_endpoints_admin_only(client, operator, customer, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    assert client.post("/demo/run-expiry", headers=operator).status_code == 403
    assert client.put("/demo/date", json={"date": "2030-01-01"}, headers=customer).status_code == 403
    assert client.post("/demo/run-expiry").status_code == 401


def test_demo_full_flow_with_simulated_date(client, farm, admin, operator, db, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    assert client.put("/demo/date", json={"date": "2030-01-01"}, headers=admin).json()["today"] == "2030-01-01"
    h, uid, r = rent(client, farm)                                          # đơn tạo theo ngày giả lập
    assert r["startDate"] == "2030-01-01" and r["endDate"] == "2030-01-30"     # gói 30 ngày tính cả hai đầu mút
    client.put("/demo/date", json={"date": "2030-01-30"}, headers=admin)
    assert client.post("/demo/run-expiry", headers=admin).json()["expired"] == 0
    client.put("/demo/date", json={"date": "2030-01-31"}, headers=admin)
    assert client.post("/demo/run-expiry", headers=admin).json()["expired"] == 1
    assert status(db, r["id"]) == "EXPIRED"
    cid = cycles(client, operator)[0]["id"]
    advance(client, operator, cid, "INCUBATING", "FRUITING")
    done = client.post(f"/cycles/{cid}/harvest", json={"weightKg": 2}, headers=operator).json()
    assert done["harvested_at"] == "2030-01-31"                              # ngày thu hoạch cũng theo ngày giả lập
    assert status(db, r["id"]) == "COMPLETED"
    # xóa ngày giả lập -> quay về ngày thật
    assert client.put("/demo/date", json={"date": None}, headers=admin).json()["today"] == clock.today().isoformat()
    assert clock.today() != D(2030, 1, 31)


def test_business_timezone_is_utc_plus_7():
    assert dt.datetime(2030, 1, 1, 12, tzinfo=dt.timezone.utc).astimezone(clock.TZ).utcoffset() == dt.timedelta(hours=7)

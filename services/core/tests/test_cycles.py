"""Bước 1b: đợt nuôi - danh sách, tiến độ, thu hoạch, loại bỏ, tự hoàn tất đơn."""
import os
import uuid

from conftest import advance, cycles, make_token, rent  # noqa: F401  (farm là fixture trong conftest)
from sqlalchemy import text


# ---------------------------------------------------------------- danh sách
def test_operator_lists_cycles_with_customer_and_end_date(client, farm, operator, customer):
    h, uid, rental = rent(client, farm, 2)
    rows = cycles(client, operator)
    assert len(rows) == 2
    assert {r["customer_name"] for r in rows} == {"Khách A"} and rows[0]["rental_end_date"] == rental["endDate"]
    assert rows[0]["stage"] == "SEEDING" and rows[0]["status"] == "GROWING"
    assert client.get("/cycles", headers=customer).status_code == 403
    assert client.get("/cycles?status=XYZ", headers=operator).status_code == 422


def test_my_trays_and_detail_ownership(client, farm, operator):
    h, uid, _ = rent(client, farm, 1)
    mine = client.get("/my-trays", headers=h).json()
    assert len(mine) == 1 and mine[0]["tray_code"].startswith("T")
    cid = mine[0]["id"]
    assert client.get(f"/cycles/{cid}", headers=h).status_code == 200
    other = make_token("CUSTOMER")
    assert client.get("/my-trays", headers=other).json() == []
    assert client.get(f"/cycles/{cid}", headers=other).status_code == 404        # BR-02
    assert client.get(f"/cycles/{cid}", headers=operator).status_code == 200


# ---------------------------------------------------------------- tiến độ
def test_stage_must_advance_one_step(client, farm, operator):
    h, uid, _ = rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    bad = client.patch(f"/cycles/{cid}", json={"stage": "FRUITING"}, headers=operator)        # nhảy cóc
    assert bad.status_code == 409 and bad.json()["error"]["code"] == "INVALID_STAGE_TRANSITION"
    assert client.patch(f"/cycles/{cid}", json={"stage": "SEEDING"}, headers=operator).status_code == 409   # đứng yên
    advance(client, operator, cid, "INCUBATING", "FRUITING")
    assert client.patch(f"/cycles/{cid}", json={"stage": "INCUBATING"}, headers=operator).status_code == 409  # lùi
    advance(client, operator, cid, "READY")
    assert client.patch(f"/cycles/{cid}", json={"stage": "READY"}, headers=operator).status_code == 409       # hết bước
    logs = client.get(f"/cycles/{cid}", headers=h).json()["logs"]
    pairs = [(g["from_stage"], g["to_stage"]) for g in logs]
    assert pairs == [("SEEDING", "INCUBATING"), ("INCUBATING", "FRUITING"), ("FRUITING", "READY")]


def test_stage_change_notifies_customer_once_each(client, farm, operator):
    h, uid, _ = rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    advance(client, operator, cid, "INCUBATING")
    notes = client.get("/notifications", headers=h).json()
    assert [n["type"] for n in notes].count("CYCLE_STAGE") == 1
    assert all(n["type"] != "CYCLE_STAGE" for n in client.get("/notifications", headers=operator).json())


def test_update_info_without_stage_and_validation(client, farm, operator):
    rent(client, farm)
    c0 = cycles(client, operator)[0]
    r = client.patch(f"/cycles/{c0['id']}", json={"variety": "Nấm sò", "expectedHarvestDate": "2099-01-01", "note": "ok"}, headers=operator)
    assert r.status_code == 200 and r.json()["variety"] == "Nấm sò" and r.json()["stage"] == "SEEDING"
    assert client.patch(f"/cycles/{c0['id']}", json={"expectedHarvestDate": "2000-01-01"}, headers=operator).status_code == 422
    assert client.patch(f"/cycles/{c0['id']}", json={"stage": "BOGUS"}, headers=operator).status_code == 422
    assert client.patch(f"/cycles/{uuid.uuid4()}", json={"note": "x"}, headers=operator).status_code == 404


# ---------------------------------------------------------------- thu hoạch
def test_harvest_only_from_fruiting_or_ready(client, farm, operator):
    rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    r = client.post(f"/cycles/{cid}/harvest", json={"weightKg": 2}, headers=operator)
    assert r.status_code == 409 and r.json()["error"]["code"] == "CYCLE_NOT_READY"
    advance(client, operator, cid, "INCUBATING")
    assert client.post(f"/cycles/{cid}/harvest", json={"weightKg": 2}, headers=operator).status_code == 409
    advance(client, operator, cid, "FRUITING")
    r = client.post(f"/cycles/{cid}/harvest", json={"weightKg": 2.5, "note": "đẹp"}, headers=operator)
    assert r.status_code == 200 and r.json()["status"] == "HARVESTED" and r.json()["weight_kg"] == 2.5 and r.json()["harvested_at"]


def test_harvest_validation_and_double_harvest(client, farm, operator):
    rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    advance(client, operator, cid, "INCUBATING", "FRUITING")
    assert client.post(f"/cycles/{cid}/harvest", json={"weightKg": 0}, headers=operator).status_code == 422
    assert client.post(f"/cycles/{cid}/harvest", json={"weightKg": -1}, headers=operator).status_code == 422
    assert client.post(f"/cycles/{cid}/harvest", json={"weightKg": 1}, headers=operator).status_code == 200
    r = client.post(f"/cycles/{cid}/harvest", json={"weightKg": 1}, headers=operator)
    assert r.status_code == 409 and r.json()["error"]["code"] == "CYCLE_NOT_GROWING"
    assert client.patch(f"/cycles/{cid}", json={"note": "x"}, headers=operator).status_code == 409          # đã kết thúc


def test_harvest_on_active_rental_keeps_tray_rented(client, farm, operator, db):
    rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    advance(client, operator, cid, "INCUBATING", "FRUITING")
    client.post(f"/cycles/{cid}/harvest", json={"weightKg": 1}, headers=operator)
    with db.connect() as c:
        assert c.execute(text("SELECT status FROM rentals")).scalar() == "ACTIVE"           # chưa hết hạn: chưa hoàn tất
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='RENTED'")).scalar() == 1


# ---------------------------------------------------------------- loại bỏ
def test_discard_requires_reason(client, farm, operator):
    h, uid, _ = rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    assert client.post(f"/cycles/{cid}/discard", json={"reason": ""}, headers=operator).status_code == 422
    assert client.post(f"/cycles/{cid}/discard", json={"reason": "   "}, headers=operator).status_code == 422
    assert client.post(f"/cycles/{cid}/discard", json={}, headers=operator).status_code == 422
    r = client.post(f"/cycles/{cid}/discard", json={"reason": "Nhiễm mốc xanh"}, headers=operator)
    assert r.status_code == 200 and r.json()["status"] == "DISCARDED" and r.json()["discard_reason"] == "Nhiễm mốc xanh"
    assert client.post(f"/cycles/{cid}/discard", json={"reason": "again"}, headers=operator).status_code == 409
    assert any(n["type"] == "CYCLE_DISCARDED" for n in client.get("/notifications", headers=h).json())


def test_customer_cannot_modify_cycles(client, farm, operator):
    h, uid, _ = rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    assert client.patch(f"/cycles/{cid}", json={"note": "x"}, headers=h).status_code == 403
    assert client.post(f"/cycles/{cid}/harvest", json={"weightKg": 1}, headers=h).status_code == 403
    assert client.post(f"/cycles/{cid}/discard", json={"reason": "x"}, headers=h).status_code == 403


# ---------------------------------------------------------------- hoàn tất đơn (FR-24)
def _expire(db):
    with db.begin() as c:
        c.execute(text("UPDATE rentals SET status='EXPIRED'"))


def test_expired_rental_completes_when_last_cycle_closed(client, farm, operator, db):
    h, uid, rental = rent(client, farm, 2)
    c1, c2 = [c["id"] for c in cycles(client, operator)]
    _expire(db)
    advance(client, operator, c1, "INCUBATING", "FRUITING")             # đơn EXPIRED vẫn cập nhật được
    client.post(f"/cycles/{c1}/harvest", json={"weightKg": 3}, headers=operator)
    with db.connect() as c:
        assert c.execute(text("SELECT status FROM rentals")).scalar() == "EXPIRED"            # còn 1 đợt GROWING
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='RENTED'")).scalar() == 2
    assert client.post(f"/cycles/{c2}/discard", json={"reason": "hỏng"}, headers=operator).status_code == 200
    with db.connect() as c:
        assert c.execute(text("SELECT status FROM rentals")).scalar() == "COMPLETED"
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='AVAILABLE'")).scalar() == 3
        assert c.execute(text("SELECT count(*) FROM rental_trays WHERE is_active")).scalar() == 0
    types = [n["type"] for n in client.get("/notifications", headers=h).json()]
    assert types.count("RENTAL_COMPLETED") == 1
    assert client.get("/my-trays", headers=h).json() == []
    assert client.get("/rentals/mine", headers=h).json()[0]["status"] == "COMPLETED"


def test_freed_trays_can_be_rented_again(client, farm, operator, db):
    h, uid, _ = rent(client, farm, 3)
    assert client.post("/rentals", json={"packageId": farm["pkg"], "trayCount": 1}, headers=make_token("CUSTOMER")).status_code == 409
    _expire(db)
    for c_ in cycles(client, operator):
        client.post(f"/cycles/{c_['id']}/discard", json={"reason": "x"}, headers=operator)
    assert client.post("/rentals", json={"packageId": farm["pkg"], "trayCount": 3}, headers=make_token("CUSTOMER")).status_code == 201


# ---------------------------------------------------------------- quyền xem phòng (Monitoring gọi sang)
def test_internal_access_returns_rental_start_as_since(client, farm, db):
    import datetime as dt
    h, uid, r = rent(client, farm)
    sk = {"X-Service-Key": os.environ["SERVICE_KEY"]}
    out = client.get(f"/internal/access/rooms/{farm['room']}", params={"customerId": uid}, headers=sk).json()
    assert out["allowed"] is True and out["since"] == r["startDate"]
    # khách có 2 đơn trong cùng phòng: since là ngày bắt đầu SỚM nhất
    with db.begin() as c:
        c.execute(text("UPDATE rentals SET start_date = start_date - 10"))
    rent(client, farm, 1, uid)
    out = client.get(f"/internal/access/rooms/{farm['room']}", params={"customerId": uid}, headers=sk).json()
    assert out["since"] == (dt.date.fromisoformat(r["startDate"]) - dt.timedelta(days=10)).isoformat()
    # hết hạn thì mất quyền ngay
    with db.begin() as c:
        c.execute(text("UPDATE rentals SET status='EXPIRED'"))
    out = client.get(f"/internal/access/rooms/{farm['room']}", params={"customerId": uid}, headers=sk).json()
    assert out["allowed"] is False and out["since"] is None
    other = client.get(f"/internal/access/rooms/{farm['room']}", params={"customerId": str(uuid.uuid4())}, headers=sk).json()
    assert other["allowed"] is False

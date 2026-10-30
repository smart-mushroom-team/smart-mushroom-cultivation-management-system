"""Bước 1a: CRUD phòng, khay, gói."""
import os

from sqlalchemy import text


def _room(client, h, name="P1"):
    return client.post("/rooms", json={"name": name}, headers=h).json()["id"]


def _tray(client, h, room, code="T1", **kw):
    return client.post("/trays", json={"trayCode": code, "roomId": room, "row": 1, "shelf": 1, "slot": 1, **kw}, headers=h)


# ---------- phòng ----------
def test_update_room_name(client, operator):
    rid = _room(client, operator)
    r = client.patch(f"/rooms/{rid}", json={"name": "Phòng mới"}, headers=operator)
    assert r.status_code == 200 and r.json()["name"] == "Phòng mới" and r.json()["status"] == "ACTIVE"


def test_room_not_found(client, operator):
    r = client.patch("/rooms/00000000-0000-0000-0000-000000000000", json={"name": "x"}, headers=operator)
    assert r.status_code == 404 and r.json()["error"]["code"] == "ROOM_NOT_FOUND"


def test_deactivate_room_ok_when_no_rented_tray(client, operator):
    rid = _room(client, operator)
    _tray(client, operator, rid)
    r = client.patch(f"/rooms/{rid}", json={"status": "INACTIVE"}, headers=operator)
    assert r.status_code == 200 and r.json()["status"] == "INACTIVE"
    assert client.patch(f"/rooms/{rid}", json={"status": "ACTIVE"}, headers=operator).json()["status"] == "ACTIVE"


def test_deactivate_room_blocked_when_tray_rented(client, operator, db):
    rid = _room(client, operator)
    tid = _tray(client, operator, rid).json()["id"]
    with db.begin() as c:
        c.execute(text("UPDATE trays SET occupancy_status='RENTED' WHERE id=:i"), {"i": tid})
    r = client.patch(f"/rooms/{rid}", json={"status": "INACTIVE"}, headers=operator)
    assert r.status_code == 409 and r.json()["error"]["code"] == "ROOM_HAS_RENTED_TRAYS"
    assert client.get("/rooms", headers=operator).json()[0]["status"] == "ACTIVE"


def test_room_validation_and_roles(client, operator, customer):
    rid = _room(client, operator)
    assert client.patch(f"/rooms/{rid}", json={"status": "BROKEN"}, headers=operator).status_code == 422
    assert client.patch(f"/rooms/{rid}", json={"name": "x"}, headers=customer).status_code == 403
    assert client.patch(f"/rooms/{rid}", json={"name": "x"}).status_code == 401


# ---------- khay ----------
def test_duplicate_tray_code(client, operator):
    rid = _room(client, operator)
    assert _tray(client, operator, rid, "T1").status_code == 201
    r = _tray(client, operator, rid, "T1")
    assert r.status_code == 409 and r.json()["error"]["code"] == "TRAY_CODE_EXISTS"


def test_tray_in_missing_room(client, operator):
    r = _tray(client, operator, "00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_update_tray_and_move_room(client, operator):
    r1, r2 = _room(client, operator, "A"), _room(client, operator, "B")
    tid = _tray(client, operator, r1).json()["id"]
    r = client.patch(f"/trays/{tid}", json={"trayCode": "T9", "roomId": r2, "slot": 4}, headers=operator)
    assert r.status_code == 200
    assert r.json()["tray_code"] == "T9" and r.json()["room_id"] == r2 and r.json()["location_slot"] == 4


def test_cannot_move_rented_tray(client, operator, db):
    r1, r2 = _room(client, operator, "A"), _room(client, operator, "B")
    tid = _tray(client, operator, r1).json()["id"]
    with db.begin() as c:
        c.execute(text("UPDATE trays SET occupancy_status='RENTED' WHERE id=:i"), {"i": tid})
    r = client.patch(f"/trays/{tid}", json={"roomId": r2}, headers=operator)
    assert r.status_code == 409 and r.json()["error"]["code"] == "TRAY_RENTED"
    assert client.patch(f"/trays/{tid}", json={"slot": 2}, headers=operator).status_code == 200   # sửa vị trí vẫn được


def test_delete_never_rented_tray(client, operator):
    tid = _tray(client, operator, _room(client, operator)).json()["id"]
    assert client.delete(f"/trays/{tid}", headers=operator).status_code == 204
    assert client.delete(f"/trays/{tid}", headers=operator).status_code == 404
    assert client.get("/trays", headers=operator).json() == []


def test_cannot_delete_tray_with_history(client, operator, admin, customer, db):
    """Khay từng thuê (kể cả đơn đã xong, khay đã AVAILABLE lại) vẫn không xóa được."""
    rid = _room(client, operator)
    tid = _tray(client, operator, rid).json()["id"]
    pid = client.post("/packages", json={"name": "30", "durationDays": 30, "pricePerTray": 100}, headers=admin).json()["id"]
    assert client.post("/rentals", json={"packageId": pid, "trayCount": 1}, headers=customer).status_code == 201
    with db.begin() as c:       # giả lập đơn đã hoàn tất, khay trả về AVAILABLE
        c.execute(text("UPDATE rentals SET status='COMPLETED'"))
        c.execute(text("UPDATE rental_trays SET is_active=false"))
        c.execute(text("UPDATE trays SET occupancy_status='AVAILABLE'"))
    r = client.delete(f"/trays/{tid}", headers=operator)
    assert r.status_code == 409 and r.json()["error"]["code"] == "TRAY_HAS_HISTORY"


# ---------- gói ----------
def test_package_update_and_toggle(client, admin, customer):
    pid = client.post("/packages", json={"name": "30", "durationDays": 30, "pricePerTray": 100}, headers=admin).json()["id"]
    r = client.patch(f"/packages/{pid}", json={"pricePerTray": 120, "name": "30 ngày"}, headers=admin)
    assert r.status_code == 200 and r.json()["price_per_tray"] == 120 and r.json()["duration_days"] == 30
    client.patch(f"/packages/{pid}", json={"isActive": False}, headers=admin)
    assert client.get("/packages", headers=customer).json()["packages"] == []          # khách không thấy gói đã tắt
    assert len(client.get("/packages/all", headers=admin).json()) == 1                 # admin vẫn thấy
    client.patch(f"/packages/{pid}", json={"isActive": True}, headers=admin)
    assert len(client.get("/packages", headers=customer).json()["packages"]) == 1


def test_package_validation_and_roles(client, admin, operator):
    pid = client.post("/packages", json={"name": "30", "durationDays": 30, "pricePerTray": 100}, headers=admin).json()["id"]
    assert client.patch(f"/packages/{pid}", json={"durationDays": 0}, headers=admin).status_code == 422
    assert client.patch(f"/packages/{pid}", json={"pricePerTray": -1}, headers=admin).status_code == 422
    assert client.patch(f"/packages/{pid}", json={"name": "x"}, headers=operator).status_code == 403     # chỉ Admin
    assert client.patch("/packages/00000000-0000-0000-0000-000000000000", json={"name": "x"}, headers=admin).status_code == 404


def test_old_rental_keeps_snapshot_after_package_change(client, admin, operator, customer):
    rid = _room(client, operator)
    _tray(client, operator, rid)
    pid = client.post("/packages", json={"name": "Gói A", "durationDays": 30, "pricePerTray": 100}, headers=admin).json()["id"]
    r = client.post("/rentals", json={"packageId": pid, "trayCount": 1}, headers=customer)
    assert r.status_code == 201 and r.json()["totalAmount"] == 100
    client.patch(f"/packages/{pid}", json={"name": "Gói B", "durationDays": 7, "pricePerTray": 999, "isActive": False}, headers=admin)
    mine = client.get("/rentals/mine", headers=customer).json()[0]
    assert mine["package_name"] == "Gói A" and mine["end_date"] == r.json()["endDate"]


def test_internal_room_info(client, operator, monkeypatch):
    rid = _room(client, operator)
    h = {"X-Service-Key": os.environ["SERVICE_KEY"]}
    assert client.get(f"/internal/rooms/{rid}", headers=h).json() == {"exists": True, "active": True}
    client.patch(f"/rooms/{rid}", json={"status": "INACTIVE"}, headers=operator)
    assert client.get(f"/internal/rooms/{rid}", headers=h).json() == {"exists": True, "active": False}
    assert client.get("/internal/rooms/00000000-0000-0000-0000-000000000000", headers=h).json()["exists"] is False
    assert client.get("/internal/rooms/abc", headers=h).json()["exists"] is False
    assert client.get(f"/internal/rooms/{rid}").status_code in (401, 403)

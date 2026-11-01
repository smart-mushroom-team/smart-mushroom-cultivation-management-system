"""Bước 2a: quản lý thiết bị."""
import uuid

from sqlalchemy import text


def create(client, operator, room, **kw):
    body = {"name": "Cảm biến 1", "type": "SENSOR_NODE", "roomId": room, **kw}
    return client.post("/devices", json=body, headers=operator)


def send(client, key, **kw):
    return client.post("/iot/telemetry", json={"temperature": 25, "humidity": 85, **kw}, headers={"X-Device-Key": key})


def test_create_returns_key_once_and_stores_only_hash(client, operator, room, db):
    r = create(client, operator, room)
    assert r.status_code == 201 and len(r.json()["apiKey"]) >= 32
    key = r.json()["apiKey"]
    with db.connect() as c:
        h = c.execute(text("SELECT api_key_hash FROM devices")).scalar()
    assert h != key and len(h) == 64                                     # chỉ lưu SHA-256
    listing = client.get("/devices", headers=operator).json()
    assert len(listing) == 1 and "apiKey" not in listing[0] and key not in str(listing)
    assert send(client, key).status_code == 202                          # khóa vừa tạo dùng được ngay


def test_create_also_creates_default_thresholds_for_sensor_only(client, operator, room, db):
    create(client, operator, room, type="CAMERA", name="Cam")
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM room_thresholds")).scalar() == 0
    create(client, operator, room)
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM room_thresholds")).scalar() == 1


def test_create_validation(client, operator, room, core):
    assert create(client, operator, room, type="TOASTER").status_code == 422
    assert create(client, operator, room, intervalSec=1).status_code == 422
    assert create(client, operator, room, name="").status_code == 422
    r = create(client, operator, str(uuid.uuid4()))                      # phòng không tồn tại
    assert r.status_code == 404 and r.json()["error"]["code"] == "ROOM_NOT_FOUND"
    assert create(client, operator, "khong-phai-uuid").status_code == 404


def test_core_down_fails_closed(client, operator, room, core):
    core.down = True
    assert create(client, operator, room).status_code == 503


def test_one_active_device_per_type_per_room(client, operator, room):
    assert create(client, operator, room).status_code == 201
    r = create(client, operator, room, name="Cảm biến 2")
    assert r.status_code == 409 and r.json()["error"]["code"] == "DEVICE_EXISTS_IN_ROOM"
    assert create(client, operator, room, type="CAMERA", name="Cam").status_code == 201      # khác loại thì được


def test_replace_device_after_deactivating_old(client, operator, room):
    old = create(client, operator, room).json()["id"]
    assert client.patch(f"/devices/{old}", json={"status": "INACTIVE"}, headers=operator).json()["status"] == "INACTIVE"
    new = create(client, operator, room, name="Thay thế")
    assert new.status_code == 201
    r = client.patch(f"/devices/{old}", json={"status": "ACTIVE"}, headers=operator)          # bật lại cái cũ -> trùng
    assert r.status_code == 409


def test_deactivated_device_rejected_then_accepted_again(client, operator, room):
    d = create(client, operator, room).json()
    client.patch(f"/devices/{d['id']}", json={"status": "INACTIVE"}, headers=operator)
    assert send(client, d["apiKey"]).status_code == 401
    client.patch(f"/devices/{d['id']}", json={"status": "ACTIVE"}, headers=operator)
    assert send(client, d["apiKey"]).status_code == 202


def test_patch_name_and_interval(client, operator, room):
    d = create(client, operator, room).json()
    r = client.patch(f"/devices/{d['id']}", json={"name": "Mới", "intervalSec": 60}, headers=operator)
    assert r.status_code == 200 and r.json()["name"] == "Mới" and r.json()["intervalSec"] == 60 and r.json()["status"] == "ACTIVE"
    assert client.patch(f"/devices/{d['id']}", json={"intervalSec": 2}, headers=operator).status_code == 422
    assert client.patch(f"/devices/{d['id']}", json={"status": "X"}, headers=operator).status_code == 422
    assert client.patch(f"/devices/{uuid.uuid4()}", json={"name": "x"}, headers=operator).status_code == 404
    assert client.patch("/devices/abc", json={"name": "x"}, headers=operator).status_code == 404


def test_rotate_key_invalidates_old_key(client, operator, room):
    d = create(client, operator, room).json()
    old = d["apiKey"]
    r = client.post(f"/devices/{d['id']}/rotate-key", headers=operator)
    assert r.status_code == 200 and r.json()["apiKey"] != old
    assert send(client, old).status_code == 401                          # khóa cũ chết ngay
    assert send(client, r.json()["apiKey"]).status_code == 202
    assert client.post(f"/devices/{uuid.uuid4()}/rotate-key", headers=operator).status_code == 404


def test_list_filters_and_online_flag(client, operator, room, core):
    d = create(client, operator, room).json()
    other = str(uuid.uuid4())
    core.rooms.add(other)
    create(client, operator, other, type="CAMERA", name="Cam")
    assert len(client.get("/devices", headers=operator).json()) == 2
    assert [x["id"] for x in client.get(f"/devices?roomId={room}", headers=operator).json()] == [d["id"]]
    assert len(client.get("/devices?type=CAMERA", headers=operator).json()) == 1
    assert client.get("/devices?roomId=xyz", headers=operator).status_code == 404
    assert client.get(f"/devices?roomId={room}", headers=operator).json()[0]["online"] is False     # chưa gửi gì
    send(client, d["apiKey"])
    assert client.get(f"/devices?roomId={room}", headers=operator).json()[0]["online"] is True


def test_roles(client, operator, admin, customer, room):
    assert client.get("/devices", headers=customer).status_code == 403
    assert client.post("/devices", json={"name": "x", "type": "CAMERA", "roomId": room}, headers=customer).status_code == 403
    assert client.get("/devices").status_code == 401
    assert client.get("/devices", headers=admin).status_code == 200            # Admin kế thừa quyền Operator


def test_wrong_or_missing_key(client):
    assert send(client, "sai-khoa").status_code == 401
    assert client.post("/iot/telemetry", json={"temperature": 1, "humidity": 1}).status_code == 401


def test_api_key_format_is_cli_safe(client, operator, room):
    d = create(client, operator, room).json()
    assert d["apiKey"].startswith("mk_") and len(d["apiKey"]) >= 40
    rotated = client.post(f"/devices/{d['id']}/rotate-key", headers=operator).json()["apiKey"]
    assert rotated.startswith("mk_") and rotated != d["apiKey"]

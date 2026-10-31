"""Bước 2b: nhận số liệu cảm biến, ảnh camera, và xem lại (có kiểm tra quyền)."""
import datetime as dt
import os
import uuid

import pytest
from conftest import make_token
from sqlalchemy import text

JPEG = b"\xff\xd8\xff\xe0" + os.urandom(200)
JPEG2 = b"\xff\xd8\xff\xe1" + os.urandom(300)
PNG = b"\x89PNG\r\n\x1a\n" + os.urandom(100)


@pytest.fixture(autouse=True)
def snap_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("SNAPSHOT_DIR", str(tmp_path / "snaps"))
    return tmp_path / "snaps"


def stored(snap_dir):
    """Danh sách file ảnh đã lưu (mọi phòng)."""
    return sorted(snap_dir.rglob("*.jpg")) if snap_dir.exists() else []


def make_device(client, operator, room, type_="SENSOR_NODE"):
    r = client.post("/devices", json={"name": f"d-{uuid.uuid4().hex[:4]}", "type": type_, "roomId": room}, headers=operator)
    assert r.status_code == 201, r.text
    return r.json()["apiKey"]


@pytest.fixture()
def sensor(client, operator, room):
    return make_device(client, operator, room)


@pytest.fixture()
def camera(client, operator, room):
    return make_device(client, operator, room, "CAMERA")


def tele(client, key, **body):
    return client.post("/iot/telemetry", json=body, headers={"X-Device-Key": key})


def snap(client, key, data=JPEG, ctype="image/jpeg"):
    return client.post("/iot/snapshot", content=data, headers={"X-Device-Key": key, "Content-Type": ctype})


def rows(db, sql):
    with db.connect() as c:
        return c.execute(text(sql)).scalar()


# ================================================================ telemetry
def test_telemetry_stored_cached_published(client, sensor, room, db, published, cache_stub):
    r = tele(client, sensor, temperature=26.5, humidity=88)
    assert r.status_code == 202
    assert rows(db, "SELECT count(*) FROM sensor_readings") == 1
    assert rows(db, "SELECT last_seen_at IS NOT NULL FROM devices") is True
    assert cache_stub[f"snap:{room}"]["temperature"] == 26.5
    assert [q for q, _ in published] == ["telemetry.events"]
    assert published[0][1]["roomId"] == room and published[0][1]["humidity"] == 88


def test_humidity_only_is_accepted(client, sensor, db):
    assert tele(client, sensor, humidity=70).status_code == 202
    assert rows(db, "SELECT temperature IS NULL FROM sensor_readings") is True


@pytest.mark.parametrize("body", [
    {}, {"temperature": 200, "humidity": 50}, {"temperature": -50}, {"humidity": 101}, {"humidity": -1},
    {"temperature": "abc"}, {"temperature": 25, "recordedAt": "không-phải-ngày"},
])
def test_invalid_telemetry_rejected_and_not_stored(client, sensor, db, body):
    assert tele(client, sensor, **body).status_code == 422
    assert rows(db, "SELECT count(*) FROM sensor_readings") == 0


def test_nan_rejected(client, sensor, db):
    r = client.post("/iot/telemetry", content=b'{"temperature": NaN, "humidity": 50}',
                    headers={"X-Device-Key": sensor, "Content-Type": "application/json"})
    assert r.status_code == 422 and rows(db, "SELECT count(*) FROM sensor_readings") == 0


def test_timestamps(client, sensor, db):
    now = dt.datetime.now(dt.timezone.utc)
    assert tele(client, sensor, temperature=25, recordedAt=(now + dt.timedelta(hours=1)).isoformat()).status_code == 422   # tương lai
    assert tele(client, sensor, temperature=25, recordedAt=(now - dt.timedelta(days=30)).isoformat()).status_code == 422    # quá cũ
    assert tele(client, sensor, temperature=25, recordedAt=(now + dt.timedelta(minutes=2)).isoformat()).status_code == 202   # lệch nhẹ
    naive = (now - dt.timedelta(minutes=10)).replace(tzinfo=None).isoformat()          # không có múi giờ: coi là UTC
    assert tele(client, sensor, temperature=25, recordedAt=naive).status_code == 202
    assert rows(db, "SELECT count(*) FROM sensor_readings") == 2


def test_late_packet_does_not_overwrite_newer_snapshot(client, sensor, room, db, cache_stub):
    now = dt.datetime.now(dt.timezone.utc)
    tele(client, sensor, temperature=30, recordedAt=now.isoformat())
    tele(client, sensor, temperature=20, recordedAt=(now - dt.timedelta(minutes=5)).isoformat())   # gói đến trễ
    assert cache_stub[f"snap:{room}"]["temperature"] == 30
    assert rows(db, "SELECT count(*) FROM sensor_readings") == 2                                    # vẫn lưu để làm lịch sử


def test_telemetry_key_checks(client, sensor, camera, db, published):
    assert tele(client, "khoa-sai", temperature=25).status_code == 401
    assert client.post("/iot/telemetry", json={"temperature": 25}).status_code == 401
    r = tele(client, camera, temperature=25)                                   # camera gửi số liệu
    assert r.status_code == 400 and r.json()["error"]["code"] == "WRONG_DEVICE_TYPE"
    assert rows(db, "SELECT count(*) FROM sensor_readings") == 0 and published == []


# ================================================================ snapshot
def test_snapshot_raw_jpeg_saved_and_marks_camera_online(client, camera, room, snap_dir, operator):
    r = snap(client, camera)
    assert r.status_code == 202 and r.json()["bytes"] == len(JPEG)
    assert [p.read_bytes() for p in stored(snap_dir)] == [JPEG] and stored(snap_dir)[0].parent.name == room
    assert r.json()["id"] == stored(snap_dir)[0].stem
    assert (snap_dir / f"{room}.jpg").read_bytes() == JPEG
    assert client.get(f"/devices?roomId={room}&type=CAMERA", headers=operator).json()[0]["online"] is True


def test_snapshot_multipart(client, camera, room, snap_dir):
    r = client.post("/iot/snapshot", files={"image": ("s.jpg", JPEG, "image/jpeg")}, headers={"X-Device-Key": camera})
    assert r.status_code == 202 and [p.read_bytes() for p in stored(snap_dir)] == [JPEG]
    assert r.status_code == 202 and (snap_dir / f"{room}.jpg").read_bytes() == JPEG
    r = client.post("/iot/snapshot", files={"khac": ("s.jpg", JPEG, "image/jpeg")}, headers={"X-Device-Key": camera})
    assert r.status_code == 422 and r.json()["error"]["code"] == "MISSING_IMAGE"


def test_snapshots_accumulate_history_and_latest_is_newest(client, camera, room, snap_dir, operator, db):
    snap(client, camera, JPEG)
    snap(client, camera, JPEG2)
    assert len(stored(snap_dir)) == 2                                         # giữ lịch sử, không ghi đè
    assert rows(db, "SELECT count(*) FROM camera_snapshots") == 2
    assert client.get(f"/rooms/{room}/camera/latest", headers=operator).content == JPEG2
    assert not list(snap_dir.rglob("*.tmp"))                                  # không còn tệp tạm
def test_snapshot_overwrites_keeps_only_latest(client, camera, room, snap_dir):
    snap(client, camera, JPEG)
    snap(client, camera, JPEG2)
    assert (snap_dir / f"{room}.jpg").read_bytes() == JPEG2
    assert [p.name for p in snap_dir.iterdir()] == [f"{room}.jpg"]            # không còn tệp tạm hay bản cũ


@pytest.mark.parametrize("data,ctype,code,err", [
    (PNG, "image/jpeg", 415, "NOT_A_JPEG"),                       # khai là JPEG nhưng byte đầu là PNG
    (b"<html>hi</html>", "image/jpeg", 415, "NOT_A_JPEG"),
    (JPEG, "text/plain", 415, "UNSUPPORTED_MEDIA_TYPE"),
    (b"\xff\xd8\xff" + b"0" * 1_600_000, "image/jpeg", 413, "IMAGE_TOO_LARGE"),
])
def test_bad_snapshots_rejected_and_nothing_saved(client, camera, snap_dir, data, ctype, code, err):
    r = snap(client, camera, data, ctype)
    assert r.status_code == code and r.json()["error"]["code"] == err
    assert stored(snap_dir) == []
    assert not snap_dir.exists() or list(snap_dir.iterdir()) == []


def test_snapshot_key_checks(client, sensor, camera, operator, room, snap_dir):
    assert snap(client, "khoa-sai").status_code == 401
    r = snap(client, sensor)                                                  # cảm biến gửi ảnh
    assert r.status_code == 400 and r.json()["error"]["code"] == "WRONG_DEVICE_TYPE"
    cid = client.get(f"/devices?roomId={room}&type=CAMERA", headers=operator).json()[0]["id"]
    client.patch(f"/devices/{cid}", json={"status": "INACTIVE"}, headers=operator)
    assert snap(client, camera).status_code == 401                            # camera đã tắt
    assert stored(snap_dir) == []
    assert not snap_dir.exists() or list(snap_dir.iterdir()) == []


# ================================================================ xem lại (kiểm tra quyền, BR-08)
def test_camera_latest_for_operator(client, camera, room, operator):
    snap(client, camera)
    r = client.get(f"/rooms/{room}/camera/latest", headers=operator)
    assert r.status_code == 200 and r.content == JPEG and r.headers["content-type"] == "image/jpeg"
    assert r.headers["cache-control"] == "no-store" and r.headers["x-captured-at"]


def test_camera_latest_customer_needs_active_rental(client, camera, room, core):
    snap(client, camera)
    uid = str(uuid.uuid4())
    h = make_token("CUSTOMER", uid)
    r = client.get(f"/rooms/{room}/camera/latest", headers=h)
    assert r.status_code == 403 and r.json()["error"]["code"] == "NO_ACTIVE_RENTAL"
    core.access.add((room, uid))
    assert client.get(f"/rooms/{room}/camera/latest", headers=h).content == JPEG
    core.access.clear()                                                       # đơn hết hạn: mất quyền NGAY, không cache
    assert client.get(f"/rooms/{room}/camera/latest", headers=h).status_code == 403


def test_customer_cannot_see_another_room(client, camera, room, core):
    snap(client, camera)
    uid = str(uuid.uuid4())
    other = str(uuid.uuid4())
    core.access.add((other, uid))
    assert client.get(f"/rooms/{room}/camera/latest", headers=make_token("CUSTOMER", uid)).status_code == 403


def test_camera_latest_core_down_fails_closed(client, camera, room, core):
    snap(client, camera)
    core.down = True
    assert client.get(f"/rooms/{room}/camera/latest", headers=make_token("CUSTOMER")).status_code == 503


def test_camera_latest_other_errors(client, camera, room, operator):
def test_camera_latest_other_errors(client, camera, room, operator, snap_dir):
    assert client.get(f"/rooms/{room}/camera/latest", headers=operator).json()["error"]["code"] == "NO_SNAPSHOT"
    assert client.get(f"/rooms/{room}/camera/latest").status_code == 401


@pytest.mark.parametrize("bad", ["not-a-uuid", "..%2F..%2Fetc%2Fpasswd", "%2e%2e%2fsecret", "1234"])
def test_room_id_path_traversal_blocked(client, operator, bad):
    for path in ("camera/latest", "latest", "chart"):
        r = client.get(f"/rooms/{bad}/{path}", headers=operator)
        assert r.status_code == 404, (path, r.status_code)


# ================================================================ latest / chart sau khi có dữ liệu
def test_latest_reads_cache_then_db_fallback(client, sensor, room, operator, cache_stub):
    tele(client, sensor, temperature=25, humidity=80)
    r = client.get(f"/rooms/{room}/latest", headers=operator).json()
    assert r["snapshot"]["temperature"] == 25 and r["deviceOnline"] is True
    cache_stub.clear()                                                         # Redis mất dữ liệu
    r = client.get(f"/rooms/{room}/latest", headers=operator).json()
    assert r["snapshot"]["humidity"] == 80


def test_latest_fallback_with_humidity_only(client, sensor, room, operator, cache_stub):
    tele(client, sensor, humidity=75)
    cache_stub.clear()
    snap_ = client.get(f"/rooms/{room}/latest", headers=operator).json()["snapshot"]
    assert snap_["temperature"] is None and snap_["humidity"] == 75


def test_latest_with_no_data_and_customer_access(client, room, operator, core):
    r = client.get(f"/rooms/{room}/latest", headers=operator).json()
    assert r == {"snapshot": None, "deviceOnline": False}
    assert client.get(f"/rooms/{room}/latest", headers=make_token("CUSTOMER")).status_code == 403

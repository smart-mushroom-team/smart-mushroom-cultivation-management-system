"""Lịch sử ảnh camera: metadata trong PostgreSQL, file trên đĩa, tự xóa ảnh cũ, quyền xem theo ngày bắt đầu đơn thuê."""
import datetime as dt
import os
import time
import uuid

import pytest
from conftest import make_token
from sqlalchemy import text

NOW = dt.datetime.now(dt.timezone.utc)


def jpeg(tag: int) -> bytes:
    return b"\xff\xd8\xff\xe0" + bytes([tag]) * 50 + os.urandom(20)


@pytest.fixture(autouse=True)
def snap_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("SNAPSHOT_DIR", str(tmp_path / "snaps"))
    return tmp_path / "snaps"


@pytest.fixture()
def camera(client, operator, room):
    r = client.post("/devices", json={"name": "cam", "type": "CAMERA", "roomId": room}, headers=operator)
    return r.json()["apiKey"]


def upload(client, key, data, captured: dt.datetime | None = None):
    h = {"X-Device-Key": key, "Content-Type": "image/jpeg"}
    if captured is not None:
        h["X-Captured-At"] = captured.isoformat()
    return client.post("/iot/snapshot", content=data, headers=h)


def db_rows(db, sql="SELECT count(*) FROM camera_snapshots"):
    with db.connect() as c:
        return c.execute(text(sql)).scalar()


# ---------------------------------------------------------------- metadata
def test_metadata_row_matches_file(client, camera, room, db, snap_dir):
    data = jpeg(1)
    cap = NOW - dt.timedelta(minutes=2)
    r = upload(client, camera, data, cap)
    assert r.status_code == 202 and r.json()["capturedAt"] == cap.isoformat()
    with db.connect() as c:
        row = c.execute(text("SELECT * FROM camera_snapshots")).first()
    assert str(row.id) == r.json()["id"] and str(row.room_id) == room and row.size_bytes == len(data)
    assert row.image_path == f"{room}/{row.id}.jpg" and (snap_dir / row.image_path).read_bytes() == data
    assert abs((row.captured_at - cap).total_seconds()) < 1 and row.created_at > row.captured_at      # created_at = lúc nhận


def test_captured_at_defaults_to_now_and_is_validated(client, camera):
    assert upload(client, camera, jpeg(1)).status_code == 202
    for bad in (NOW + dt.timedelta(hours=1), NOW - dt.timedelta(days=30)):
        assert upload(client, camera, jpeg(2), bad).status_code == 422
    r = client.post("/iot/snapshot", content=jpeg(3), headers={"X-Device-Key": camera, "Content-Type": "image/jpeg",
                                                               "X-Captured-At": "yesterday"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_CAPTURED_AT"


def test_db_failure_leaves_no_orphan_file(client, camera, snap_dir, monkeypatch):
    from app import snapshots
    real = snapshots.engine

    class Boom:
        def begin(self):
            raise RuntimeError("DB down")
    monkeypatch.setattr(snapshots, "engine", lambda: Boom())
    with pytest.raises(RuntimeError):
        snapshots.store("00000000-0000-0000-0000-000000000000", str(uuid.uuid4()), jpeg(1), NOW)
    monkeypatch.setattr(snapshots, "engine", real)
    assert list(snap_dir.rglob("*.jpg")) == [] and list(snap_dir.rglob("*.tmp")) == []


# ---------------------------------------------------------------- đọc lịch sử
def test_latest_is_by_captured_time_not_arrival_order(client, camera, room, operator):
    upload(client, camera, jpeg(2), NOW - dt.timedelta(minutes=1))          # ảnh mới đến trước
    upload(client, camera, jpeg(1), NOW - dt.timedelta(minutes=30))         # ảnh cũ đến sau (mạng chậm)
    r = client.get(f"/rooms/{room}/camera/latest", headers=operator)
    assert r.content[4] == 2 and r.headers["x-snapshot-id"]


def test_history_listing_and_pagination(client, camera, room, operator):
    for i in range(5):
        upload(client, camera, jpeg(i), NOW - dt.timedelta(minutes=10 - i))
    r = client.get(f"/rooms/{room}/camera/snapshots?limit=2", headers=operator).json()
    assert len(r["items"]) == 2 and r["retentionHours"] == 24 and r["nextBefore"] == r["items"][-1]["capturedAt"]
    assert r["items"][0]["capturedAt"] > r["items"][1]["capturedAt"] and r["items"][0]["sizeBytes"] > 0
    page2 = client.get(f"/rooms/{room}/camera/snapshots", params={"limit": 2, "before": r["nextBefore"]}, headers=operator).json()
    assert len(page2["items"]) == 2 and page2["items"][0]["capturedAt"] < r["nextBefore"]
    last = client.get(f"/rooms/{room}/camera/snapshots", params={"limit": 2, "before": page2["nextBefore"]}, headers=operator).json()
    assert len(last["items"]) == 1 and last["nextBefore"] is None
    assert client.get(f"/rooms/{room}/camera/snapshots?limit=0", headers=operator).status_code == 422
    assert client.get(f"/rooms/{room}/camera/snapshots?limit=999", headers=operator).status_code == 422


def test_fetch_one_snapshot_by_id(client, camera, room, operator):
    sid = upload(client, camera, jpeg(7)).json()["id"]
    r = client.get(f"/rooms/{room}/camera/snapshots/{sid}", headers=operator)
    assert r.status_code == 200 and r.content[4] == 7 and r.headers["content-type"] == "image/jpeg"
    assert client.get(f"/rooms/{room}/camera/snapshots/{uuid.uuid4()}", headers=operator).status_code == 404
    assert client.get(f"/rooms/{room}/camera/snapshots/khong-phai-uuid", headers=operator).status_code == 404
    assert client.get(f"/rooms/{room}/camera/snapshots/{sid}").status_code == 401


def test_snapshot_of_another_room_not_reachable(client, camera, room, operator, core):
    sid = upload(client, camera, jpeg(1)).json()["id"]
    other = str(uuid.uuid4())
    core.rooms.add(other)
    assert client.get(f"/rooms/{other}/camera/snapshots/{sid}", headers=operator).status_code == 404   # id đúng nhưng sai phòng


def test_file_missing_on_disk_returns_404_not_500(client, camera, room, operator, snap_dir):
    upload(client, camera, jpeg(1))
    for f in snap_dir.rglob("*.jpg"):
        f.unlink()
    r = client.get(f"/rooms/{room}/camera/latest", headers=operator)
    assert r.status_code == 404 and r.json()["error"]["code"] == "NO_SNAPSHOT"


def test_path_in_db_cannot_escape_snapshot_dir(client, camera, room, operator, db, snap_dir):
    sid = upload(client, camera, jpeg(1)).json()["id"]
    secret = snap_dir.parent / "secret.jpg"
    secret.write_bytes(jpeg(9))
    with db.begin() as c:
        c.execute(text("UPDATE camera_snapshots SET image_path='../secret.jpg' WHERE id=:i"), {"i": sid})
    assert client.get(f"/rooms/{room}/camera/snapshots/{sid}", headers=operator).status_code == 404


# ---------------------------------------------------------------- quyền xem lịch sử (BR-08)
def test_customer_sees_only_photos_since_rental_start(client, camera, room, core):
    uid = str(uuid.uuid4())
    h = make_token("CUSTOMER", uid)
    core.access.add((room, uid))
    start = (NOW + dt.timedelta(hours=7)).date()                              # đơn bắt đầu hôm nay (giờ UTC+7)
    core.since[(room, uid)] = start.isoformat()
    day_start = dt.datetime.combine(start, dt.time.min, tzinfo=dt.timezone(dt.timedelta(hours=7)))
    before_id = upload(client, camera, jpeg(1), day_start - dt.timedelta(hours=1)).json()["id"]     # thời người thuê trước
    after_id = upload(client, camera, jpeg(2), day_start + dt.timedelta(minutes=1)).json()["id"]
    items = client.get(f"/rooms/{room}/camera/snapshots", headers=h).json()["items"]
    assert [i["id"] for i in items] == [after_id]
    assert client.get(f"/rooms/{room}/camera/snapshots/{after_id}", headers=h).status_code == 200
    assert client.get(f"/rooms/{room}/camera/snapshots/{before_id}", headers=h).status_code == 404   # không lộ sự tồn tại
    assert client.get(f"/rooms/{room}/camera/latest", headers=h).content[4] == 2


def test_customer_latest_ignores_photos_older_than_rental(client, camera, room, core):
    uid = str(uuid.uuid4())
    core.access.add((room, uid))
    start = (NOW + dt.timedelta(hours=7)).date()
    core.since[(room, uid)] = start.isoformat()
    day_start = dt.datetime.combine(start, dt.time.min, tzinfo=dt.timezone(dt.timedelta(hours=7)))
    upload(client, camera, jpeg(1), day_start - dt.timedelta(hours=2))
    r = client.get(f"/rooms/{room}/camera/latest", headers=make_token("CUSTOMER", uid))
    assert r.status_code == 404 and r.json()["error"]["code"] == "NO_SNAPSHOT"


def test_customer_without_rental_cannot_list_or_fetch(client, camera, room, core):
    sid = upload(client, camera, jpeg(1)).json()["id"]
    h = make_token("CUSTOMER")
    assert client.get(f"/rooms/{room}/camera/snapshots", headers=h).status_code == 403
    assert client.get(f"/rooms/{room}/camera/snapshots/{sid}", headers=h).status_code == 403
    core.down = True
    assert client.get(f"/rooms/{room}/camera/snapshots", headers=h).status_code == 503        # fail-closed


# ---------------------------------------------------------------- tự xóa ảnh cũ
def test_purge_removes_expired_rows_and_files_only(client, camera, room, snap_dir, db, monkeypatch):
    from app import snapshots
    old = upload(client, camera, jpeg(1), NOW - dt.timedelta(hours=30)).json()["id"]
    new = upload(client, camera, jpeg(2), NOW - dt.timedelta(hours=1)).json()["id"]
    r = snapshots.purge_old()
    assert r["deleted"] == 1 and r["files_removed"] == 1
    with db.connect() as c:
        ids = {str(i[0]) for i in c.execute(text("SELECT id FROM camera_snapshots"))}
    assert ids == {new} and [p.stem for p in snap_dir.rglob("*.jpg")] == [new] and old not in ids
    monkeypatch.setenv("SNAPSHOT_RETENTION_HOURS", "0.5")                     # chỉnh được bằng biến môi trường
    assert snapshots.purge_old()["deleted"] == 1 and db_rows(db) == 0
    assert not snap_dir.exists() or list(snap_dir.iterdir()) == []            # thư mục phòng rỗng cũng được dọn


def test_purge_removes_old_orphan_files_but_keeps_fresh_ones(client, camera, room, snap_dir, db):
    from app import snapshots
    upload(client, camera, jpeg(1))
    room_dir = snap_dir / room
    stale, fresh = room_dir / f"{uuid.uuid4()}.jpg", room_dir / f"{uuid.uuid4()}.jpg"
    stale.write_bytes(jpeg(5))
    fresh.write_bytes(jpeg(6))
    os.utime(stale, (time.time() - 7200, time.time() - 7200))                 # mồ côi cũ hơn 1 giờ
    r = snapshots.purge_old()
    assert r["orphans_removed"] == 1 and not stale.exists() and fresh.exists()   # file mới có thể đang được ghi dở, giữ lại
    assert db_rows(db) == 1


def test_purge_is_idempotent_and_survives_missing_file(client, camera, snap_dir, db):
    from app import snapshots
    upload(client, camera, jpeg(1), NOW - dt.timedelta(hours=48))
    for f in snap_dir.rglob("*.jpg"):
        f.unlink()                                                            # file đã mất trước khi job chạy
    assert snapshots.purge_old()["deleted"] == 1
    assert snapshots.purge_old() == {"deleted": 0, "files_removed": 0, "orphans_removed": 0}

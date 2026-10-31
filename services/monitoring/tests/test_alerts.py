"""Bước 2c: ngưỡng N lần liên tiếp (FR-38, FR-39) và cảnh báo thiết bị offline/online (FR-37, BR-11)."""
import datetime as dt
import threading
import uuid

import pytest
from conftest import make_token
from sqlalchemy import text

ALERTS = "alerts.events"


@pytest.fixture()
def sensor(client, operator, room):
    return client.post("/devices", json={"name": "Cảm biến A", "type": "SENSOR_NODE", "roomId": room}, headers=operator).json()


@pytest.fixture()
def camera(client, operator, room):
    return client.post("/devices", json={"name": "Camera A", "type": "CAMERA", "roomId": room}, headers=operator).json()


def tele(client, dev, **body):
    r = client.post("/iot/telemetry", json=body, headers={"X-Device-Key": dev["apiKey"]})
    assert r.status_code == 202, r.text
    return r


def set_thr(client, operator, room, **kw):
    body = {"tempMin": 20, "tempMax": 30, "humMin": 70, "humMax": 95, "consecutiveN": 3, **kw}
    r = client.put(f"/rooms/{room}/thresholds", json=body, headers=operator)
    assert r.status_code == 200, r.text


def thr_row(db, room):
    with db.connect() as c:
        return c.execute(text("SELECT * FROM room_thresholds WHERE room_id=:r"), {"r": room}).first()


def age(db, device_id, seconds):
    """Giả lập thiết bị đã im lặng `seconds` giây."""
    with db.begin() as c:
        c.execute(text("UPDATE devices SET last_seen_at = now() - make_interval(secs => :s) WHERE id=:i"), {"s": seconds, "i": device_id})


def send_jpeg(client, cam):
    hdr = {"X-Device-Key": cam["apiKey"], "Content-Type": "image/jpeg"}
    return client.post("/iot/snapshot", content=b"\xff\xd8\xff" + b"0" * 20, headers=hdr)


def offline_flag(db, device_id):
    with db.connect() as c:
        return c.execute(text("SELECT offline_alerted_at IS NOT NULL FROM devices WHERE id=:i"), {"i": device_id}).scalar()


# ================================================================ ngưỡng nhiệt độ/độ ẩm
def test_alert_only_after_n_consecutive_breaches(client, sensor, room, published):
    for t in (35, 36):
        tele(client, sensor, temperature=t, humidity=80)
    assert published.of(ALERTS) == []                                           # mới 2 lần: chưa báo
    tele(client, sensor, temperature=37, humidity=80)
    (ev,) = published.of(ALERTS)
    assert ev["type"] == "TEMP_OUT_OF_RANGE" and ev["roomId"] == room and ev["deviceId"] == sensor["id"]
    assert "37" in ev["content"] and "20-30" in ev["content"] and ev["dedupeKey"].startswith(f"TEMP:{room}:")


def test_one_alert_per_episode(client, sensor, published):
    for t in (35, 36, 37, 38, 39, 40):
        tele(client, sensor, temperature=t, humidity=80)
    assert len(published.of(ALERTS)) == 1                                       # vượt tiếp không báo lại


def test_normal_reading_resets_counter(client, sensor, published, db, room):
    for t in (35, 36, 25, 35, 36):
        tele(client, sensor, temperature=t, humidity=80)
    assert published.of(ALERTS) == [] and thr_row(db, room).temp_breach_cnt == 2
    tele(client, sensor, temperature=37, humidity=80)                           # đủ 3 lần liên tiếp sau lần bình thường
    assert len(published.of(ALERTS)) == 1


def test_new_episode_alerts_again_after_recovery(client, sensor, published, db, room):
    for t in (35, 35, 35, 25, 35, 35, 35):
        tele(client, sensor, temperature=t, humidity=80)
    assert len(published.of(ALERTS, "TEMP_OUT_OF_RANGE")) == 2
    assert thr_row(db, room).temp_alerting is True


@pytest.mark.parametrize("t", [20, 30, 25])
def test_boundaries_are_not_breaches(client, sensor, published, t):
    for _ in range(5):
        tele(client, sensor, temperature=t, humidity=70)
        tele(client, sensor, temperature=t, humidity=95)
    assert published.of(ALERTS) == []


@pytest.mark.parametrize("t", [19.9, 30.1, 10, 45])
def test_below_min_and_above_max_both_count(client, sensor, published, t):
    for _ in range(3):
        tele(client, sensor, temperature=t, humidity=80)
    assert len(published.of(ALERTS, "TEMP_OUT_OF_RANGE")) == 1


def test_humidity_and_temperature_are_independent(client, sensor, published):
    for _ in range(3):
        tele(client, sensor, temperature=25, humidity=50)                       # chỉ độ ẩm vượt
    assert [m["type"] for m in published.of(ALERTS)] == ["HUMIDITY_OUT_OF_RANGE"]
    for _ in range(3):
        tele(client, sensor, temperature=40, humidity=50)                       # độ ẩm vẫn vượt (đã báo), nhiệt độ mới vượt
    assert sorted(m["type"] for m in published.of(ALERTS)) == ["HUMIDITY_OUT_OF_RANGE", "TEMP_OUT_OF_RANGE"]


def test_both_breach_at_once_sends_two_events(client, sensor, published):
    for _ in range(3):
        tele(client, sensor, temperature=40, humidity=50)
    assert sorted(m["type"] for m in published.of(ALERTS)) == ["HUMIDITY_OUT_OF_RANGE", "TEMP_OUT_OF_RANGE"]
    keys = [m["dedupeKey"] for m in published.of(ALERTS)]
    assert len(set(keys)) == 2                                                  # khóa khác nhau: Core không gộp nhầm


def test_reading_missing_a_value_does_not_touch_its_counter(client, sensor, published, db, room):
    tele(client, sensor, temperature=35)
    tele(client, sensor, temperature=35)
    tele(client, sensor, humidity=80)                                           # lần đo chỉ có độ ẩm: bộ đếm nhiệt độ giữ nguyên
    assert thr_row(db, room).temp_breach_cnt == 2 and published.of(ALERTS) == []
    tele(client, sensor, temperature=35)
    assert len(published.of(ALERTS)) == 1


def test_custom_n_via_thresholds_api(client, sensor, operator, room, published):
    set_thr(client, operator, room, consecutiveN=1)
    tele(client, sensor, temperature=40, humidity=80)
    assert len(published.of(ALERTS)) == 1                                       # N=1: báo ngay lần đầu
    published.clear()
    set_thr(client, operator, room, consecutiveN=5)
    for _ in range(4):
        tele(client, sensor, temperature=40, humidity=80)
    assert published.of(ALERTS) == []
    tele(client, sensor, temperature=40, humidity=80)
    assert len(published.of(ALERTS)) == 1


def test_custom_range_applies(client, sensor, operator, room, published):
    set_thr(client, operator, room, tempMin=10, tempMax=50)
    for _ in range(4):
        tele(client, sensor, temperature=40, humidity=80)                       # 40 °C nằm trong khoảng mới
    assert published.of(ALERTS) == []


def test_changing_thresholds_resets_counters_and_alert_state(client, sensor, operator, room, published, db):
    for _ in range(3):
        tele(client, sensor, temperature=40, humidity=80)
    assert thr_row(db, room).temp_alerting is True
    set_thr(client, operator, room, tempMax=35)
    row = thr_row(db, room)
    assert (row.temp_breach_cnt, row.temp_alerting, row.hum_breach_cnt, row.hum_alerting) == (0, False, 0, False)
    for _ in range(3):
        tele(client, sensor, temperature=40, humidity=80)
    assert len(published.of(ALERTS)) == 2                                       # đợt mới theo ngưỡng mới được báo lại


@pytest.mark.parametrize("body", [
    {"tempMin": 30, "tempMax": 30}, {"tempMin": 31, "tempMax": 30}, {"humMin": 95, "humMax": 70},
    {"consecutiveN": 0}, {"consecutiveN": 101}, {"tempMin": -100}, {"tempMax": 200}, {"humMin": -1}, {"humMax": 101},
])
def test_invalid_thresholds_rejected_and_unchanged(client, operator, room, sensor, db, body):
    base = {"tempMin": 20, "tempMax": 30, "humMin": 70, "humMax": 95, "consecutiveN": 3}
    assert client.put(f"/rooms/{room}/thresholds", json={**base, **body}, headers=operator).status_code == 422
    row = thr_row(db, room)
    assert (row.temp_min, row.temp_max, row.consecutive_n) == (20, 30, 3)


def test_thresholds_permissions_and_ids(client, operator, customer, room):
    body = {"tempMin": 20, "tempMax": 30, "humMin": 70, "humMax": 95}
    assert client.put(f"/rooms/{room}/thresholds", json=body, headers=customer).status_code == 403
    assert client.put(f"/rooms/{room}/thresholds", json=body).status_code == 401
    assert client.put("/rooms/khong-phai-uuid/thresholds", json=body, headers=operator).status_code == 404
    assert client.put(f"/rooms/{uuid.uuid4()}/thresholds", json=body, headers=operator).status_code == 200   # tạo mới cho phòng chưa có


def test_room_without_threshold_row_never_alerts(client, sensor, published, db, room):
    with db.begin() as c:
        c.execute(text("DELETE FROM room_thresholds"))
    tele(client, sensor, temperature=99 if False else 85, humidity=100)
    assert published.of(ALERTS) == []


def test_alert_is_published_only_after_commit(client, sensor, published, db):
    seen = []

    def check(queue, message):
        if queue == ALERTS:                           # tại thời điểm gửi, số liệu gây cảnh báo phải đã nằm trong DB
            with db.connect() as c:
                seen.append(c.execute(text("SELECT count(*) FROM sensor_readings")).scalar())
    published.on_publish = check
    for _ in range(3):
        tele(client, sensor, temperature=40, humidity=80)
    assert seen == [3]


def test_rabbit_down_does_not_break_ingest_and_alert_is_retried(client, sensor, published, db, room):
    published.fail_queues.add(ALERTS)
    for _ in range(3):
        assert tele(client, sensor, temperature=40, humidity=80).status_code == 202       # vẫn nhận dữ liệu bình thường
    assert published.of(ALERTS) == [] and len(published.attempts) >= 3
    assert thr_row(db, room).temp_alerting is False                                       # gỡ cờ để còn phát lại
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM sensor_readings")).scalar() == 3
    published.fail_queues.clear()                                                         # RabbitMQ hoạt động lại
    tele(client, sensor, temperature=40, humidity=80)                                     # lần đo vượt kế tiếp phát lại
    assert len(published.of(ALERTS, "TEMP_OUT_OF_RANGE")) == 1


# ================================================================ thiết bị offline (jobs.device_status)
def run_job():
    from app import jobs
    return jobs.device_status()


def test_never_seen_device_is_not_offline(client, sensor, published):
    assert run_job() == 0 and published.of(ALERTS) == []


def test_recently_seen_device_not_offline(client, sensor, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    assert run_job() == 0 and published.of(ALERTS) == []


def test_offline_after_three_intervals_boundary(client, sensor, published, db):
    tele(client, sensor, temperature=25, humidity=80)                                      # chu kỳ mặc định 30 giây -> ngưỡng 90 giây
    age(db, sensor["id"], 85)
    assert run_job() == 0                                                                  # 85 < 90: còn online
    age(db, sensor["id"], 95)
    assert run_job() == 1
    (ev,) = published.of(ALERTS)
    assert ev["type"] == "DEVICE_OFFLINE" and ev["deviceId"] == sensor["id"] and "Cảm biến A" in ev["title"]
    assert "90" in ev["content"]


def test_offline_alert_sent_once_per_outage(client, sensor, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    age(db, sensor["id"], 500)
    assert [run_job(), run_job(), run_job()] == [1, 0, 0]
    assert len(published.of(ALERTS, "DEVICE_OFFLINE")) == 1 and offline_flag(db, sensor["id"]) is True


def test_interval_is_respected(client, operator, room, published, db):
    dev = client.post("/devices", json={"name": "Chậm", "type": "SENSOR_NODE", "roomId": room, "intervalSec": 300},
                      headers=operator).json()
    tele(client, dev, temperature=25, humidity=80)
    age(db, dev["id"], 600)                                                                # 600 < 3 x 300
    assert run_job() == 0
    age(db, dev["id"], 901)
    assert run_job() == 1


def test_camera_offline_too(client, camera, published, db):
    send_jpeg(client, camera)
    age(db, camera["id"], 1000)
    assert run_job() == 1
    ev = published.of(ALERTS)[0]
    assert ev["type"] == "DEVICE_OFFLINE" and "Camera A" in ev["title"]


def test_inactive_device_not_reported(client, sensor, operator, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    client.patch(f"/devices/{sensor['id']}", json={"status": "INACTIVE"}, headers=operator)
    age(db, sensor["id"], 1000)
    assert run_job() == 0


def test_two_devices_two_alerts(client, sensor, camera, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    send_jpeg(client, camera)
    age(db, sensor["id"], 1000)
    age(db, camera["id"], 1000)
    assert run_job() == 2
    assert {m["deviceId"] for m in published.of(ALERTS)} == {sensor["id"], camera["id"]}


# ---------------------------------------------------------------- online trở lại
def test_recovery_announced_once_then_new_outage_alerts_again(client, sensor, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    age(db, sensor["id"], 500)
    run_job()
    tele(client, sensor, temperature=25, humidity=80)                                      # có dữ liệu trở lại
    tele(client, sensor, temperature=25, humidity=80)
    assert [m["type"] for m in published.of(ALERTS)] == ["DEVICE_OFFLINE", "DEVICE_ONLINE"]   # chỉ báo online MỘT lần
    assert offline_flag(db, sensor["id"]) is False
    age(db, sensor["id"], 500)                                                             # sự cố thứ hai
    assert run_job() == 1
    offs = published.of(ALERTS, "DEVICE_OFFLINE")
    assert len(offs) == 2 and offs[0]["dedupeKey"] != offs[1]["dedupeKey"]                 # khóa khác: Core không nuốt nhầm


def test_camera_recovery_announced(client, camera, published, db):
    hdr = {"X-Device-Key": camera["apiKey"], "Content-Type": "image/jpeg"}
    jpg = b"\xff\xd8\xff" + b"0" * 20
    client.post("/iot/snapshot", content=jpg, headers=hdr)
    age(db, camera["id"], 1000)
    run_job()
    client.post("/iot/snapshot", content=jpg, headers=hdr)
    assert [m["type"] for m in published.of(ALERTS)] == ["DEVICE_OFFLINE", "DEVICE_ONLINE"]


def test_device_list_online_flag_matches(client, sensor, operator, room, db):
    tele(client, sensor, temperature=25, humidity=80)
    assert client.get(f"/devices?roomId={room}", headers=operator).json()[0]["online"] is True
    age(db, sensor["id"], 500)
    assert client.get(f"/devices?roomId={room}", headers=operator).json()[0]["online"] is False


def test_reactivated_device_not_alerted_from_stale_last_seen(client, sensor, operator, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    client.patch(f"/devices/{sensor['id']}", json={"status": "INACTIVE"}, headers=operator)
    age(db, sensor["id"], 100000)
    client.patch(f"/devices/{sensor['id']}", json={"status": "ACTIVE"}, headers=operator)
    assert run_job() == 0 and published.of(ALERTS) == []                                   # phải gửi dữ liệu trước mới bị tính offline
    tele(client, sensor, temperature=25, humidity=80)
    age(db, sensor["id"], 500)
    assert run_job() == 1


def test_publish_failure_is_retried_next_run(client, sensor, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    age(db, sensor["id"], 500)
    published.fail_queues.add(ALERTS)
    assert run_job() == 0 and offline_flag(db, sensor["id"]) is False                      # chưa đánh dấu đã báo
    published.fail_queues.clear()
    assert run_job() == 1 and run_job() == 0
    assert len(published.of(ALERTS, "DEVICE_OFFLINE")) == 1


def test_concurrent_job_runs_do_not_duplicate_alert(client, sensor, published, db):
    tele(client, sensor, temperature=25, humidity=80)
    age(db, sensor["id"], 500)
    gate = threading.Barrier(2)
    results = []
    import time
    original = published.on_publish
    published.on_publish = lambda q, m: time.sleep(0.3)                                    # giữ khóa dòng đủ lâu để lượt kia chạm vào

    def worker():
        gate.wait(timeout=5)
        results.append(run_job())
    threads = [threading.Thread(target=worker) for _ in range(2)]
    [t.start() for t in threads]
    [t.join(timeout=20) for t in threads]
    published.on_publish = original
    assert sorted(results) == [0, 1] and len(published.of(ALERTS, "DEVICE_OFFLINE")) == 1


def test_data_during_job_keeps_state_consistent(client, sensor, published, db):
    """Thiết bị gửi dữ liệu ngay sau khi bị báo offline: cuối cùng phải là online, không kẹt cờ offline."""
    tele(client, sensor, temperature=25, humidity=80)
    age(db, sensor["id"], 500)
    run_job()
    tele(client, sensor, temperature=25, humidity=80)
    assert offline_flag(db, sensor["id"]) is False and run_job() == 0


def test_offline_event_content_for_core_consumer(client, sensor, published, db):
    """Core lưu thông báo từ các trường type/title/content/dedupeKey/roomId/deviceId - phải đủ và đúng kiểu."""
    tele(client, sensor, temperature=25, humidity=80)
    age(db, sensor["id"], 500)
    run_job()
    ev = published.of(ALERTS)[0]
    for k in ("type", "title", "content", "dedupeKey", "roomId", "deviceId"):
        assert isinstance(ev[k], str) and ev[k]
    assert "_kind" not in ev


def test_threshold_events_have_no_internal_fields(client, sensor, published):
    for _ in range(3):
        tele(client, sensor, temperature=40, humidity=80)
    assert "_kind" not in published.of(ALERTS)[0]


def test_core_consumer_accepts_all_alert_types():
    """Mọi sự kiện Monitoring phát ra phải qua được handle() của Core (cùng các khóa bắt buộc)."""
    required = {"type", "title", "dedupeKey"}
    from app import presence, thresholds
    d = type("D", (), {"id": uuid.uuid4(), "name": "x", "type": "SENSOR_NODE", "room_id": uuid.uuid4(), "interval_sec": 30,
                       "last_seen_at": dt.datetime.now(dt.timezone.utc)})()
    assert required <= presence.offline_event(d).keys() and required <= presence.online_event(d).keys()
    assert thresholds.LABEL.keys() == {"TEMP", "HUMIDITY"}
    assert make_token("CUSTOMER")

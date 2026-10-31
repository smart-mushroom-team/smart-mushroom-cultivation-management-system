"""Test TOÀN LUỒNG trên stack thật (Gateway + Identity + Core + Monitoring + PostgreSQL + RabbitMQ + Redis).

Cách chạy (sau `make up`; cần SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD trong .env):
    make e2e                       # tương đương: E2E=1 python -m pytest tests/e2e/test_full_flow.py -v -s
Biến tùy chọn: E2E_BASE_URL (mặc định http://localhost:8000), E2E_FAST=1 (bỏ qua phần chờ thiết bị offline ~40 giây).
Phần hết hạn đơn chỉ chạy khi DEMO_MODE=true.

Kịch bản: Customer thuê khay -> Operator tạo thiết bị mô phỏng ở phòng đó -> số liệu và ảnh về Customer -> vượt ngưỡng thì
RabbitMQ đưa cảnh báo sang Core -> thông báo tới Operator -> thiết bị im lặng thì báo offline, gửi lại thì báo online ->
phân quyền giữa các khách -> cập nhật tiến độ/thu hoạch -> hết hạn đơn thì khách mất quyền xem phòng.
Dữ liệu tạo ra có tiền tố 'E2E' trong tên/email; test không xóa dữ liệu."""
import datetime as dt
import importlib
import os
import pathlib
import sys
import time
import uuid

import pytest
import requests

pytestmark = pytest.mark.skipif(os.getenv("E2E") != "1", reason="cần stack docker compose đang chạy; bật bằng E2E=1")

BASE = os.getenv("E2E_BASE_URL", "http://localhost:8000").rstrip("/")
FAST = os.getenv("E2E_FAST") == "1"
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "devices" / "simulator"))
RUN = uuid.uuid4().hex[:8]
S = {}      # trạng thái dùng chung giữa các bước


# ---------------------------------------------------------------- tiện ích
def api(method, path, token=None, expect=None, **kw):
    headers = kw.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, f"{BASE}{path}", headers=headers, timeout=20, **kw)
    if expect is not None:
        codes = expect if isinstance(expect, (list, tuple, set)) else [expect]
        assert r.status_code in codes, f"{method} {path} -> {r.status_code}: {r.text[:300]}"
    return r


def login(email, password):
    return api("post", "/api/identity/auth/login", json={"email": email, "password": password}, expect=200).json()["accessToken"]


def wait_for(fn, timeout, what, every=1.5):
    """Chờ tới khi fn() trả giá trị truthy (RabbitMQ và job nền cần vài giây)."""
    end, last = time.time() + timeout, None
    while time.time() < end:
        last = fn()
        if last:
            return last
        time.sleep(every)
    pytest.fail(f"Quá {timeout}s mà chưa thấy: {what}")


def notes(token, type_, room=None):
    out = api("get", "/api/core/notifications", token, expect=200).json()
    return [n for n in out if n["type"] == type_ and (room is None or n["data"].get("roomId") == room)]


def need(*keys):
    missing = [k for k in keys if k not in S]
    if missing:
        pytest.skip(f"bỏ qua vì bước trước chưa xong: {missing}")


def run_sim(devices, *argv):
    sim = importlib.import_module("simulate_devices")
    opts = sim.parse_args(["--jitter", "0", "--sync", *argv])
    opts.interval = 0.2                                      # gửi nhanh cho test; chu kỳ khai báo của thiết bị vẫn là 5 giây
    for d in devices:
        d.interval = 0.2
        if d.kind == "sensor":
            d.profile = opts.profile                         # thiết bị đã tạo từ bước provisioning: áp profile của lần chạy này (--anomaly = hot)
    return sim.Simulator(requests.Session(), BASE, devices, opts, out=lambda *_: None).run()


@pytest.fixture(scope="module", autouse=True)
def stack_is_up():
    try:
        assert requests.get(f"{BASE}/health", timeout=5).status_code == 200
    except Exception:                                        # noqa: BLE001
        pytest.skip(f"Gateway chưa chạy ở {BASE}. Chạy `make up` trước.")
    for k in ("SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"):
        if not os.getenv(k):
            pytest.skip(f"thiếu biến môi trường {k} (đặt trong .env rồi chạy `make e2e`)")


# ================================================================ 1. chuẩn bị: khách thuê khay
def test_01_customer_rents_a_tray():
    S["admin"] = login(os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"])
    room = api("post", "/api/core/rooms", S["admin"], 201, json={"name": f"E2E phòng {RUN}"}).json()["id"]
    for i in range(3):
        api("post", "/api/core/trays", S["admin"], 201, json={"trayCode": f"E2E-{RUN}-{i}", "roomId": room, "row": 1, "shelf": 1, "slot": i + 1})
    pkg = api("post", "/api/core/packages", S["admin"], 201, json={"name": f"E2E {RUN}", "durationDays": 30, "pricePerTray": 1000}).json()["id"]

    for who in ("a", "b"):
        email, pw = f"e2e-{RUN}-{who}@example.com", "E2e-matkhau-123"
        api("post", "/api/identity/auth/register", expect=201, json={"name": f"Khách E2E {who.upper()}", "email": email, "password": pw})
        S[f"cust_{who}"] = login(email, pw)
    rental = api("post", "/api/core/rentals", S["cust_a"], 201, json={"packageId": pkg, "trayCount": 1}).json()
    assert rental["status"] == "ACTIVE" and len(rental["trayIds"]) == 1
    mine = api("get", "/api/core/my-trays", S["cust_a"], 200).json()
    assert len(mine) == 1
    S.update(room=mine[0]["room_id"], cycle=mine[0]["id"], rental=rental)        # phòng thực tế mà khay được xếp vào (có thể không phải phòng vừa tạo)


# ================================================================ 2. thiết bị mô phỏng ở phòng đó
def test_02_operator_provisions_simulated_devices():
    need("room")
    sim = importlib.import_module("simulate_devices")
    opts = sim.parse_args(["--email", "x", "--room", S["room"], "--interval", "5", "--with-camera"])
    lines = []
    devices = sim.provision(requests.Session(), BASE, os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"],
                            [S["room"]], True, opts, out=lines.append)
    if not devices:
        pytest.skip("phòng đã có thiết bị THẬT, test không đụng vào: " + "; ".join(lines))
    S["sensor"] = next(d for d in devices if d.kind == "sensor")
    S["camera"] = next((d for d in devices if d.kind == "camera"), None)
    api("put", f"/api/monitoring/rooms/{S['room']}/thresholds", S["admin"], 200,
        json={"tempMin": 20, "tempMax": 30, "humMin": 70, "humMax": 95, "consecutiveN": 3})


# ================================================================ 3. số liệu và ảnh về tới khách
def test_03_readings_reach_customer_through_gateway():
    need("sensor")
    res = run_sim([S["sensor"]], "--sensor", "x", "--count", "3")
    assert res["ok"] == 3 and res["errors"] == 0
    latest = api("get", f"/api/monitoring/rooms/{S['room']}/latest", S["cust_a"], 200).json()
    assert latest["deviceOnline"] is True and 20 <= latest["snapshot"]["temperature"] <= 30


def test_04_camera_images_through_gateway():
    need("camera")
    res = run_sim([S["camera"]], "--camera", "x", "--count", "2")
    assert res["ok"] == 2 and res["errors"] == 0                 # multipart/raw JPEG đi qua Gateway
    r = api("get", f"/api/monitoring/rooms/{S['room']}/camera/latest", S["cust_a"], 200)
    assert r.headers["content-type"] == "image/jpeg" and r.content.startswith(b"\xff\xd8\xff") and r.headers["x-captured-at"]
    hist = api("get", f"/api/monitoring/rooms/{S['room']}/camera/snapshots", S["cust_a"], 200).json()["items"]
    assert len(hist) >= 2
    one = api("get", f"/api/monitoring/rooms/{S['room']}/camera/snapshots/{hist[0]['id']}", S["cust_a"], 200)
    assert one.content.startswith(b"\xff\xd8\xff")


def test_05_other_customer_cannot_see_the_room():
    need("room")
    for path in ("latest", "camera/latest", "camera/snapshots", "chart"):
        r = api("get", f"/api/monitoring/rooms/{S['room']}/{path}", S["cust_b"])
        assert r.status_code == 403 and r.json()["error"]["code"] == "NO_ACTIVE_RENTAL", path
    assert api("get", f"/api/monitoring/rooms/{S['room']}/latest").status_code == 401        # không token


def test_06_gateway_blocks_internal_and_requires_auth():
    assert api("get", f"/api/core/internal/access/rooms/{S.get('room', uuid.uuid4())}", S["admin"]).status_code == 404
    assert api("get", "/api/core/metrics", S["admin"]).status_code == 404
    assert api("post", "/iot/telemetry", json={"temperature": 25}, headers={"X-Device-Key": "mk_sai"}).status_code == 401


# ================================================================ 4. cảnh báo qua RabbitMQ
def temp_alerts():
    return notes(S["admin"], "TEMP_OUT_OF_RANGE", S["room"])


def test_07_threshold_alert_travels_monitoring_to_rabbitmq_to_core():
    need("sensor")
    before = len(temp_alerts())                                                              # phòng có thể còn thông báo của lần chạy trước
    res = run_sim([S["sensor"]], "--sensor", "x", "--anomaly", "--count", "10")
    assert res["errors"] == 0
    found = wait_for(lambda: len(temp_alerts()) > before and temp_alerts(), 30, "cảnh báo nhiệt độ ở Core (qua RabbitMQ)")
    assert found[0]["data"]["deviceId"]
    time.sleep(2)
    assert len(temp_alerts()) == before + 1                                                  # cả đợt vượt ngưỡng chỉ một cảnh báo
    assert notes(S["cust_a"], "TEMP_OUT_OF_RANGE") == []                                     # khách không nhận cảnh báo hạ tầng
    S["alerts_after_07"] = before + 1


def test_08_back_to_normal_then_new_episode_alerts_again():
    need("sensor", "alerts_after_07")
    run_sim([S["sensor"]], "--sensor", "x", "--count", "10")                                 # về bình thường: kết thúc đợt
    run_sim([S["sensor"]], "--sensor", "x", "--anomaly", "--count", "12")
    wait_for(lambda: len(temp_alerts()) >= S["alerts_after_07"] + 1, 30, "cảnh báo của đợt thứ hai")


def sensor_notes(type_):
    """Chỉ cảm biến: camera chu kỳ 30 giây nên chỉ báo offline sau 90 giây, quá dài cho test."""
    return [n for n in notes(S["admin"], type_, S["room"]) if n["title"].startswith("Cảm biến")]


def test_09_device_offline_and_back_online():
    need("sensor")
    if FAST:
        pytest.skip("E2E_FAST=1")
    off0, on0 = len(sensor_notes("DEVICE_OFFLINE")), len(sensor_notes("DEVICE_ONLINE"))      # phòng có thể còn thông báo của lần chạy trước
    # Thiết bị khai chu kỳ 5 giây -> offline sau 15 giây im lặng, job quét mỗi 10 giây
    run_sim([S["sensor"]], "--sensor", "x", "--count", "1")
    wait_for(lambda: len(sensor_notes("DEVICE_OFFLINE")) > off0, 60, "cảnh báo thiết bị offline", every=3)
    time.sleep(12)                                                                          # qua thêm một vòng quét: vẫn chỉ một cảnh báo cho đợt offline
    assert len(sensor_notes("DEVICE_OFFLINE")) == off0 + 1
    run_sim([S["sensor"]], "--sensor", "x", "--count", "1")
    wait_for(lambda: len(sensor_notes("DEVICE_ONLINE")) > on0, 30, "thông báo online trở lại")


# ================================================================ 5. đợt nuôi
def test_10_cultivation_progress_notifies_customer_and_harvest():
    need("cycle")
    for stage in ("INCUBATING", "FRUITING"):
        api("patch", f"/api/core/cycles/{S['cycle']}", S["admin"], 200, json={"stage": stage})
    api("patch", f"/api/core/cycles/{S['cycle']}", S["admin"], 409, json={"stage": "SEEDING"})      # không lùi
    assert len(notes(S["cust_a"], "CYCLE_STAGE")) == 2
    h = api("post", f"/api/core/cycles/{S['cycle']}/harvest", S["admin"], 200, json={"weightKg": 1.5}).json()
    assert h["status"] == "HARVESTED"
    assert notes(S["cust_a"], "CYCLE_HARVESTED")
    detail = api("get", f"/api/core/cycles/{S['cycle']}", S["cust_a"], 200).json()
    assert [(x["from_stage"], x["to_stage"]) for x in detail["logs"]][:2] == [("SEEDING", "INCUBATING"), ("INCUBATING", "FRUITING")]
    assert api("get", f"/api/core/cycles/{S['cycle']}", S["cust_b"]).status_code == 404            # khách khác không thấy


# ================================================================ 6. hết hạn đơn (cần DEMO_MODE=true)
def test_11_expiry_removes_customer_access():
    need("room", "rental")
    probe = api("put", "/api/core/demo/date", S["admin"], json={"date": None})
    if probe.status_code == 403:
        pytest.skip("DEMO_MODE=false: bỏ qua phần hết hạn đơn")
    try:
        end = dt.date.fromisoformat(S["rental"]["endDate"])
        api("put", "/api/core/demo/date", S["admin"], 200, json={"date": (end + dt.timedelta(days=1)).isoformat()})
        stats = api("post", "/api/core/demo/run-expiry", S["admin"], 200).json()
        assert stats["errors"] == 0
        mine = api("get", "/api/core/rentals/mine", S["cust_a"], 200).json()
        assert mine[0]["status"] == "COMPLETED"                  # đã thu hoạch ở bước 10 nên hoàn tất ngay khi hết hạn
        r = api("get", f"/api/monitoring/rooms/{S['room']}/camera/latest", S["cust_a"])
        assert r.status_code == 403                              # mất quyền xem phòng NGAY, không có cache
        assert api("get", f"/api/monitoring/rooms/{S['room']}/latest", S["cust_a"]).status_code == 403
        assert notes(S["cust_a"], "RENTAL_COMPLETED")
        assert api("get", f"/api/monitoring/rooms/{S['room']}/latest", S["admin"], 200)           # Operator/Admin vẫn xem được
    finally:
        api("put", "/api/core/demo/date", S["admin"], json={"date": None})

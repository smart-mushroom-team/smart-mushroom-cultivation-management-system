"""Bước 2d: simulator (devices/simulator/simulate_devices.py) chạy thẳng vào Monitoring thật qua adapter HTTP.
Simulator dùng cùng API với thiết bị thật nên đây cũng là test hợp đồng cho firmware/camera agent."""
import importlib
import pathlib
import sys
import types

import pytest
import requests
from conftest import make_token
from sqlalchemy import text

SIM_DIR = pathlib.Path(__file__).resolve().parents[3] / "devices" / "simulator"
if not (SIM_DIR / "simulate_devices.py").exists():          # trong container monitoring không có thư mục devices/
    pytest.skip("không có devices/simulator", allow_module_level=True)
sys.path.insert(0, str(SIM_DIR))
sim = importlib.import_module("simulate_devices")

ALERTS = "alerts.events"
ROOM_NAMES = ["Phòng A", "Phòng B", "Phòng C"]


class Resp:
    def __init__(self, r):
        self._r = r
        self.status_code, self.text = r.status_code, r.text

    def json(self):
        return self._r.json()


class Router:
    """Giả lập Gateway: /iot/* và /api/monitoring/* chuyển vào Monitoring thật; Identity và Core là bản giả tối thiểu."""
    def __init__(self, mon, rooms, token, password="mat-khau"):
        self.mon, self.rooms, self.token, self.password, self.calls = mon, rooms, token, password, []

    def _route(self, method, url, **kw):
        path = url.split("://", 1)[-1].split("/", 1)[1]
        path = "/" + path
        self.calls.append((method, path))
        if path == "/api/identity/auth/login":
            ok = kw["json"]["password"] == self.password
            return types.SimpleNamespace(status_code=200 if ok else 401, text="",
                                         json=lambda: {"accessToken": self.token["Authorization"][7:]})
        if path == "/api/core/rooms":
            data = [{"id": r, "name": ROOM_NAMES[i], "status": "ACTIVE"} for i, r in enumerate(self.rooms)]
            return types.SimpleNamespace(status_code=200, text="", json=lambda: data)
        if path.startswith("/api/monitoring/"):
            path = path[len("/api/monitoring"):]
        if "data" in kw:
            kw["content"] = kw.pop("data")
        kw.pop("timeout", None)
        return Resp(getattr(self.mon, method)(path, **kw))

    def get(self, url, **kw):
        return self._route("get", url, **kw)

    def post(self, url, **kw):
        return self._route("post", url, **kw)


class FakeClock:
    def __init__(self):
        self.t = 0.0
        self.sleeps = []

    def now(self):
        return self.t

    def sleep(self, s):
        self.sleeps.append(s)
        self.t += s


@pytest.fixture()
def rooms(core):
    ids = [__import__("uuid").uuid4().__str__() for _ in range(3)]
    core.rooms.update(ids)
    return ids


@pytest.fixture()
def router(client, rooms, operator):
    return Router(client, rooms, operator)


@pytest.fixture(autouse=True)
def snap_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("SNAPSHOT_DIR", str(tmp_path / "snaps"))
    return tmp_path / "snaps"


def make_key(client, operator, room, type_="SENSOR_NODE", simulated=False, interval=30):
    r = client.post("/devices", json={"name": f"d-{type_[:3]}", "type": type_, "roomId": room, "isSimulated": simulated,
                                      "intervalSec": interval}, headers=operator)
    assert r.status_code == 201, r.text
    return r.json()["apiKey"]


def run_sim(http, devices, *argv, seed=1):
    opts = sim.parse_args(["--jitter", "0", "--seed", str(seed), *argv])
    clock, lines = FakeClock(), []
    s = sim.Simulator(http, "http://sim", devices, opts, clock=clock.now, sleep=clock.sleep, out=lines.append)
    return s.run(), s, clock, lines


def sensor(key, profile="normal", interval=5.0):
    return sim.Device(kind="sensor", key=key, name="s", profile=profile, interval=interval)


def count(db, sql):
    with db.connect() as c:
        return c.execute(text(sql)).scalar()


# ================================================================ cảm biến
def test_normal_sensor_sends_valid_readings_and_never_alerts(router, client, operator, rooms, db, published):
    key = make_key(client, operator, rooms[0])
    res, _, clock, _ = run_sim(router, [sensor(key)], "--sensor", "x", "--count", "20")
    assert res == {"ok": 20, "rejected": 0, "skipped": 0, "errors": 0}
    assert count(db, "SELECT count(*) FROM sensor_readings") == 20
    assert count(db, "SELECT count(*) FROM sensor_readings WHERE temperature BETWEEN 20 AND 30 AND humidity BETWEEN 70 AND 95") == 20
    assert published.of(ALERTS) == []
    assert clock.t >= 19 * 5 - 1e-6                                    # tôn trọng chu kỳ 5 giây, không bắn dồn


@pytest.mark.parametrize("profile,expected", [("hot", "TEMP_OUT_OF_RANGE"), ("cold", "TEMP_OUT_OF_RANGE"),
                                              ("dry", "HUMIDITY_OUT_OF_RANGE"), ("humid", "HUMIDITY_OUT_OF_RANGE")])
def test_anomaly_profiles_trigger_the_matching_alert_once(router, client, operator, rooms, published, profile, expected):
    key = make_key(client, operator, rooms[0])
    run_sim(router, [sensor(key, profile)], "--sensor", "x", "--count", "12")
    assert [m["type"] for m in published.of(ALERTS)] == [expected]     # đúng một cảnh báo cho cả đợt


def test_anomaly_flag_is_shortcut_for_hot(router, client, operator, rooms, published):
    key = make_key(client, operator, rooms[0])
    opts = sim.parse_args(["--sensor", key, "--anomaly"])
    assert opts.profile == "hot" and sim.devices_from_keys(opts)[0].profile == "hot"
    run_sim(router, sim.devices_from_keys(opts), "--sensor", key, "--anomaly", "--count", "12")
    assert len(published.of(ALERTS, "TEMP_OUT_OF_RANGE")) == 1


def test_count_is_per_run_when_devices_are_reused(router, client, operator, rooms, db):
    """Gọi run() nhiều lần trên cùng thiết bị (như test toàn luồng): mỗi lượt gửi đủ --count, không cộng dồn lượt trước."""
    key = make_key(client, operator, rooms[0])
    dev = sensor(key)
    for _ in range(3):
        run_sim(router, [dev], "--sensor", "x", "--count", "4")
    assert count(db, "SELECT count(*) FROM sensor_readings") == 12 and dev.stats["ok"] == 12


def test_profile_per_key_overrides_default(client, operator, rooms):
    opts = sim.parse_args(["--sensor", "K1", "--sensor", "K2:dry", "--profile", "hot"])
    assert [d.profile for d in sim.devices_from_keys(opts)] == ["hot", "dry"]


def test_flaky_skips_some_sends(router, client, operator, rooms, db):
    key = make_key(client, operator, rooms[0])
    res, *_ = run_sim(router, [sensor(key, "flaky")], "--sensor", "x", "--count", "60")
    assert res["skipped"] > 0 and res["ok"] > 0 and res["ok"] + res["skipped"] == 60 and res["errors"] == 0
    assert count(db, "SELECT count(*) FROM sensor_readings") == res["ok"]


def test_dropout_goes_silent_then_resumes(router, client, operator, rooms):
    key = make_key(client, operator, rooms[0])
    dev = sensor(key, "dropout")
    res, _, clock, lines = run_sim(router, [dev], "--sensor", "x", "--dropout-on", "10", "--dropout-off", "20", "--duration", "70")
    sent_at = [i for i, line in enumerate(lines) if "202" in line]
    assert res["skipped"] > 0 and res["ok"] > 0
    assert res["ok"] == 6 and res["skipped"] == 9      # 15 lần (t=0..70, mỗi 5s): chỉ t=0,5 / 30,35 / 60,65 nằm trong 10s đầu của chu kỳ 30s
    assert sent_at                                                      # có gửi lại sau khi im lặng


def test_bad_rate_sends_invalid_data_that_server_rejects(router, client, operator, rooms, db):
    key = make_key(client, operator, rooms[0])
    res, *_ = run_sim(router, [sensor(key)], "--sensor", "x", "--count", "10", "--bad-rate", "1")
    assert res == {"ok": 0, "rejected": 10, "skipped": 0, "errors": 0}   # bị từ chối ĐÚNG như mong đợi, không tính là lỗi
    assert count(db, "SELECT count(*) FROM sensor_readings") == 0


def test_mixed_good_and_bad(router, client, operator, rooms):
    key = make_key(client, operator, rooms[0])
    res, *_ = run_sim(router, [sensor(key)], "--sensor", "x", "--count", "40", "--bad-rate", "0.5")
    assert res["rejected"] > 5 and res["ok"] > 5 and res["errors"] == 0


# ================================================================ camera
def test_camera_uploads_valid_jpegs_to_history(router, client, operator, rooms, db, snap_dir):
    key = make_key(client, operator, rooms[0], "CAMERA")
    cam = sim.Device(kind="camera", key=key, name="c", interval=30)
    res, *_ = run_sim(router, [cam], "--camera", "x", "--count", "3")
    assert res["ok"] == 3 and count(db, "SELECT count(*) FROM camera_snapshots") == 3
    files = list(snap_dir.rglob("*.jpg"))
    assert len(files) == 3 and all(f.read_bytes().startswith(b"\xff\xd8\xff") for f in files)
    assert len({f.read_bytes() for f in files}) == 3                   # mỗi ảnh khác nhau (có dấu thời gian)
    r = client.get(f"/rooms/{rooms[0]}/camera/latest", headers=operator)
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"


def test_camera_works_without_pillow(router, client, operator, rooms, db, monkeypatch):
    monkeypatch.setitem(sys.modules, "PIL", None)                       # import PIL -> ImportError
    key = make_key(client, operator, rooms[0], "CAMERA")
    res, *_ = run_sim(router, [sim.Device(kind="camera", key=key, name="c", interval=30)], "--camera", "x", "--count", "1")
    assert res["ok"] == 1 and count(db, "SELECT count(*) FROM camera_snapshots") == 1


def test_sensor_and_camera_together(router, client, operator, rooms, db):
    s, c = make_key(client, operator, rooms[0]), make_key(client, operator, rooms[0], "CAMERA")
    devs = [sensor(s), sim.Device(kind="camera", key=c, name="c", interval=5)]
    res, *_ = run_sim(router, devs, "--sensor", "x", "--count", "4")
    assert res["ok"] == 8 and count(db, "SELECT count(*) FROM sensor_readings") == 4
    assert count(db, "SELECT count(*) FROM camera_snapshots") == 4


# ================================================================ lỗi và biên
def test_wrong_key_stops_that_device_only(router, client, operator, rooms, db):
    good = make_key(client, operator, rooms[0])
    bad = sim.Device(kind="sensor", key="khoa-sai", name="bad", interval=5)
    res, s, _, lines = run_sim(router, [sensor(good), bad], "--sensor", "x", "--count", "5")
    assert bad.dead and bad.stats["errors"] == 1 and res["ok"] == 5     # thiết bị sai khóa dừng, thiết bị đúng vẫn chạy
    assert any("401" in line for line in lines)


def test_all_devices_dead_exits_instead_of_spinning(router):
    res, *_ = run_sim(router, [sim.Device(kind="sensor", key="sai", interval=5)], "--sensor", "x")
    assert res["errors"] == 1                                            # không có --count/--duration mà vẫn tự thoát


def test_network_errors_are_counted_and_do_not_crash(client):
    class Down:
        def post(self, *a, **k):
            raise requests.ConnectionError("down")
    res, *_ = run_sim(Down(), [sensor("k")], "--sensor", "x", "--count", "3")
    assert res["errors"] == 3 and res["ok"] == 0


def test_server_5xx_counts_as_error(client):
    class Broken:
        def post(self, *a, **k):
            return types.SimpleNamespace(status_code=503, text="x")
    res, *_ = run_sim(Broken(), [sensor("k")], "--sensor", "x", "--count", "2")
    assert res["errors"] == 2


def test_duration_limits_run(router, client, operator, rooms):
    key = make_key(client, operator, rooms[0])
    res, _, clock, _ = run_sim(router, [sensor(key)], "--sensor", "x", "--duration", "12")
    assert res["ok"] == 3                                                # t=0, 5, 10


def test_devices_are_staggered_unless_sync(router, client, operator, rooms):
    k1, k2 = make_key(client, operator, rooms[0]), make_key(client, operator, rooms[1])
    d1, d2 = sensor(k1), sensor(k2)
    run_sim(router, [d1, d2], "--sensor", "x", "--count", "1")
    assert round(d2.started_at - d1.started_at, 3) == 0.2
    e1, e2 = sensor(k1), sensor(k2)
    run_sim(router, [e1, e2], "--sensor", "x", "--count", "1", "--sync")
    assert e1.started_at == e2.started_at or e2.started_at - e1.started_at < 0.01


# ================================================================ tự tạo thiết bị (nhiều phòng)
def provision(router, rooms_arg, *extra, password="mat-khau"):
    opts = sim.parse_args(["--email", "op@x.vn", *extra, *(f"--room={r}" for r in rooms_arg)] if rooms_arg else ["--email", "op@x.vn",
                          "--all-rooms", *extra])
    return sim.provision(router, "http://sim", "op@x.vn", password, rooms_arg or None, opts.with_camera, opts, out=lambda *_: None), opts


def test_provision_all_rooms_creates_working_simulated_devices(router, client, operator, rooms, db, published):
    devs, opts = provision(router, None, "--with-camera")
    assert len(devs) == 6 and {d.room for d in devs} == set(rooms)
    assert sorted({d.kind for d in devs}) == ["camera", "sensor"]
    listing = client.get("/devices", headers=operator).json()
    assert len(listing) == 6 and all(d["isSimulated"] for d in listing)
    res, *_ = run_sim(router, devs, "--email", "x", "--all-rooms", "--count", "2")
    assert res["errors"] == 0 and res["ok"] == 12
    assert count(db, "SELECT count(DISTINCT room_id) FROM sensor_readings") == 3        # số liệu về đủ cả 3 phòng
    assert count(db, "SELECT count(DISTINCT room_id) FROM camera_snapshots") == 3


def test_provision_selected_room_and_profile(router, client, operator, rooms, published):
    devs, _ = provision(router, [rooms[1]], "--profile", "hot")
    assert [(d.room, d.profile) for d in devs] == [(rooms[1], "hot")]
    run_sim(router, devs, "--email", "x", "--room", rooms[1], "--profile", "hot", "--count", "12")
    assert published.of(ALERTS)[0]["roomId"] == rooms[1]                                # cảnh báo đúng phòng


def test_provision_again_rotates_simulated_keys(router, client, operator, rooms):
    first, _ = provision(router, [rooms[0]])
    again, _ = provision(router, [rooms[0]])
    assert first[0].key != again[0].key and len(client.get("/devices", headers=operator).json()) == 1   # không tạo thêm thiết bị
    assert client.post("/iot/telemetry", json={"temperature": 25}, headers={"X-Device-Key": first[0].key}).status_code == 401
    assert client.post("/iot/telemetry", json={"temperature": 25}, headers={"X-Device-Key": again[0].key}).status_code == 202


def test_provision_never_touches_real_devices(router, client, operator, rooms):
    real_key = make_key(client, operator, rooms[0], simulated=False)                     # thiết bị THẬT ở phòng A
    lines = []
    opts = sim.parse_args(["--email", "x", "--all-rooms"])
    devs = sim.provision(router, "http://sim", "x", "mat-khau", None, False, opts, out=lines.append)
    assert {d.room for d in devs} == {rooms[1], rooms[2]}                                # phòng A bị bỏ qua
    assert any("THẬT" in line for line in lines)
    assert client.post("/iot/telemetry", json={"temperature": 25}, headers={"X-Device-Key": real_key}).status_code == 202   # khóa thật còn nguyên


def test_provision_errors(router, rooms):
    opts = sim.parse_args(["--email", "x", "--all-rooms"])
    with pytest.raises(sim.ProvisionError, match="Đăng nhập thất bại"):
        sim.provision(router, "http://sim", "x", "sai-mat-khau", None, False, opts, out=print)
    with pytest.raises(sim.ProvisionError, match="không tồn tại"):
        sim.provision(router, "http://sim", "x", "mat-khau", [__import__("uuid").uuid4().__str__()], False, opts, out=print)
    router.rooms = []
    with pytest.raises(sim.ProvisionError, match="Chưa có phòng"):
        sim.provision(router, "http://sim", "x", "mat-khau", None, False, opts, out=print)


def test_provision_reports_http_error_clearly(router, rooms, operator):
    router.token = {"Authorization": "Bearer hong"}                                      # token sai -> Monitoring trả 401
    opts = sim.parse_args(["--email", "x", "--all-rooms"])
    with pytest.raises(sim.ProvisionError, match="401"):
        sim.provision(router, "http://sim", "x", "mat-khau", None, False, opts, out=print)


# ================================================================ dòng lệnh
@pytest.mark.parametrize("argv", [
    [], ["--email", "a@b.c"], ["--sensor", "K", "--jitter", "2"], ["--sensor", "K", "--bad-rate", "-1"],
    ["--sensor", "K", "--interval", "0"], ["--sensor", "K", "--profile", "lạ"],
])
def test_bad_command_lines_are_rejected(argv):
    with pytest.raises(SystemExit):
        sim.parse_args(argv)


def test_unknown_profile_in_key_spec_is_rejected():
    with pytest.raises(SystemExit):
        sim.devices_from_keys(sim.parse_args(["--sensor", "K:khongco"]))


def test_main_returns_nonzero_when_no_devices_or_errors(monkeypatch, capsys):
    class FakeSession:
        def post(self, *a, **k):
            raise requests.ConnectionError("down")
    monkeypatch.setattr(sim.requests, "Session", FakeSession)
    assert sim.main(["--sensor", "K", "--count", "1", "--interval", "1"]) == 2          # có lỗi mạng -> mã thoát 2
    monkeypatch.setenv("SIM_PASSWORD", "x")
    assert sim.main(["--email", "a@b.c", "--all-rooms"]) == 1                            # không đăng nhập được -> mã thoát 1
    assert "Lỗi" in capsys.readouterr().err


def test_contract_matches_firmware_payload(router, client, operator, rooms, db):
    """Payload của firmware ESP32 (src/main.cpp) chỉ gồm temperature + humidity: phải được chấp nhận y hệt."""
    key = make_key(client, operator, rooms[0])
    r = client.post("/iot/telemetry", json={"temperature": 26.5, "humidity": 88.0}, headers={"X-Device-Key": key})
    assert r.status_code == 202 and make_token("OPERATOR")

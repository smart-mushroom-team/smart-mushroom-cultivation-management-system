"""infra/nifi/provision_flow.py chạy với NiFi GIẢ (fake_nifi.py): kiểm logic dựng luồng, nối relationship, idempotent, lỗi.
Không thay thế việc chạy script với NiFi thật (xem infra/nifi/README.md) nhưng bắt được lỗi logic, nối sai, quên tắt/khởi động."""
import pathlib
import sys

import pytest
import requests

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "infra" / "nifi"))
import fake_nifi  # noqa: E402
import provision_flow as pf  # noqa: E402

ENV = {"NIFI_USER": "admin", "NIFI_PASSWORD": "adminadminadmin", "NIFI_DB_PASSWORD": "dbpw", "RABBITMQ_USER": "mq", "RABBITMQ_PASSWORD": "mqpw"}


@pytest.fixture(autouse=True)
def env(monkeypatch):
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setattr(pf, "POLL", 0.01)


@pytest.fixture()
def jar(tmp_path):
    f = tmp_path / "postgresql-42.7.4.jar"
    f.write_bytes(b"PK")
    return str(f)


@pytest.fixture()
def nifi():
    n = fake_nifi.FakeNifi()
    yield n
    n.close()


def run(nifi, jar, *extra):
    out = []
    code = pf.main(["--url", nifi.url, "--driver", jar, "--wait", "10", *extra], http=requests.Session(), say=out.append)
    return code, "\n".join(map(str, out))


def only_group_state(nifi):
    (gid,) = nifi.groups
    return nifi.group_state[gid]


# ================================================================ dựng luồng
def test_builds_the_whole_flow_and_starts_it(nifi, jar):
    code, out = run(nifi, jar)
    assert code == 0, out
    assert only_group_state(nifi) == "RUNNING"
    assert [g["name"] for g in nifi.groups.values()] == [pf.GROUP_NAME]
    (svc,) = nifi.services.values()
    assert svc["state"] == "ENABLED"
    disp = {nifi._descriptors(svc["type"])[k]["displayName"]: v for k, v in svc["props"].items()}
    assert disp["Database Connection URL"] == "jdbc:postgresql://postgres:5432/monitoring_db"
    assert disp["Database User"] == "nifi_user" and disp["Password"] == "dbpw"
    assert disp["Database Driver Location(s)"] == "/opt/nifi/nifi-current/drivers/postgresql-42.7.4.jar"      # đường dẫn TRONG container
    assert {p["name"] for p in nifi.processors.values()} == {
        "Doc telemetry.events", "Tach truong JSON", "Khai bao kieu tham so", "Ghi tong hop 5 phut", "Ghi log loi"}
    assert all(p["status"] == "VALID" for p in nifi.processors.values())


def test_processor_configuration(nifi, jar):
    assert run(nifi, jar)[0] == 0
    amqp = nifi.props_by_display("Doc telemetry.events")
    assert amqp["Queue"] == "telemetry.events" and amqp["Brokers"] == "rabbitmq:5672"
    assert amqp["User Name"] == "mq" and amqp["Password"] == "mqpw" and amqp["Auto-Acknowledge Messages"] == "false"    # ack tay: không mất tin
    assert nifi.props_by_display("Tach truong JSON") == {
        "Destination": "flowfile-attribute", "Path Not Found Behavior": "ignore", "Null Value Representation": "empty string",
        "sql.args.1.value": "$.roomId", "sql.args.2.value": "$.recordedAt", "sql.args.3.value": "$.temperature", "sql.args.4.value": "$.humidity"}
    assert nifi.props_by_display("Khai bao kieu tham so") == {f"sql.args.{i}.type": "12" for i in (1, 2, 3, 4)}
    put = nifi.props_by_display("Ghi tong hop 5 phut")
    (svc_id,) = nifi.services
    assert put["JDBC Connection Pool"] == svc_id
    sql = put["SQL Statement"]
    assert sql == pf.load_sql() and sql.count("?") == 4 and "--" not in sql and "ON CONFLICT (room_id, window_start)" in sql
    assert nifi.by_name("Ghi tong hop 5 phut")["auto"] == ["success"] and nifi.by_name("Ghi log loi")["auto"] == ["success"]


def test_connections_cover_every_outcome(nifi, jar):
    assert run(nifi, jar)[0] == 0
    got = {(c["src"], c["dst"]): sorted(c["rels"]) for c in nifi.connections}
    assert got == {
        ("Doc telemetry.events", "Tach truong JSON"): ["success"],
        ("Tach truong JSON", "Khai bao kieu tham so"): ["matched"],
        ("Tach truong JSON", "Ghi log loi"): ["failure", "unmatched"],
        ("Khai bao kieu tham so", "Ghi tong hop 5 phut"): ["success"],
        ("Ghi tong hop 5 phut", "Ghi tong hop 5 phut"): ["retry"],               # lỗi tạm thời: thử lại
        ("Ghi tong hop 5 phut", "Ghi log loi"): ["failure"],
    }
    # mọi relationship của mọi processor đều được nối hoặc tự hủy: không processor nào bị NiFi báo "relationship chưa xử lý"
    handled = {(c["src"], r) for c in nifi.connections for r in c["rels"]}
    for p in nifi.processors.values():
        for r in fake_nifi.TYPES[p["type"]][1]:
            assert (p["name"], r) in handled or r in p["auto"], (p["name"], r)


# ================================================================ idempotent, dựng lại
def test_second_run_changes_nothing(nifi, jar):
    assert run(nifi, jar)[0] == 0
    before = (len(nifi.processors), len(nifi.services), len(nifi.connections))
    code, out = run(nifi, jar)
    assert code == 0 and "Đã có luồng" in out
    assert (len(nifi.processors), len(nifi.services), len(nifi.connections)) == before and len(nifi.groups) == 1


def test_recreate_replaces_the_flow(nifi, jar):
    assert run(nifi, jar)[0] == 0
    (old,) = nifi.groups
    code, out = run(nifi, jar, "--recreate")
    assert code == 0, out
    (new,) = nifi.groups
    assert new != old and len(nifi.processors) == 5 and len(nifi.services) == 1 and only_group_state(nifi) == "RUNNING"


def test_no_start_builds_but_does_not_run(nifi, jar):
    code, _ = run(nifi, jar, "--no-start")
    assert code == 0 and only_group_state(nifi) == "STOPPED"


# ================================================================ lỗi
def test_waits_until_nifi_is_ready(jar):
    n = fake_nifi.FakeNifi(not_ready=3)
    try:
        code, out = run(n, jar)
        assert code == 0 and n.token_calls == 4, out
    finally:
        n.close()


def test_wrong_password_is_reported_clearly(jar):
    n = fake_nifi.FakeNifi(password="mat-khau-khac-xxxx")
    try:
        code, out = run(n, jar)
        assert code == 1 and "NIFI_PASSWORD" in out and not n.groups
    finally:
        n.close()


def test_missing_driver_and_env_are_reported_before_touching_nifi(nifi, tmp_path, monkeypatch):
    monkeypatch.setattr(pf, "REPO", tmp_path)                                    # thư mục drivers rỗng
    msgs = []
    assert pf.main(["--url", nifi.url, "--wait", "5"], http=requests.Session(), say=msgs.append) == 1
    assert "make nifi-driver" in msgs[0] and nifi.calls == []
    monkeypatch.delenv("NIFI_DB_PASSWORD")
    msgs = []
    assert pf.main(["--url", nifi.url, "--driver", "x.jar"], http=requests.Session(), say=msgs.append) == 1
    assert "NIFI_DB_PASSWORD" in msgs[0] and nifi.calls == []


def test_invalid_processor_is_reported_and_flow_is_not_started(jar):
    n = fake_nifi.FakeNifi(invalid_processor="Ghi tong hop 5 phut")
    try:
        code, out = run(n, jar)
        assert code == 2 and "Ghi tong hop 5 phut" in out and "driver not found" in out
        (gid,) = n.groups
        assert n.group_state[gid] != "RUNNING"
    finally:
        n.close()


def test_unknown_property_lists_what_nifi_has(nifi, jar):
    orig = fake_nifi.TYPES[pf.T_LOG]
    fake_nifi.TYPES[pf.T_LOG] = ({"Log Level": "Log Level"}, orig[1], orig[2])     # bản NiFi này không có "Log Payload"
    try:
        code, out = run(nifi, jar)
    finally:
        fake_nifi.TYPES[pf.T_LOG] = orig
    assert code == 1 and "Log Payload" in out and "Log Level" in out


def test_older_nifi_with_host_and_port_instead_of_brokers(jar):
    n = fake_nifi.FakeNifi(legacy_amqp=True)
    try:
        assert run(n, jar)[0] == 0
        amqp = n.props_by_display("Doc telemetry.events")
        assert amqp["Host Name"] == "rabbitmq" and amqp["Port"] == "5672" and "Brokers" not in amqp
    finally:
        n.close()

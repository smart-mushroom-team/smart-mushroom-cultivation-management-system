#!/usr/bin/env python3
"""Dựng luồng NiFi gộp số liệu 5 phút (FR-53) bằng REST API của NiFi, chạy trên máy host sau khi NiFi đã khởi động:

    make nifi-driver     # một lần: tải driver JDBC PostgreSQL vào infra/nifi/drivers/
    make up
    make nifi-flow       # = python infra/nifi/provision_flow.py (đọc .env)

Luồng (một process group tên "Mushroom - telemetry 5 phut"):

    ConsumeAMQP (telemetry.events)
      -> EvaluateJsonPath   lấy roomId, recordedAt, temperature, humidity thành thuộc tính sql.args.N.value
      -> UpdateAttribute    khai báo kiểu tham số sql.args.N.type = 12 (VARCHAR)
      -> PutSQL             chạy services/monitoring/app/upsert_aggregate.sql (UPSERT cộng dồn vào sensor_aggregates)
    lỗi (JSON sai, SQL lỗi) -> LogAttribute (ghi log mức ERROR kèm nội dung); lỗi tạm thời của PutSQL (retry) thử lại.

Tên thuộc tính của từng processor được dò theo tên hiển thị trong chính NiFi đang chạy, nên khác biệt nhỏ giữa các phiên bản không làm hỏng
script; nếu NiFi không chấp nhận một thuộc tính hoặc luồng không hợp lệ, script in rõ lỗi và KHÔNG khởi động luồng (thoát mã 2).
Chạy lại an toàn: đã có luồng thì bỏ qua. Dùng --recreate để xóa và dựng lại (hàng đợi phải trống).
"""
import argparse
import glob
import os
import pathlib
import sys
import time

import requests

try:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)          # NiFi dùng chứng chỉ tự ký khi chạy local
except Exception:                                                                 # noqa: BLE001
    pass

REPO = pathlib.Path(__file__).resolve().parents[2]
SQL_FILE = REPO / "services" / "monitoring" / "app" / "upsert_aggregate.sql"
GROUP_NAME = "Mushroom - telemetry 5 phut"
POLL = 2.0                                                                          # giây giữa các lần hỏi lại (test chỉnh nhỏ lại)
DRIVER_DIR_IN_CONTAINER = "/opt/nifi/nifi-current/drivers"
CLIENT_ID = "mushroom-provision"

T_DBCP = "org.apache.nifi.dbcp.DBCPConnectionPool"
T_CONSUME = "org.apache.nifi.amqp.processors.ConsumeAMQP"
T_JSONPATH = "org.apache.nifi.processors.standard.EvaluateJsonPath"
T_UPDATE = "org.apache.nifi.processors.attributes.UpdateAttribute"
T_PUTSQL = "org.apache.nifi.processors.standard.PutSQL"
T_LOG = "org.apache.nifi.processors.standard.LogAttribute"


class ProvisionError(Exception):
    pass


def load_env_file(path: pathlib.Path) -> None:
    """Nạp .env (KEY=VALUE) cho các biến CHƯA có sẵn trong môi trường, để chạy thẳng bằng `python` trên Windows mà không cần shell."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key.strip(), value)


def load_sql() -> str:
    """Câu SQL kiểu JDBC (dấu ?), bỏ dòng chú thích; dùng chung với aggregator dự phòng (cùng một file)."""
    return "\n".join(ln for ln in SQL_FILE.read_text(encoding="utf8").splitlines() if not ln.lstrip().startswith("--"))


class Nifi:
    def __init__(self, base: str, http: requests.Session, verify=False):
        self.base, self.http, self.verify = base.rstrip("/") + "/nifi-api", http, verify

    def call(self, method: str, path: str, ok=(200, 201), **kw):
        r = self.http.request(method, self.base + path, verify=self.verify, timeout=60, **kw)
        if r.status_code not in ok:
            raise ProvisionError(f"{method} {path} -> {r.status_code}: {r.text[:600]}")
        return r.json() if r.content and r.headers.get("content-type", "").startswith("application/json") else r.text

    def login(self, user: str, password: str) -> None:
        token = self.call("POST", "/access/token", data={"username": user, "password": password})
        self.http.headers["Authorization"] = f"Bearer {token}"


# ---------------------------------------------------------------------------------------------------- tiện ích
def resolve(descriptors: dict, wanted: dict) -> dict:
    """Đổi khóa thuộc tính từ tên hiển thị (hoặc tên nội bộ) sang tên nội bộ mà NiFi đang dùng."""
    index = {}
    for name, d in (descriptors or {}).items():
        index[name.lower()] = name
        if d.get("displayName"):
            index[d["displayName"].lower()] = name
    out, missing = {}, []
    for key, value in wanted.items():
        name = index.get(key.lower())
        if name is None:
            missing.append(key)
        else:
            out[name] = value
    if missing:
        shown = sorted({d.get("displayName", n) for n, d in descriptors.items()})
        raise ProvisionError(f"NiFi không có thuộc tính {missing}. Các thuộc tính có sẵn: {shown}")
    return out


def revision(entity: dict) -> dict:
    return {"clientId": CLIENT_ID, "version": entity["revision"]["version"]}


def wait_until(fn, what: str, timeout: float, every: float | None = None):
    end = time.time() + timeout
    last = None
    while time.time() < end:
        last = fn()
        if last:
            return last
        time.sleep(POLL if every is None else min(every, POLL * 2.5))
    raise ProvisionError(f"Quá {int(timeout)} giây mà chưa {what}")


def validation_problems(entity: dict) -> list[str]:
    comp = entity["component"]
    status = comp.get("validationStatus")
    if status in (None, "VALID"):
        return []
    return [f"{comp.get('name')}: {status} {comp.get('validationErrors') or ''}"]


# ---------------------------------------------------------------------------------------------------- dựng luồng
class Builder:
    def __init__(self, nifi: Nifi, gid: str, say=print):
        self.nifi, self.gid, self.say = nifi, gid, say
        self.processors: dict[str, dict] = {}                  # tên -> entity
        self.services: dict[str, dict] = {}

    def service(self, name: str, type_: str, props: dict) -> dict:
        e = self.nifi.call("POST", f"/process-groups/{self.gid}/controller-services",
                           json={"revision": {"clientId": CLIENT_ID, "version": 0}, "component": {"type": type_, "name": name}})
        props = resolve(e["component"].get("descriptors"), props)
        e = self.nifi.call("PUT", f"/controller-services/{e['id']}",
                           json={"revision": revision(e), "component": {"id": e["id"], "properties": props}})
        self.services[name] = e
        return e

    def enable(self, e: dict) -> dict:
        self.nifi.call("PUT", f"/controller-services/{e['id']}/run-status", json={"revision": revision(e), "state": "ENABLED"})

        def done():
            cur = self.nifi.call("GET", f"/controller-services/{e['id']}")
            if cur["component"].get("state") == "ENABLED":
                return cur
            if cur["component"].get("validationStatus") == "INVALID":
                raise ProvisionError(f"Controller service không hợp lệ: {cur['component'].get('validationErrors')}")
            return None
        return wait_until(done, f"bật được controller service {e['component']['name']}", 60)

    def processor(self, name: str, type_: str, props: dict, dynamic: dict | None = None, auto_terminate=(), pos=(0, 0)) -> dict:
        e = self.nifi.call("POST", f"/process-groups/{self.gid}/processors",
                           json={"revision": {"clientId": CLIENT_ID, "version": 0},
                                 "component": {"type": type_, "name": name, "position": {"x": pos[0], "y": pos[1]}}})
        comp = e["component"]
        rels = {r["name"] for r in comp.get("relationships", [])}
        bad = [r for r in auto_terminate if r not in rels]
        if bad:
            raise ProvisionError(f"{name}: không có relationship {bad}; các relationship có sẵn: {sorted(rels)}")
        descriptors = comp["config"].get("descriptors") or {}
        if callable(props):                                    # thuộc tính phụ thuộc phiên bản NiFi: nhận tập tên hiển thị có sẵn
            props = props({d.get("displayName", n).lower() for n, d in descriptors.items()})
        all_props = {**resolve(descriptors, props), **(dynamic or {})}
        e = self.nifi.call("PUT", f"/processors/{e['id']}",
                           json={"revision": revision(e), "component": {"id": e["id"], "config": {
                               "properties": all_props, "autoTerminatedRelationships": list(auto_terminate)}}})
        self.processors[name] = e
        return e

    def connect(self, src: str, dst: str, relationships: list[str]) -> None:
        a, b = self.processors[src], self.processors[dst]
        have = {r["name"] for r in a["component"].get("relationships", [])}
        bad = [r for r in relationships if r not in have]
        if bad:
            raise ProvisionError(f"{src}: không có relationship {bad}; có sẵn: {sorted(have)}")
        end = lambda e: {"id": e["id"], "groupId": self.gid, "type": "PROCESSOR"}       # noqa: E731
        self.nifi.call("POST", f"/process-groups/{self.gid}/connections", json={
            "revision": {"clientId": CLIENT_ID, "version": 0},
            "component": {"name": "", "source": end(a), "destination": end(b), "selectedRelationships": relationships,
                          "flowFileExpiration": "0 sec", "backPressureObjectThreshold": 10000,
                          "backPressureDataSizeThreshold": "1 GB", "prioritizers": [], "bends": []}})

    def problems(self) -> list[str]:
        out = []
        for name in self.processors:
            def check(name=name):
                cur = self.nifi.call("GET", f"/processors/{self.processors[name]['id']}")
                return cur if cur["component"].get("validationStatus") != "VALIDATING" else None
            cur = wait_until(check, f"kiểm tra xong processor {name}", 30)
            self.processors[name] = cur
            out += validation_problems(cur)
        return out


def build_flow(nifi: Nifi, gid: str, cfg: dict, say=print) -> Builder:
    b = Builder(nifi, gid, say)
    say("Tạo kết nối CSDL (DBCPConnectionPool)...")
    pool = b.service("monitoring_db (nifi_user)", T_DBCP, {
        "Database Connection URL": cfg["jdbc_url"],
        "Database Driver Class Name": "org.postgresql.Driver",
        "Database Driver Location(s)": cfg["driver_path"],
        "Database User": cfg["db_user"],
        "Password": cfg["db_password"],
    })
    b.enable(pool)

    say("Tạo các processor...")
    def amqp_props(names: set) -> dict:                      # bản mới dùng "Brokers" (host:port), bản cũ dùng Host Name + Port
        p = {"Queue": "telemetry.events", "User Name": cfg["amqp_user"], "Password": cfg["amqp_password"],
             "Auto-Acknowledge Messages": "false"}
        if "brokers" in names:
            p["Brokers"] = f"{cfg['amqp_host']}:{cfg['amqp_port']}"
        else:
            p.update({"Host Name": cfg["amqp_host"], "Port": str(cfg["amqp_port"])})
        return p
    b.processor("Doc telemetry.events", T_CONSUME, amqp_props, pos=(0, 0))
    b.processor("Tach truong JSON", T_JSONPATH,
                {"Destination": "flowfile-attribute", "Path Not Found Behavior": "ignore", "Null Value Representation": "empty string"},
                dynamic={"sql.args.1.value": "$.roomId", "sql.args.2.value": "$.recordedAt",
                         "sql.args.3.value": "$.temperature", "sql.args.4.value": "$.humidity"}, pos=(0, 200))
    b.processor("Khai bao kieu tham so", T_UPDATE, {},
                dynamic={f"sql.args.{i}.type": "12" for i in (1, 2, 3, 4)}, pos=(0, 400))
    b.processor("Ghi tong hop 5 phut", T_PUTSQL,
                {"JDBC Connection Pool": pool["id"], "SQL Statement": cfg["sql"]}, auto_terminate=("success",), pos=(0, 600))
    b.processor("Ghi log loi", T_LOG, {"Log Level": "error", "Log Payload": "true"}, auto_terminate=("success",), pos=(500, 400))

    say("Nối các processor...")
    b.connect("Doc telemetry.events", "Tach truong JSON", ["success"])
    b.connect("Tach truong JSON", "Khai bao kieu tham so", ["matched"])
    b.connect("Tach truong JSON", "Ghi log loi", ["failure", "unmatched"])
    b.connect("Khai bao kieu tham so", "Ghi tong hop 5 phut", ["success"])
    b.connect("Ghi tong hop 5 phut", "Ghi tong hop 5 phut", ["retry"])
    b.connect("Ghi tong hop 5 phut", "Ghi log loi", ["failure"])
    return b


# ---------------------------------------------------------------------------------------------------- nhóm / xóa
def find_group(nifi: Nifi, root: str) -> dict | None:
    for g in nifi.call("GET", f"/process-groups/{root}/process-groups")["processGroups"]:
        if g["component"]["name"] == GROUP_NAME:
            return g
    return None


def set_state(nifi: Nifi, gid: str, state: str) -> None:
    nifi.call("PUT", f"/flow/process-groups/{gid}", json={"id": gid, "state": state})


def delete_group(nifi: Nifi, g: dict, say=print) -> None:
    gid = g["id"]
    say("Dừng luồng cũ...")
    set_state(nifi, gid, "STOPPED")
    time.sleep(POLL)
    for s in nifi.call("GET", f"/flow/process-groups/{gid}/controller-services")["controllerServices"]:
        if s["component"].get("parentGroupId") == gid:
            nifi.call("PUT", f"/controller-services/{s['id']}/run-status", json={"revision": revision(s), "state": "DISABLED"})
    time.sleep(POLL)
    cur = nifi.call("GET", f"/process-groups/{gid}")
    try:
        nifi.call("DELETE", f"/process-groups/{gid}?version={cur['revision']['version']}&clientId={CLIENT_ID}")
    except ProvisionError as e:
        raise ProvisionError("Không xóa được luồng cũ (còn tin trong hàng đợi hoặc processor chưa dừng hẳn). "
                             f"Xóa tay trên giao diện NiFi rồi chạy lại. Chi tiết: {e}") from e


# ---------------------------------------------------------------------------------------------------- main
def config_from(args) -> dict:
    env = os.environ
    missing = [k for k in ("NIFI_USER", "NIFI_PASSWORD", "NIFI_DB_PASSWORD", "RABBITMQ_USER", "RABBITMQ_PASSWORD") if not env.get(k)]
    if missing:
        raise ProvisionError(f"Thiếu biến môi trường {missing} (đặt trong .env ở thư mục gốc dự án)")
    jar = args.driver or next(iter(sorted(glob.glob(str(REPO / "infra" / "nifi" / "drivers" / "postgresql-*.jar")))), None)
    if not jar:
        raise ProvisionError("Chưa có driver JDBC PostgreSQL. Chạy `make nifi-driver` (hoặc đặt postgresql-*.jar vào infra/nifi/drivers/).")
    return {"jdbc_url": args.jdbc_url, "driver_path": f"{DRIVER_DIR_IN_CONTAINER}/{pathlib.Path(jar).name}",
            "db_user": "nifi_user", "db_password": env["NIFI_DB_PASSWORD"],
            "amqp_host": args.amqp_host, "amqp_port": args.amqp_port, "amqp_user": env["RABBITMQ_USER"],
            "amqp_password": env["RABBITMQ_PASSWORD"], "sql": load_sql()}


def main(argv=None, http: requests.Session | None = None, say=print) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default=os.getenv("NIFI_URL", "https://localhost:8443"))
    ap.add_argument("--ca", help="tệp CA để kiểm tra chứng chỉ NiFi (mặc định bỏ qua vì chứng chỉ tự ký)")
    ap.add_argument("--wait", type=int, default=300, help="chờ NiFi khởi động tối đa N giây (mặc định 300)")
    ap.add_argument("--driver", help="đường dẫn jar JDBC trên máy host (mặc định: postgresql-*.jar trong infra/nifi/drivers)")
    ap.add_argument("--jdbc-url", default="jdbc:postgresql://postgres:5432/monitoring_db")
    ap.add_argument("--amqp-host", default="rabbitmq")
    ap.add_argument("--amqp-port", type=int, default=5672)
    ap.add_argument("--no-start", action="store_true", help="dựng nhưng chưa chạy")
    ap.add_argument("--recreate", action="store_true", help="xóa luồng cũ (nếu có) rồi dựng lại")
    args = ap.parse_args(argv)
    load_env_file(REPO / ".env")
    try:
        cfg = config_from(args)
        nifi = Nifi(args.url, http or requests.Session(), verify=args.ca or False)

        def login():
            try:
                nifi.login(os.environ["NIFI_USER"], os.environ["NIFI_PASSWORD"])
                return True
            except requests.RequestException:
                return False
            except ProvisionError as e:
                if " 401" in str(e) or "-> 401" in str(e):
                    raise ProvisionError("NiFi từ chối NIFI_USER/NIFI_PASSWORD (kiểm tra .env; mật khẩu NiFi phải từ 12 ký tự)") from e
                return False
        say(f"Chờ NiFi ở {args.url} (lần đầu mất 1-3 phút)...")
        wait_until(login, "đăng nhập được vào NiFi", args.wait, every=5)
        root = nifi.call("GET", "/process-groups/root")["id"]
        existing = find_group(nifi, root)
        if existing and not args.recreate:
            say(f"Đã có luồng '{GROUP_NAME}', bỏ qua (dùng --recreate để dựng lại).")
            return 0
        if existing:
            delete_group(nifi, existing, say)
        g = nifi.call("POST", f"/process-groups/{root}/process-groups",
                      json={"revision": {"clientId": CLIENT_ID, "version": 0}, "component": {"name": GROUP_NAME, "position": {"x": 100, "y": 100}}})
        gid = g["id"]
        b = build_flow(nifi, gid, cfg, say)
        problems = b.problems()
        if problems:
            say("LUỒNG KHÔNG HỢP LỆ, chưa khởi động:\n  " + "\n  ".join(problems))
            say("Sửa nguyên nhân (thường là thiếu driver, sai mật khẩu hoặc sai tên hàng đợi) rồi chạy lại với --recreate.")
            return 2
        if args.no_start:
            say("Đã dựng xong, chưa khởi động (--no-start).")
            return 0
        set_state(nifi, gid, "RUNNING")
        say(f"Xong: luồng '{GROUP_NAME}' đang chạy. Xem tại {args.url}/nifi")
        return 0
    except ProvisionError as e:
        say(f"Lỗi: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

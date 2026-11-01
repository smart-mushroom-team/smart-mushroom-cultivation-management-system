"""NiFi GIẢ tối thiểu (HTTP có trạng thái) chỉ để kiểm logic của infra/nifi/provision_flow.py: đủ các endpoint REST mà script gọi.
Mô phỏng những điều làm script dễ hỏng trên NiFi thật: tên thuộc tính nội bộ khác tên hiển thị, relationship cố định theo loại processor,
processor/service có thể INVALID, NiFi chưa sẵn sàng lúc mới khởi động, sai mật khẩu. KHÔNG chứng minh NiFi thật chấp nhận luồng."""
import json
import re
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# loại -> (tên nội bộ: tên hiển thị, relationship, thuộc tính bắt buộc theo tên hiển thị)
TYPES = {
    "org.apache.nifi.dbcp.DBCPConnectionPool": (
        {"Database Connection URL": "Database Connection URL", "Database Driver Class Name": "Database Driver Class Name",
         "database-driver-locations": "Database Driver Location(s)", "Database User": "Database User", "Password": "Password"},
        [], ["Database Connection URL", "Database Driver Class Name", "Database Driver Location(s)", "Database User"]),
    "org.apache.nifi.amqp.processors.ConsumeAMQP": (
        {"Queue": "Queue", "User Name": "User Name", "Password": "Password", "Brokers": "Brokers", "auto.acknowledge": "Auto-Acknowledge Messages"},
        ["success"], ["Queue", "User Name", "Password"]),
    "org.apache.nifi.processors.standard.EvaluateJsonPath": (
        {"Destination": "Destination", "Path Not Found Behavior": "Path Not Found Behavior", "Null Value Representation": "Null Value Representation"},
        ["matched", "unmatched", "failure"], ["Destination"]),
    "org.apache.nifi.processors.attributes.UpdateAttribute": ({}, ["success"], []),
    "org.apache.nifi.processors.standard.PutSQL": (
        {"JDBC Connection Pool": "JDBC Connection Pool", "putsql-sql-statement": "SQL Statement"},
        ["success", "failure", "retry"], ["JDBC Connection Pool"]),
    "org.apache.nifi.processors.standard.LogAttribute": (
        {"Log Level": "Log Level", "Log Payload": "Log Payload"}, ["success"], []),
}
LEGACY_AMQP = {"Queue": "Queue", "User Name": "User Name", "Password": "Password", "Host Name": "Host Name", "Port": "Port",
               "auto.acknowledge": "Auto-Acknowledge Messages"}


class FakeNifi:
    def __init__(self, user="admin", password="adminadminadmin", not_ready=0, legacy_amqp=False, invalid_processor=None):
        self.user, self.password = user, password
        self.not_ready, self.legacy_amqp, self.invalid_processor = not_ready, legacy_amqp, invalid_processor
        self.groups, self.processors, self.services, self.connections = {}, {}, {}, []
        self.group_state, self.calls, self.token_calls = {}, [], 0
        self.lock = threading.Lock()
        fake = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _send(self, code, body, ctype="application/json"):
                data = body if isinstance(body, bytes) else (body if isinstance(body, str) else json.dumps(body)).encode()
                self.send_response(code)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def _handle(self, method):
                n = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(n) if n else b""
                url = urlparse(self.path)
                path = url.path.removeprefix("/nifi-api")
                with fake.lock:
                    fake.calls.append((method, path))
                    if path == "/access/token":
                        fake.token_calls += 1
                        if fake.token_calls <= fake.not_ready:
                            return self._send(503, "starting", "text/plain")
                        form = parse_qs(raw.decode())
                        ok = form.get("username") == [fake.user] and form.get("password") == [fake.password]
                        return self._send(201 if ok else 401, "FAKE.JWT" if ok else "bad credentials", "text/plain")
                    if self.headers.get("Authorization") != "Bearer FAKE.JWT":
                        return self._send(401, "no token", "text/plain")
                    body = json.loads(raw) if raw else {}
                    code, out = fake.route(method, path, parse_qs(url.query), body)
                self._send(code, out)

            do_GET = lambda self: self._handle("GET")        # noqa: E731
            do_POST = lambda self: self._handle("POST")      # noqa: E731
            do_PUT = lambda self: self._handle("PUT")        # noqa: E731
            do_DELETE = lambda self: self._handle("DELETE")  # noqa: E731

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()

    # ---- thực thể
    def _descriptors(self, type_):
        names = TYPES[type_][0]
        if type_.endswith("ConsumeAMQP") and self.legacy_amqp:
            names = LEGACY_AMQP
        return {n: {"name": n, "displayName": d} for n, d in names.items()}

    def _validate(self, comp, type_, props):
        display = {self._descriptors(type_)[n]["displayName"]: v for n, v in props.items() if n in self._descriptors(type_)}
        errors = [f"'{r}' is required" for r in TYPES[type_][2] if not display.get(r)]
        if self.invalid_processor and comp.get("name") == self.invalid_processor:
            errors.append("simulated: driver not found")
        comp["validationErrors"] = errors
        comp["validationStatus"] = "INVALID" if errors else "VALID"

    def _proc_entity(self, p):
        comp = {"id": p["id"], "name": p["name"], "type": p["type"], "position": p["position"],
                "relationships": [{"name": r, "autoTerminate": r in p["auto"]} for r in TYPES[p["type"]][1]],
                "validationStatus": p["status"], "validationErrors": p["errors"],
                "config": {"properties": p["props"], "descriptors": self._descriptors(p["type"]), "autoTerminatedRelationships": p["auto"]}}
        return {"id": p["id"], "revision": {"version": p["v"]}, "component": comp}

    def _svc_entity(self, s):
        return {"id": s["id"], "revision": {"version": s["v"]},
                "component": {"id": s["id"], "name": s["name"], "type": s["type"], "state": s["state"], "parentGroupId": s["group"],
                              "properties": s["props"], "descriptors": self._descriptors(s["type"]),
                              "validationStatus": s["status"], "validationErrors": s["errors"]}}

    def route(self, m, path, q, body):
        if m == "GET" and path == "/process-groups/root":
            return 200, {"id": "root"}
        if m == "GET" and path == "/process-groups/root/process-groups":
            return 200, {"processGroups": [{"id": g["id"], "component": {"name": g["name"]}, "revision": {"version": g["v"]}}
                                           for g in self.groups.values()]}
        if m == "POST" and path == "/process-groups/root/process-groups":
            gid = str(uuid.uuid4())
            self.groups[gid] = {"id": gid, "name": body["component"]["name"], "v": 0}
            self.group_state[gid] = "STOPPED"
            return 201, {"id": gid, "revision": {"version": 0}, "component": {"id": gid, "name": body["component"]["name"]}}
        if m == "GET" and (g := re.fullmatch(r"/process-groups/([^/]+)", path)):
            grp = self.groups[g[1]]
            return 200, {"id": grp["id"], "revision": {"version": grp["v"]}, "component": {"name": grp["name"]}}
        if m == "DELETE" and (g := re.fullmatch(r"/process-groups/([^/]+)", path)):
            if any(c["group"] == g[1] for c in self.connections) and self.group_state[g[1]] == "RUNNING":
                return 409, {"message": "group is running"}
            self.groups.pop(g[1])
            self.processors = {k: v for k, v in self.processors.items() if v["group"] != g[1]}
            self.services = {k: v for k, v in self.services.items() if v["group"] != g[1]}
            self.connections = [c for c in self.connections if c["group"] != g[1]]
            return 200, {}
        if m == "PUT" and (g := re.fullmatch(r"/flow/process-groups/([^/]+)", path)):
            self.group_state[g[1]] = body["state"]
            return 200, {"id": g[1]}
        if m == "GET" and (g := re.fullmatch(r"/flow/process-groups/([^/]+)/controller-services", path)):
            return 200, {"controllerServices": [self._svc_entity(s) for s in self.services.values() if s["group"] == g[1]]}
        # ---- controller service
        if m == "POST" and (g := re.fullmatch(r"/process-groups/([^/]+)/controller-services", path)):
            c = body["component"]
            sid = str(uuid.uuid4())
            self.services[sid] = {"id": sid, "group": g[1], "name": c["name"], "type": c["type"], "props": {}, "v": 0, "state": "DISABLED",
                                  "status": "INVALID", "errors": ["not configured"]}
            return 201, self._svc_entity(self.services[sid])
        if (s := re.fullmatch(r"/controller-services/([^/]+)(/run-status)?", path)) and s[1] in self.services:
            svc = self.services[s[1]]
            if m == "GET":
                return 200, self._svc_entity(svc)
            if body["revision"]["version"] != svc["v"]:
                return 409, {"message": "revision mismatch"}
            if s[2]:
                svc["state"] = body["state"]
            else:
                bad = [k for k in body["component"]["properties"] if k not in self._descriptors(svc["type"])]
                if bad:
                    return 400, {"message": f"unknown property {bad}"}
                svc["props"].update(body["component"]["properties"])
                comp = {"name": svc["name"]}
                self._validate(comp, svc["type"], svc["props"])
                disp = {self._descriptors(svc["type"])[n]["displayName"]: v for n, v in svc["props"].items()}
                if not disp.get("Database Driver Location(s)", "").endswith(".jar"):
                    comp["validationErrors"].append("driver missing")
                svc["errors"] = comp["validationErrors"]
                svc["status"] = "INVALID" if svc["errors"] else "VALID"
            svc["v"] += 1
            return 200, self._svc_entity(svc)
        # ---- processor
        if m == "POST" and (g := re.fullmatch(r"/process-groups/([^/]+)/processors", path)):
            c = body["component"]
            if c["type"] not in TYPES:
                return 400, {"message": f"unknown type {c['type']}"}
            pid = str(uuid.uuid4())
            self.processors[pid] = {"id": pid, "group": g[1], "name": c["name"], "type": c["type"], "position": c["position"], "props": {},
                                    "auto": [], "v": 0, "status": "INVALID", "errors": ["not configured"]}
            return 201, self._proc_entity(self.processors[pid])
        if (s := re.fullmatch(r"/processors/([^/]+)", path)) and s[1] in self.processors:
            p = self.processors[s[1]]
            if m == "GET":
                return 200, self._proc_entity(p)
            if m == "DELETE":
                self.processors.pop(s[1])
                return 200, {}
            if body["revision"]["version"] != p["v"]:
                return 409, {"message": "revision mismatch"}
            cfg = body["component"]["config"]
            known = set(self._descriptors(p["type"]))
            dynamic_ok = p["type"].endswith(("EvaluateJsonPath", "UpdateAttribute"))
            bad = [k for k in cfg["properties"] if k not in known and not dynamic_ok]
            if bad:
                return 400, {"message": f"unknown property {bad}"}
            p["props"].update(cfg["properties"])
            p["auto"] = cfg["autoTerminatedRelationships"]
            comp = {"name": p["name"]}
            self._validate(comp, p["type"], p["props"])
            p["status"], p["errors"] = comp["validationStatus"], comp["validationErrors"]
            p["v"] += 1
            return 200, self._proc_entity(p)
        if m == "POST" and (g := re.fullmatch(r"/process-groups/([^/]+)/connections", path)):
            c = body["component"]
            src, dst = self.processors.get(c["source"]["id"]), self.processors.get(c["destination"]["id"])
            if not src or not dst:
                return 409, {"message": "source or destination not found"}
            bad = [r for r in c["selectedRelationships"] if r not in TYPES[src["type"]][1]]
            if bad:
                return 409, {"message": f"unknown relationship {bad}"}
            self.connections.append({"group": g[1], "src": src["name"], "dst": dst["name"], "rels": c["selectedRelationships"]})
            return 201, {"id": str(uuid.uuid4())}
        return 404, {"message": f"fake nifi: no route for {m} {path}"}

    # ---- để test kiểm tra
    def by_name(self, name):
        return next(p for p in self.processors.values() if p["name"] == name)

    def props_by_display(self, name):
        p = self.by_name(name)
        d = self._descriptors(p["type"])
        return {d[k]["displayName"] if k in d else k: v for k, v in p["props"].items()}

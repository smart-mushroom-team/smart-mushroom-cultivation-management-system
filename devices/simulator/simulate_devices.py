"""Giả lập thiết bị khi chưa có phần cứng (hoặc để thử nhiều phòng cùng lúc). Dùng CHUNG API với thiết bị thật:
POST /iot/telemetry (cảm biến) và POST /iot/snapshot (camera), xác thực bằng X-Device-Key.

Cách 1 - tự tạo thiết bị mô phỏng (cần tài khoản Operator/Admin), mỗi phòng một cảm biến (+ camera nếu --with-camera):
    python simulate_devices.py --email admin@example.com --all-rooms --profile hot
    (mật khẩu lấy từ biến SIM_PASSWORD hoặc được hỏi; có thể chọn phòng: --room <id> --room <id>)
    Phòng đã có thiết bị MÔ PHỎNG thì đổi khóa (rotate-key) để lấy khóa mới; phòng đang có thiết bị THẬT thì bỏ qua, không đụng vào.

Cách 2 - dùng khóa có sẵn (khóa hiện một lần lúc tạo thiết bị):
    python simulate_devices.py --sensor=KEY --sensor=KEY2:hot --camera=KEY3
    (dùng dấu "=" để khóa nào cũng được nhận đúng)

Profile của cảm biến:  normal | hot | cold | dry | humid | flaky | dropout
    hot/cold/dry/humid: số đo vượt ngưỡng mặc định (20-30 C, 70-95 %) để thử cảnh báo N lần liên tiếp
    flaky:   bỏ ~20% lần gửi    dropout: gửi --dropout-on giây rồi im --dropout-off giây (thử cảnh báo offline / online trở lại)
    --anomaly là viết tắt của --profile hot.   --bad-rate 0.1: thỉnh thoảng gửi dữ liệu sai để thử server từ chối (422).
Dừng bằng Ctrl+C, hoặc --count N (mỗi thiết bị gửi N lần) / --duration GIÂY."""
import argparse
import base64
import datetime as dt
import getpass
import io
import os
import random
import sys
import time
from dataclasses import dataclass, field

import requests

PROFILES = ("normal", "hot", "cold", "dry", "humid", "flaky", "dropout")
BAD_PAYLOADS = ({"temperature": 999, "humidity": 50}, {}, {"humidity": 150}, {"temperature": "abc"})

# JPEG 16x12 hợp lệ, dùng khi máy không có Pillow
_FALLBACK_JPEG = base64.b64decode(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxO"
    "UlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09P"
    "T09PT09PT0//wAARCAAMABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUF"
    "BAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVW"
    "V1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi"
    "4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAEC"
    "AxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVm"
    "Z2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq"
    "8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDm6KKK5TjP/9k=")


@dataclass
class Device:
    kind: str                       # "sensor" | "camera"
    key: str
    name: str = ""
    profile: str = "normal"
    interval: float = 5.0
    room: str = ""
    next_at: float = 0.0
    started_at: float | None = None
    dead: bool = False              # khóa bị từ chối (401): ngừng gửi
    stats: dict = field(default_factory=lambda: {"ok": 0, "rejected": 0, "skipped": 0, "errors": 0})
    _temp: float = 25.0
    _hum: float = 85.0

    def stats_total(self) -> int:
        return sum(self.stats.values())


def make_reading(dev: Device, rng: random.Random, elapsed: float, opts) -> dict | None:
    """Số đo giả lập; trả None nếu lần này không gửi (flaky/dropout)."""
    p = dev.profile
    if p == "flaky" and rng.random() < 0.2:
        return None
    if p == "dropout" and elapsed % (opts.dropout_on + opts.dropout_off) >= opts.dropout_on:
        return None
    target_t, target_h = {"hot": (35.0, 85.0), "cold": (12.0, 85.0), "dry": (25.0, 50.0), "humid": (25.0, 98.0)}.get(p, (25.0, 85.0))
    dev._temp += (target_t - dev._temp) * 0.5 + rng.uniform(-0.3, 0.3)     # tiến dần tới mục tiêu cho giống số đo thật
    dev._hum += (target_h - dev._hum) * 0.5 + rng.uniform(-0.8, 0.8)
    return {"temperature": round(dev._temp, 1), "humidity": round(max(0, min(100, dev._hum)), 1)}


def make_jpeg(label: str) -> bytes:
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return _FALLBACK_JPEG
    img = Image.new("RGB", (320, 240), (30, 60, 30))
    d = ImageDraw.Draw(img)
    for y in range(0, 240, 8):
        d.line([(0, y), (320, y)], fill=(30, 60 + y // 3, 30))
    d.text((10, 10), "SIMULATED CAMERA", fill=(255, 255, 255))
    d.text((10, 30), label, fill=(255, 255, 0))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=70)
    return buf.getvalue()


class Simulator:
    def __init__(self, http, base_url: str, devices: list[Device], opts, rng=None, clock=time.monotonic, sleep=time.sleep, out=print):
        self.http, self.base, self.devices, self.opts = http, base_url.rstrip("/"), devices, opts
        self.rng = rng or random.Random(opts.seed)
        self.clock, self.sleep, self.out = clock, sleep, out

    # ---------------------------------------------------------------- gửi một lần
    def send_once(self, dev: Device) -> str:
        now = self.clock()
        if dev.started_at is None:
            dev.started_at = now
        label = dev.name or dev.key[:6]
        try:
            if dev.kind == "sensor":
                payload = make_reading(dev, self.rng, now - dev.started_at, self.opts)
                if payload is None:
                    dev.stats["skipped"] += 1
                    return "skip"
                bad = self.rng.random() < self.opts.bad_rate
                if bad:
                    payload = self.rng.choice(BAD_PAYLOADS)
                r = self.http.post(f"{self.base}/iot/telemetry", json=payload, headers={"X-Device-Key": dev.key}, timeout=10)
                shown = payload
            else:
                bad, shown = False, "ảnh JPEG"
                stamp = dt.datetime.now(dt.timezone.utc)
                r = self.http.post(f"{self.base}/iot/snapshot", data=make_jpeg(f"{label} #{dev.stats_total() + 1} {stamp:%H:%M:%S}"), timeout=15,
                                   headers={"X-Device-Key": dev.key, "Content-Type": "image/jpeg", "X-Captured-At": stamp.isoformat()})
        except requests.RequestException as e:
            dev.stats["errors"] += 1
            self.out(f"[{label}] không gửi được: {e.__class__.__name__}")
            return "error"
        if r.status_code == 202:
            dev.stats["ok"] += 1
            self.out(f"[{label}] 202 {shown}")
            return "ok"
        if bad and r.status_code == 422:
            dev.stats["rejected"] += 1
            self.out(f"[{label}] 422 (dữ liệu sai cố ý, server từ chối đúng) {shown}")
            return "rejected"
        if r.status_code == 401:
            dev.dead = True
            self.out(f"[{label}] 401: khóa thiết bị sai hoặc thiết bị đã bị tắt. Ngừng thiết bị này.")
        else:
            self.out(f"[{label}] {r.status_code}: {r.text[:120]}")
        dev.stats["errors"] += 1
        return "error"

    # ---------------------------------------------------------------- vòng lặp
    def run(self) -> dict:
        t0 = self.clock()
        start = {id(d): d.stats_total() for d in self.devices}               # --count tính theo từng lượt chạy, không cộng dồn các lượt trước
        for i, d in enumerate(self.devices):
            d.next_at = t0 + (i * 0.2 if not self.opts.sync else 0)          # so le nhẹ để không bắn cùng một lúc
        try:
            while True:
                alive = [d for d in self.devices if not d.dead and (self.opts.count is None or d.stats_total() - start[id(d)] < self.opts.count)]
                if not alive:
                    break
                dev = min(alive, key=lambda d: d.next_at)
                wait = dev.next_at - self.clock()
                if self.opts.duration is not None and self.clock() + max(wait, 0) - t0 > self.opts.duration:
                    break
                if wait > 0:
                    self.sleep(wait)
                self.send_once(dev)
                jitter = 1 + self.rng.uniform(-self.opts.jitter, self.opts.jitter)
                dev.next_at = max(dev.next_at, self.clock() - dev.interval) + dev.interval * jitter
        except KeyboardInterrupt:
            self.out("\nĐã dừng.")
        return self.summary()

    def summary(self) -> dict:
        total = {k: sum(d.stats[k] for d in self.devices) for k in ("ok", "rejected", "skipped", "errors")}
        self.out("Tổng kết: " + ", ".join(f"{k}={v}" for k, v in total.items()))
        return total


# ======================================================================= tự tạo thiết bị
class ProvisionError(Exception):
    pass


def provision(http, base: str, email: str, password: str, rooms: list[str] | None, with_camera: bool, opts, out=print) -> list[Device]:
    base = base.rstrip("/")

    def call(method: str, path: str, **kw):
        r = getattr(http, method)(f"{base}{path}", headers=headers, timeout=15, **kw)
        if r.status_code >= 400:
            raise ProvisionError(f"{method.upper()} {path} -> {r.status_code}: {r.text[:200]}")
        return r.json()

    headers = {}
    login = http.post(f"{base}/api/identity/auth/login", json={"email": email, "password": password}, timeout=15)
    if login.status_code != 200:
        raise ProvisionError(f"Đăng nhập thất bại ({login.status_code}). Kiểm tra email/mật khẩu.")
    headers = {"Authorization": f"Bearer {login.json()['accessToken']}"}

    all_rooms = [r for r in call("get", "/api/core/rooms") if r["status"] == "ACTIVE"]
    names = {r["id"]: r["name"] for r in all_rooms}
    wanted = rooms or [r["id"] for r in all_rooms]
    unknown = [r for r in wanted if r not in names]
    if unknown:
        raise ProvisionError(f"Phòng không tồn tại hoặc đã ngừng: {', '.join(unknown)}")
    if not wanted:
        raise ProvisionError("Chưa có phòng nào. Chạy `make seed` hoặc tạo phòng trước.")

    devices: list[Device] = []
    for room in wanted:
        existing = call("get", f"/api/monitoring/devices?roomId={room}")
        for kind, dtype in (("sensor", "SENSOR_NODE"), ("camera", "CAMERA")):
            if kind == "camera" and not with_camera:
                continue
            cur = next((d for d in existing if d["type"] == dtype and d["status"] == "ACTIVE"), None)
            label = f"SIM {kind} {names[room]}"
            if cur is None:
                interval = opts.interval if kind == "sensor" else opts.camera_interval
                key = call("post", "/api/monitoring/devices",
                           json={"name": label, "type": dtype, "roomId": room, "intervalSec": max(5, int(interval)),
                                 "isSimulated": True})["apiKey"]
            elif cur["isSimulated"]:
                key = call("post", f"/api/monitoring/devices/{cur['id']}/rotate-key")["apiKey"]
                label = cur["name"]
            else:
                out(f"Bỏ qua phòng '{names[room]}': đã có {kind} THẬT '{cur['name']}' (không đụng vào thiết bị thật).")
                continue
            devices.append(Device(kind=kind, key=key, name=label, room=room, profile=opts.profile if kind == "sensor" else "normal",
                                  interval=opts.interval if kind == "sensor" else opts.camera_interval))
    return devices


# ======================================================================= CLI
def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="Giả lập cảm biến/camera cho Monitoring Service",
                                 formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--url", default=os.getenv("SIM_URL", "http://localhost:8000"), help="địa chỉ Gateway (mặc định http://localhost:8000)")
    ap.add_argument("--sensor", action="append", default=[], metavar="KEY[:PROFILE]", help="cảm biến dùng khóa có sẵn (lặp được)")
    ap.add_argument("--camera", action="append", default=[], metavar="KEY", help="camera dùng khóa có sẵn (lặp được)")
    ap.add_argument("--email", default=os.getenv("SIM_EMAIL"), help="tài khoản Operator/Admin để tự tạo thiết bị")
    ap.add_argument("--room", action="append", default=[], metavar="ROOM_ID", help="chỉ các phòng này (lặp được)")
    ap.add_argument("--all-rooms", action="store_true", help="mọi phòng đang hoạt động")
    ap.add_argument("--with-camera", action="store_true", help="tạo thêm camera mô phỏng cho mỗi phòng")
    ap.add_argument("--profile", choices=PROFILES, default="normal")
    ap.add_argument("--anomaly", action="store_true", help="viết tắt của --profile hot")
    ap.add_argument("--interval", type=float, default=5.0, help="chu kỳ cảm biến (giây, mặc định 5)")
    ap.add_argument("--camera-interval", type=float, default=30.0)
    ap.add_argument("--jitter", type=float, default=0.1, help="độ lệch ngẫu nhiên của chu kỳ (0-1)")
    ap.add_argument("--dropout-on", type=float, default=60.0)
    ap.add_argument("--dropout-off", type=float, default=120.0)
    ap.add_argument("--bad-rate", type=float, default=0.0, help="tỷ lệ gửi dữ liệu sai cố ý (0-1)")
    ap.add_argument("--count", type=int, help="mỗi thiết bị gửi tối đa N lần rồi dừng")
    ap.add_argument("--duration", type=float, help="chạy tối đa N giây")
    ap.add_argument("--seed", type=int)
    ap.add_argument("--sync", action="store_true", help="mọi thiết bị gửi cùng lúc (mặc định so le nhẹ)")
    a = ap.parse_args(argv)
    if a.anomaly:
        a.profile = "hot"
    for name, lo, hi in (("jitter", 0, 1), ("bad_rate", 0, 1)):
        if not lo <= getattr(a, name) <= hi:
            ap.error(f"--{name.replace('_', '-')} phải trong khoảng {lo}-{hi}")
    if a.interval < 1 or a.camera_interval < 1:
        ap.error("chu kỳ phải >= 1 giây")
    if not (a.sensor or a.camera or a.email):
        ap.error("cần --email (tự tạo thiết bị) hoặc --sensor/--camera (khóa có sẵn)")
    if a.email and not (a.room or a.all_rooms):
        ap.error("với --email, hãy chọn --room <id> hoặc --all-rooms (tránh đổi khóa thiết bị mô phỏng của mọi phòng ngoài ý muốn)")
    return a


def devices_from_keys(opts) -> list[Device]:
    out = []
    for i, spec in enumerate(opts.sensor, 1):
        key, _, prof = spec.partition(":")
        if prof and prof not in PROFILES:
            sys.exit(f"Profile không hợp lệ '{prof}'. Chọn một trong: {', '.join(PROFILES)}")
        out.append(Device(kind="sensor", key=key, name=f"sensor{i}", profile=prof or opts.profile, interval=opts.interval))
    for i, key in enumerate(opts.camera, 1):
        out.append(Device(kind="camera", key=key, name=f"camera{i}", interval=opts.camera_interval))
    return out


def main(argv=None) -> int:
    opts = parse_args(argv)
    http = requests.Session()
    devices = devices_from_keys(opts)
    if opts.email:
        password = os.getenv("SIM_PASSWORD") or getpass.getpass(f"Mật khẩu của {opts.email}: ")
        try:
            devices += provision(http, opts.url, opts.email, password, opts.room or None, opts.with_camera, opts)
        except (ProvisionError, requests.RequestException) as e:
            print(f"Lỗi: {e}", file=sys.stderr)
            return 1
    if not devices:
        print("Không có thiết bị nào để chạy.", file=sys.stderr)
        return 1
    print(f"Chạy {len(devices)} thiết bị tới {opts.url} (Ctrl+C để dừng)")
    res = Simulator(http, opts.url, devices, opts).run()
    return 0 if res["errors"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())

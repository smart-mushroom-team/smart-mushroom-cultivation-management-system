"""Camera agent: chụp ảnh từ webcam laptop định kỳ và gửi lên Monitoring (FR-28).

Chạy NGOÀI Docker (container khó truy cập webcam trên Windows):
    python -m venv .venv ; .venv\\Scripts\\Activate.ps1
    pip install -r devices/camera-agent/requirements.txt
    copy devices\\camera-agent\\config.example.yaml devices\\camera-agent\\config.yaml   (rồi điền device_key)
    python devices/camera-agent/agent.py [đường dẫn config.yaml]
Dừng bằng Ctrl+C."""
import datetime as dt
import logging
import pathlib
import sys
import time

import cv2
import requests
import yaml

log = logging.getLogger("camera-agent")
WARMUP_FRAMES = 5         # webcam thường cho vài khung đầu tối/mờ do tự cân sáng
MAX_BYTES = 1_400_000      # server nhận tối đa 1.5 MB


def load_config(path: pathlib.Path) -> dict:
    cfg = yaml.safe_load(path.read_text(encoding="utf8"))
    for k in ("api_url", "device_key"):
        if not cfg.get(k) or str(cfg[k]).startswith("khoa-"):
            sys.exit(f"Thiếu hoặc chưa điền '{k}' trong {path}")
    cfg.setdefault("camera_source", 0)
    cfg.setdefault("interval_sec", 60)
    cfg.setdefault("max_width", 1280)
    cfg.setdefault("jpeg_quality", 80)
    return cfg


def open_camera(source):
    # Windows: CAP_DSHOW mở nhanh và ổn định hơn backend mặc định; nguồn là URL (RTSP) thì dùng mặc định
    cap = cv2.VideoCapture(source, cv2.CAP_DSHOW) if isinstance(source, int) and sys.platform == "win32" else cv2.VideoCapture(source)
    return cap if cap.isOpened() else None


def grab(source):
    """Mở camera, bỏ vài khung đầu, chụp 1 khung rồi nhả camera ngay (để ứng dụng khác dùng được giữa 2 lần chụp)."""
    cap = open_camera(source)
    if cap is None:
        return None
    try:
        frame = None
        for _ in range(WARMUP_FRAMES):
            ok, f = cap.read()
            if ok:
                frame = f
        return frame
    finally:
        cap.release()


def encode(frame, max_width: int, quality: int) -> bytes:
    h, w = frame.shape[:2]
    if w > max_width:
        frame = cv2.resize(frame, (max_width, int(h * max_width / w)), interpolation=cv2.INTER_AREA)
    while True:
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if not ok:
            raise RuntimeError("Không mã hóa được ảnh")
        if len(buf) <= MAX_BYTES or quality <= 30:
            return buf.tobytes()
        quality -= 15                       # ảnh quá nặng thì giảm chất lượng


def send(cfg: dict, jpeg: bytes, captured_at: dt.datetime) -> bool:
    try:
        r = requests.post(cfg["api_url"], data=jpeg, timeout=15,
                          headers={"X-Device-Key": cfg["device_key"], "Content-Type": "image/jpeg",
                                   "X-Captured-At": captured_at.isoformat()})
    except requests.RequestException as e:
        log.warning("Không gửi được (server chưa sẵn sàng?): %s", e.__class__.__name__)
        return False
    if r.status_code == 202:
        log.info("Đã gửi ảnh %d KB", len(jpeg) // 1024)
        return True
    log.error("Server từ chối: %s %s", r.status_code, r.text[:200])
    if r.status_code == 401:
        sys.exit("Khóa thiết bị sai hoặc thiết bị đã bị tắt. Kiểm tra device_key.")
    return False


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = load_config(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).with_name("config.yaml")))
    log.info("Bắt đầu: gửi tới %s mỗi %s giây", cfg["api_url"], cfg["interval_sec"])
    while True:
        started = time.monotonic()
        frame = grab(cfg["camera_source"])
        captured_at = dt.datetime.now(dt.timezone.utc)      # gửi kèm thời điểm chụp thật, kể cả khi mạng chậm
        if frame is None:
            log.warning("Không mở được camera (đang bị ứng dụng khác dùng hoặc sai camera_source?)")
        else:
            send(cfg, encode(frame, cfg["max_width"], cfg["jpeg_quality"]), captured_at)
        time.sleep(max(1.0, cfg["interval_sec"] - (time.monotonic() - started)))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Đã dừng")
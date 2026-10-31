"""FR-27 – FR-29: thiết bị đẩy dữ liệu bằng HTTP + X-Device-Key (không dùng JWT, BR-17)."""
import datetime as dt
import hashlib
import math

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import text

from common.db import engine
from common.errors import AppError
from common.events import TELEMETRY_QUEUE
from common.rabbit import publish

from .. import cache, presence, snapshots, thresholds

router = APIRouter(prefix="/iot", tags=["iot"])

MAX_FUTURE = dt.timedelta(minutes=5)       # đồng hồ thiết bị lệch nhẹ vẫn chấp nhận
MAX_AGE = dt.timedelta(days=7)             # cũ hơn thời hạn giữ dữ liệu thô thì vô nghĩa


class Telemetry(BaseModel):
    temperature: float | None = Field(default=None, ge=-40, le=85)     # dải đo của DHT22; ngoài dải coi là lỗi cảm biến
    humidity: float | None = Field(default=None, ge=0, le=100)
    recordedAt: dt.datetime | None = None

    @field_validator("temperature", "humidity")
    @classmethod
    def _finite(cls, v):
        if v is not None and not math.isfinite(v):
            raise ValueError("Giá trị không hợp lệ")
        return v

    @model_validator(mode="after")
    def _check(self):
        if self.temperature is None and self.humidity is None:
            raise ValueError("Cần ít nhất temperature hoặc humidity")
        if self.recordedAt is not None:
            if self.recordedAt.tzinfo is None:                          # thiết bị không gửi múi giờ: coi là UTC
                self.recordedAt = self.recordedAt.replace(tzinfo=dt.timezone.utc)
            now = dt.datetime.now(dt.timezone.utc)
            if self.recordedAt > now + MAX_FUTURE:
                raise ValueError("recordedAt nằm ở tương lai")
            if self.recordedAt < now - MAX_AGE:
                raise ValueError("recordedAt quá cũ")
        return self


def _device(c, key: str, want_type: str):
    d = c.execute(text("SELECT id, name, room_id, type FROM devices WHERE api_key_hash=:h AND status='ACTIVE'"),
                  {"h": hashlib.sha256(key.encode()).hexdigest()}).first()
    if not d:
        raise AppError(401, "INVALID_DEVICE_KEY", "Khóa thiết bị không hợp lệ hoặc thiết bị đã tắt")
    if d.type != want_type:
        raise AppError(400, "WRONG_DEVICE_TYPE", "Loại thiết bị không phù hợp với endpoint này")
    return d


@router.post("/telemetry", status_code=202, summary="FR-27: cảm biến gửi nhiệt độ/độ ẩm")
def telemetry(body: Telemetry, x_device_key: str = Header(default="")):
    ts = body.recordedAt or dt.datetime.now(dt.timezone.utc)
    with engine().begin() as c:
        d = _device(c, x_device_key, "SENSOR_NODE")
        c.execute(text("INSERT INTO sensor_readings(device_id,room_id,temperature,humidity,recorded_at) VALUES (:d,:r,:t,:h,:ts)"),
                  {"d": d.id, "r": d.room_id, "t": body.temperature, "h": body.humidity, "ts": ts})
        was_offline = presence.mark_seen(c, d.id)
        events = thresholds.evaluate(c, str(d.room_id), str(d.id), body.temperature, body.humidity, ts)
    room = str(d.room_id)                       # từ đây giao dịch đã commit: mới gửi cảnh báo, không giữ khóa DB khi RabbitMQ chậm
    thresholds.publish_alerts(events)
    if was_offline:
        presence.announce_online(d)
    prev = cache.get_snapshot(room)
    if not prev or prev.get("recordedAt", "") <= ts.isoformat():      # gói đến trễ không được ghi đè số liệu mới hơn
        cache.set_snapshot(room, {"temperature": body.temperature, "humidity": body.humidity, "recordedAt": ts.isoformat()})
    cache.touch(str(d.id), ts.isoformat())
    # NiFi gom 5 phút/bản ghi (BR-14). Gửi lỗi thì chỉ log, không làm hỏng việc nhận dữ liệu.
    publish(TELEMETRY_QUEUE, {"roomId": room, "deviceId": str(d.id), "temperature": body.temperature,
                              "humidity": body.humidity, "recordedAt": ts.isoformat()})
    return {"accepted": True}


def _parse_captured_at(value: str | None) -> dt.datetime:
    now = dt.datetime.now(dt.timezone.utc)
    if not value:
        return now
    try:
        ts = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise AppError(422, "INVALID_CAPTURED_AT", "X-Captured-At phải là thời gian ISO 8601")
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt.timezone.utc)
    if ts > now + MAX_FUTURE or ts < now - MAX_AGE:
        raise AppError(422, "INVALID_CAPTURED_AT", "X-Captured-At nằm ngoài khoảng cho phép")
    return ts


@router.post("/snapshot", status_code=202,
             summary="FR-28: camera gửi ảnh JPEG (body = ảnh, hoặc multipart field 'image'); X-Captured-At (ISO 8601) tùy chọn")
async def snapshot(request: Request, x_device_key: str = Header(default=""), x_captured_at: str | None = Header(default=None)):
    # Xác thực trước khi đọc body để khóa sai không tốn băng thông xử lý ảnh
    with engine().connect() as c:
        d = _device(c, x_device_key, "CAMERA")
    ctype = request.headers.get("content-type", "")
    if ctype.startswith("multipart/form-data"):
        form = await request.form()
        up = form.get("image")
        if up is None or not hasattr(up, "read"):
            raise AppError(422, "MISSING_IMAGE", "Thiếu trường 'image'")
        data = await up.read(snapshots.MAX_BYTES + 1)
    elif ctype.startswith("image/jpeg"):
        data = await request.body()
    else:
        raise AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ nhận ảnh JPEG")
    if len(data) > snapshots.MAX_BYTES:
        raise AppError(413, "IMAGE_TOO_LARGE", "Ảnh vượt quá 1.5 MB")
    if not data.startswith(snapshots.JPEG_MAGIC):          # không tin Content-Type: kiểm tra byte đầu của tệp
        raise AppError(415, "NOT_A_JPEG", "Dữ liệu không phải ảnh JPEG")
    captured = _parse_captured_at(x_captured_at)
    sid = snapshots.store(str(d.id), str(d.room_id), data, captured)
    with engine().begin() as c:
        was_offline = presence.mark_seen(c, d.id)
    if was_offline:
        presence.announce_online(d)
    cache.touch(str(d.id), dt.datetime.now(dt.timezone.utc).isoformat())
    return {"accepted": True, "id": sid, "bytes": len(data), "capturedAt": captured.isoformat()}

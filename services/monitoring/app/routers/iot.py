"""FR-27 – FR-29: thiết bị đẩy dữ liệu bằng HTTP + X-Device-Key (không dùng JWT)."""
import datetime as dt
import hashlib

from fastapi import APIRouter, Header
from pydantic import BaseModel
from sqlalchemy import text

from common.db import engine
from common.errors import AppError
from common.events import TELEMETRY_QUEUE
from common.rabbit import publish

from .. import cache, thresholds

router = APIRouter(prefix="/iot", tags=["iot"])


class Telemetry(BaseModel):
    temperature: float | None = None
    humidity: float | None = None
    recordedAt: dt.datetime | None = None


def _device(c, key: str):
    d = c.execute(text("SELECT id, room_id, type FROM devices WHERE api_key_hash=:h AND status='ACTIVE'"),
                  {"h": hashlib.sha256(key.encode()).hexdigest()}).first()
    if not d:
        raise AppError(401, "INVALID_DEVICE_KEY", "Khóa thiết bị không hợp lệ hoặc thiết bị đã tắt")
    return d


@router.post("/telemetry", status_code=202)
def telemetry(body: Telemetry, x_device_key: str = Header(default="")):
    ts = body.recordedAt or dt.datetime.now(dt.timezone.utc)
    with engine().begin() as c:
        d = _device(c, x_device_key)
        if d.type != "SENSOR_NODE":
            raise AppError(400, "WRONG_DEVICE_TYPE", "Thiết bị này không gửi số liệu cảm biến")
        c.execute(text("INSERT INTO sensor_readings(device_id,room_id,temperature,humidity,recorded_at) VALUES (:d,:r,:t,:h,:ts)"),
                  {"d": d.id, "r": d.room_id, "t": body.temperature, "h": body.humidity, "ts": ts})
        c.execute(text("UPDATE devices SET last_seen_at=now() WHERE id=:d"), {"d": d.id})
        thresholds.evaluate(c, str(d.room_id), str(d.id), body.temperature, body.humidity, ts)
    cache.set_snapshot(str(d.room_id), {"temperature": body.temperature, "humidity": body.humidity, "recordedAt": ts.isoformat()})
    cache.touch(str(d.id), ts.isoformat())
    # NiFi gom 5 phút/bản ghi (BR-14). Gửi lỗi thì chỉ log, không làm hỏng việc nhận dữ liệu.
    publish(TELEMETRY_QUEUE, {"roomId": str(d.room_id), "deviceId": str(d.id), "temperature": body.temperature,
                              "humidity": body.humidity, "recordedAt": ts.isoformat()})
    return {"accepted": True}

# TODO FR-28: POST /iot/snapshot (ảnh camera) – lưu file mới nhất vào volume, ghi đè bản cũ.

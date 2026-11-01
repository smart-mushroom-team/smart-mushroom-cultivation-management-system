"""FR-30, FR-31: quản lý thiết bị (Admin/Operator). Khóa thiết bị chỉ hiển thị MỘT lần (lúc tạo hoặc xoay khóa).

Quy tắc:
  * Mỗi phòng tối đa một thiết bị ACTIVE cho mỗi loại (unique index) -> 409 DEVICE_EXISTS_IN_ROOM.
  * Thiết bị INACTIVE bị từ chối khi gửi dữ liệu (401) - xem routers/iot.py.
  * Xoay khóa: khóa cũ vô hiệu ngay lập tức.
"""
import datetime as dt
import hashlib
import secrets
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from common.db import engine
from common.errors import AppError
from common.security import require_roles

from .. import core_client

router = APIRouter(prefix="/devices", tags=["devices"], dependencies=[Depends(require_roles("OPERATOR"))])
OFFLINE_FACTOR = 3          # offline = 3 x chu kỳ gửi (BR-11)
_COLS = "id,name,type,room_id,status,is_simulated,interval_sec,last_seen_at"


class DeviceIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(pattern="^(SENSOR_NODE|CAMERA)$")
    roomId: str
    intervalSec: int = Field(default=30, ge=5, le=3600)
    isSimulated: bool = False


class DevicePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    intervalSec: int | None = Field(default=None, ge=5, le=3600)
    status: str | None = Field(default=None, pattern="^(ACTIVE|INACTIVE)$")


def _new_key() -> tuple[str, str]:
    key = "mk_" + secrets.token_urlsafe(32)         # tiền tố cố định: không bao giờ bắt đầu bằng "-" (tránh bị CLI hiểu nhầm là tùy chọn)
    return key, hashlib.sha256(key.encode()).hexdigest()


def _uuid(value: str, what: str = "Thiết bị") -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise AppError(404, "NOT_FOUND", f"{what} không tồn tại")


def _view(r) -> dict:
    online = bool(r.status == "ACTIVE" and r.last_seen_at and
                  (dt.datetime.now(dt.timezone.utc) - r.last_seen_at).total_seconds() <= OFFLINE_FACTOR * r.interval_sec)
    return {"id": str(r.id), "name": r.name, "type": r.type, "roomId": str(r.room_id), "status": r.status,
            "isSimulated": r.is_simulated, "intervalSec": r.interval_sec, "online": online,
            "lastSeenAt": r.last_seen_at.isoformat() if r.last_seen_at else None}


@router.get("")
def list_devices(roomId: str | None = None, type: str | None = None):
    roomId = _uuid(roomId, "Phòng") if roomId else None
    q = (f"SELECT {_COLS} FROM devices WHERE (CAST(:r AS uuid) IS NULL OR room_id=CAST(:r AS uuid)) "
         "AND (CAST(:t AS text) IS NULL OR type=:t) ORDER BY name")
    with engine().connect() as c:
        return [_view(r) for r in c.execute(text(q), {"r": roomId, "t": type})]


@router.post("", status_code=201, summary="FR-30: tạo thiết bị; trả khóa API một lần duy nhất")
def create_device(body: DeviceIn):
    if not core_client.room_exists(body.roomId):
        raise AppError(404, "ROOM_NOT_FOUND", "Phòng không tồn tại hoặc đang ngừng hoạt động")
    key, key_hash = _new_key()
    try:
        with engine().begin() as c:
            did = c.execute(text("""INSERT INTO devices(name,type,room_id,api_key_hash,interval_sec,is_simulated)
                                    VALUES (:n,:t,:r,:h,:i,:s) RETURNING id"""),
                            {"n": body.name, "t": body.type, "r": body.roomId, "h": key_hash,
                             "i": body.intervalSec, "s": body.isSimulated}).scalar()
            if body.type == "SENSOR_NODE":
                c.execute(text("INSERT INTO room_thresholds(room_id) VALUES (:r) ON CONFLICT DO NOTHING"), {"r": body.roomId})
    except IntegrityError:
        raise AppError(409, "DEVICE_EXISTS_IN_ROOM", "Phòng này đã có thiết bị cùng loại đang hoạt động")
    return {"id": str(did), "apiKey": key, "note": "Lưu khóa này ngay, hệ thống không hiển thị lại"}


@router.patch("/{device_id}", summary="FR-31: sửa tên, chu kỳ gửi, tắt/bật thiết bị")
def update_device(device_id: str, body: DevicePatch):
    device_id = _uuid(device_id)
    try:
        with engine().begin() as c:
            cur = c.execute(text("SELECT status FROM devices WHERE id=:d FOR UPDATE"), {"d": device_id}).first()
            if cur is None:
                raise AppError(404, "DEVICE_NOT_FOUND", "Thiết bị không tồn tại")
            c.execute(text("""UPDATE devices SET name=COALESCE(:n,name), interval_sec=COALESCE(:i,interval_sec),
                              status=COALESCE(:s,status) WHERE id=:d"""),
                      {"n": body.name, "i": body.intervalSec, "s": body.status, "d": device_id})
            if body.status == "ACTIVE" and cur.status != "ACTIVE":
                # Bật lại: phải gửi dữ liệu lần đầu mới bị coi là có thể offline (không báo ngay theo last_seen cũ từ trước khi tắt)
                c.execute(text("UPDATE devices SET last_seen_at=NULL, offline_alerted_at=NULL WHERE id=:d"), {"d": device_id})
            return _view(c.execute(text(f"SELECT {_COLS} FROM devices WHERE id=:d"), {"d": device_id}).first())
    except IntegrityError:
        raise AppError(409, "DEVICE_EXISTS_IN_ROOM", "Phòng này đã có thiết bị cùng loại đang hoạt động")


@router.post("/{device_id}/rotate-key", summary="FR-31: đổi khóa API; khóa cũ hết hiệu lực ngay")
def rotate_key(device_id: str):
    device_id = _uuid(device_id)
    key, key_hash = _new_key()
    with engine().begin() as c:
        n = c.execute(text("UPDATE devices SET api_key_hash=:h WHERE id=:d"), {"h": key_hash, "d": device_id}).rowcount
    if n == 0:
        raise AppError(404, "DEVICE_NOT_FOUND", "Thiết bị không tồn tại")
    return {"id": device_id, "apiKey": key, "note": "Lưu khóa này ngay, hệ thống không hiển thị lại"}

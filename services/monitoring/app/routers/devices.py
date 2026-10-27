"""FR-30, FR-31: quản lý thiết bị (Admin/Operator). Khóa thiết bị chỉ hiển thị một lần."""
import hashlib
import secrets

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from common.db import engine
from common.security import require_roles

router = APIRouter(prefix="/devices", tags=["devices"], dependencies=[Depends(require_roles("OPERATOR"))])


class DeviceIn(BaseModel):
    name: str
    type: str               # SENSOR_NODE | CAMERA
    roomId: str
    intervalSec: int = 30
    isSimulated: bool = False


@router.get("")
def list_devices():
    with engine().connect() as c:
        rows = c.execute(text("SELECT id,name,type,room_id,status,is_simulated,interval_sec,last_seen_at FROM devices ORDER BY name"))
        return [dict(r._mapping, id=str(r.id), room_id=str(r.room_id)) for r in rows]


@router.post("", status_code=201)
def create_device(body: DeviceIn):
    key = secrets.token_urlsafe(32)
    with engine().begin() as c:
        did = c.execute(text("""INSERT INTO devices(name,type,room_id,api_key_hash,interval_sec,is_simulated)
                                VALUES (:n,:t,:r,:h,:i,:s) RETURNING id"""),
                        {"n": body.name, "t": body.type, "r": body.roomId, "h": hashlib.sha256(key.encode()).hexdigest(),
                         "i": body.intervalSec, "s": body.isSimulated}).scalar()
        c.execute(text("INSERT INTO room_thresholds(room_id) VALUES (:r) ON CONFLICT DO NOTHING"), {"r": body.roomId})
    return {"id": str(did), "apiKey": key, "note": "Lưu khóa này ngay, hệ thống không hiển thị lại"}

# TODO FR-31: POST /{id}/rotate-key, PATCH /{id} (tắt/bật thiết bị)

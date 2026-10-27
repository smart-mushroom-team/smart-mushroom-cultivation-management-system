"""FR-32 – FR-39: số liệu hiện tại, biểu đồ lịch sử, ngưỡng. Customer chỉ xem phòng của mình (BR-08, kiểm tra mỗi request)."""
import datetime as dt

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, current_user, require_roles

from .. import cache, core_client

router = APIRouter(prefix="/rooms", tags=["monitoring"])
OFFLINE_FACTOR = 3          # offline = 3 × chu kỳ gửi (BR-11)


def _authorize(room_id: str, user: CurrentUser) -> None:
    if user.role == "CUSTOMER" and not core_client.can_view_room(room_id, user.id):
        raise AppError(403, "NO_ACTIVE_RENTAL", "Bạn không có đơn thuê hiệu lực tại phòng này")


@router.get("/{room_id}/latest")
def latest(room_id: str, user: CurrentUser = Depends(current_user)):
    _authorize(room_id, user)
    snap = cache.get_snapshot(room_id)
    if snap is None:                                    # Redis trống: lấy từ DB
        with engine().connect() as c:
            r = c.execute(text("SELECT temperature,humidity,recorded_at FROM sensor_readings WHERE room_id=:r "
                               "ORDER BY recorded_at DESC LIMIT 1"), {"r": room_id}).first()
        snap = {"temperature": float(r.temperature), "humidity": float(r.humidity), "recordedAt": r.recorded_at.isoformat()} if r else None
    with engine().connect() as c:
        d = c.execute(text("SELECT last_seen_at, interval_sec FROM devices WHERE room_id=:r AND type='SENSOR_NODE' AND status='ACTIVE'"),
                      {"r": room_id}).first()
    online = bool(d and d.last_seen_at and
                  (dt.datetime.now(dt.timezone.utc) - d.last_seen_at).total_seconds() <= OFFLINE_FACTOR * d.interval_sec)
    return {"snapshot": snap, "deviceOnline": online}


@router.get("/{room_id}/chart", summary="FR-35: biểu đồ từ bảng tổng hợp do NiFi ghi")
def chart(room_id: str, hours: int = 24, user: CurrentUser = Depends(current_user)):
    _authorize(room_id, user)
    with engine().connect() as c:
        rows = c.execute(text("""SELECT window_start, avg_temp, avg_hum FROM sensor_aggregates
                                 WHERE room_id=:r AND window_start >= now() - make_interval(hours => :h)
                                 ORDER BY window_start"""), {"r": room_id, "h": min(hours, 24 * 30)})
        return [{"t": r.window_start.isoformat(), "temp": float(r.avg_temp), "hum": float(r.avg_hum)} for r in rows]


class ThresholdIn(BaseModel):
    tempMin: float
    tempMax: float
    humMin: float
    humMax: float
    consecutiveN: int = 3


@router.put("/{room_id}/thresholds", summary="FR-38: Operator/Admin đặt ngưỡng")
def set_thresholds(room_id: str, b: ThresholdIn, _=Depends(require_roles("OPERATOR"))):
    if b.tempMin >= b.tempMax or b.humMin >= b.humMax:
        raise AppError(422, "INVALID_THRESHOLD", "Giá trị nhỏ nhất phải nhỏ hơn giá trị lớn nhất")
    with engine().begin() as c:
        c.execute(text("""INSERT INTO room_thresholds(room_id,temp_min,temp_max,hum_min,hum_max,consecutive_n)
                          VALUES (:r,:a,:b,:c,:d,:n) ON CONFLICT (room_id) DO UPDATE SET temp_min=:a,temp_max=:b,
                          hum_min=:c,hum_max=:d,consecutive_n=:n"""),
                  {"r": room_id, "a": b.tempMin, "b": b.tempMax, "c": b.humMin, "d": b.humMax, "n": b.consecutiveN})
    return {"ok": True}

# TODO FR-33/34: GET /{room_id}/camera/latest (ảnh mới nhất, cùng kiểm tra quyền)

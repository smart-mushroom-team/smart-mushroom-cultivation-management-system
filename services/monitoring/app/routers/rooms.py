"""FR-32 – FR-39: số liệu hiện tại, biểu đồ lịch sử, ngưỡng. Customer chỉ xem phòng của mình (BR-08, kiểm tra mỗi request)."""
import datetime as dt

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, current_user, require_roles

from .. import cache, core_client, snapshots

router = APIRouter(prefix="/rooms", tags=["monitoring"])
TZ7 = dt.timezone(dt.timedelta(hours=7))
OFFLINE_FACTOR = 3          # offline = 3 × chu kỳ gửi (BR-11)


def _access(room_id: str, user: CurrentUser) -> tuple[str, dt.datetime | None]:
    """Trả (room_id chuẩn, mốc thời gian sớm nhất được xem). Operator/Admin: không giới hạn. Customer: từ ngày bắt đầu
    đơn thuê hiệu lực của họ (múi giờ UTC+7), để không xem được ảnh phòng thời người thuê trước (BR-08)."""
    room_id = snapshots.valid_room_id(room_id)               # UUID sai -> 404, không để lọt xuống SQL hay tên tệp
    if user.role != "CUSTOMER":
        return room_id, None
    acc = core_client.room_access(room_id, user.id)
    if not acc.get("allowed"):
        raise AppError(403, "NO_ACTIVE_RENTAL", "Bạn không có đơn thuê hiệu lực tại phòng này")
    since = acc.get("since")
    start = dt.datetime.combine(dt.date.fromisoformat(since), dt.time.min, tzinfo=TZ7) if since else None
    return room_id, start


def _authorize(room_id: str, user: CurrentUser) -> str:
    return _access(room_id, user)[0]


@router.get("/{room_id}/latest")
def latest(room_id: str, user: CurrentUser = Depends(current_user)):
    room_id = _authorize(room_id, user)
    snap = cache.get_snapshot(room_id)
    if snap is None:                                    # Redis trống: lấy từ DB
        with engine().connect() as c:
            r = c.execute(text("SELECT temperature,humidity,recorded_at FROM sensor_readings WHERE room_id=:r "
                               "ORDER BY recorded_at DESC LIMIT 1"), {"r": room_id}).first()
        snap = {"temperature": None if r.temperature is None else float(r.temperature),
                "humidity": None if r.humidity is None else float(r.humidity),
                "recordedAt": r.recorded_at.isoformat()} if r else None
    with engine().connect() as c:
        d = c.execute(text("SELECT last_seen_at, interval_sec FROM devices WHERE room_id=:r AND type='SENSOR_NODE' AND status='ACTIVE'"),
                      {"r": room_id}).first()
    online = bool(d and d.last_seen_at and
                  (dt.datetime.now(dt.timezone.utc) - d.last_seen_at).total_seconds() <= OFFLINE_FACTOR * d.interval_sec)
    return {"snapshot": snap, "deviceOnline": online}


@router.get("/{room_id}/chart", summary="FR-35: biểu đồ từ bảng tổng hợp 5 phút do NiFi ghi")
def chart(room_id: str, hours: int = 24, user: CurrentUser = Depends(current_user)):
    """Mỗi điểm là một cửa sổ 5 phút (UTC). temp/hum là null nếu cửa sổ đó không có giá trị tương ứng; n là số lần đo trong cửa sổ."""
    room_id = _authorize(room_id, user)
    with engine().connect() as c:
        rows = c.execute(text("""SELECT window_start, avg_temp, avg_hum, min_temp, max_temp, min_hum, max_hum, sample_count
                                 FROM sensor_aggregates
                                 WHERE room_id=:r AND window_start >= now() - make_interval(hours => :h)
                                 ORDER BY window_start"""), {"r": room_id, "h": max(1, min(hours, 24 * 30))})
        f = lambda v: None if v is None else float(v)       # noqa: E731
        return [{"t": r.window_start.isoformat(), "temp": f(r.avg_temp), "hum": f(r.avg_hum),
                 "tempMin": f(r.min_temp), "tempMax": f(r.max_temp), "humMin": f(r.min_hum), "humMax": f(r.max_hum),
                 "n": r.sample_count} for r in rows]


class ThresholdIn(BaseModel):
    tempMin: float = Field(ge=-40, le=85)
    tempMax: float = Field(ge=-40, le=85)
    humMin: float = Field(ge=0, le=100)
    humMax: float = Field(ge=0, le=100)
    consecutiveN: int = Field(default=3, ge=1, le=100)


DEFAULT_THRESHOLDS = {"tempMin": 20.0, "tempMax": 30.0, "humMin": 70.0, "humMax": 95.0, "consecutiveN": 3}      # khớp DEFAULT của room_thresholds


@router.get("/{room_id}/thresholds", summary="Ngưỡng hiện tại của phòng, kèm việc phòng đang trong đợt cảnh báo hay không")
def get_thresholds(room_id: str, _=Depends(require_roles("OPERATOR"))):
    """`configured=false`: phòng chưa có dòng ngưỡng (chưa có thiết bị nào và chưa ai đặt), trả giá trị mặc định và CHƯA có cảnh báo nào
    được đánh giá cho phòng này. Lưu ngưỡng (PUT) hoặc thêm thiết bị vào phòng thì cảnh báo bắt đầu hoạt động."""
    room_id = snapshots.valid_room_id(room_id)
    with engine().connect() as c:
        r = c.execute(text("SELECT temp_min,temp_max,hum_min,hum_max,consecutive_n,temp_alerting,hum_alerting "
                           "FROM room_thresholds WHERE room_id=:r"), {"r": room_id}).first()
    if r is None:
        return {**DEFAULT_THRESHOLDS, "configured": False, "alerting": {"temp": False, "hum": False}}
    return {"tempMin": float(r.temp_min), "tempMax": float(r.temp_max), "humMin": float(r.hum_min), "humMax": float(r.hum_max),
            "consecutiveN": r.consecutive_n, "configured": True, "alerting": {"temp": r.temp_alerting, "hum": r.hum_alerting}}


@router.put("/{room_id}/thresholds", summary="FR-38: Operator/Admin đặt ngưỡng")
def set_thresholds(room_id: str, b: ThresholdIn, _=Depends(require_roles("OPERATOR"))):
    room_id = snapshots.valid_room_id(room_id)
    if b.tempMin >= b.tempMax or b.humMin >= b.humMax:
        raise AppError(422, "INVALID_THRESHOLD", "Giá trị nhỏ nhất phải nhỏ hơn giá trị lớn nhất")
    with engine().begin() as c:
        # Đổi ngưỡng thì xóa bộ đếm và cờ cảnh báo: các lần đọc trước đó được đánh giá theo ngưỡng cũ, không còn ý nghĩa
        c.execute(text("""INSERT INTO room_thresholds(room_id,temp_min,temp_max,hum_min,hum_max,consecutive_n)
                          VALUES (:r,:a,:b,:c,:d,:n) ON CONFLICT (room_id) DO UPDATE SET temp_min=:a,temp_max=:b,
                          hum_min=:c,hum_max=:d,consecutive_n=:n,temp_breach_cnt=0,hum_breach_cnt=0,
                          temp_alerting=false,hum_alerting=false"""),
                  {"r": room_id, "a": b.tempMin, "b": b.tempMax, "c": b.humMin, "d": b.humMax, "n": b.consecutiveN})
    return {"ok": True}

_SNAP_Q = """SELECT s.id, s.image_path, s.size_bytes, s.captured_at
              FROM camera_snapshots s JOIN devices d ON d.id=s.device_id
              WHERE s.room_id=:r AND d.room_id=:r AND d.type='CAMERA' AND d.deleted_at IS NULL
                AND (CAST(:since AS timestamptz) IS NULL OR s.captured_at >= :since)
                AND (CAST(:slot AS integer) IS NULL OR d.camera_slot=:slot)"""


def _image(row) -> FileResponse:
    path = snapshots.abs_path(row.image_path)
    if not path.exists():
        raise AppError(404, "NO_SNAPSHOT", "Ảnh không còn trên máy chủ")
    return FileResponse(path, media_type="image/jpeg",
                        headers={"Cache-Control": "no-store", "X-Captured-At": row.captured_at.isoformat(),
                                 "X-Snapshot-Id": str(row.id)})


@router.get("/{room_id}/camera/latest", responses={200: {"content": {"image/jpeg": {}}}})
def camera_latest(room_id: str, cameraSlot: int | None = Query(default=None, ge=1, le=2),
                  user: CurrentUser = Depends(current_user)):
    room_id, since = _access(room_id, user)
    with engine().connect() as c:
        row = c.execute(text(_SNAP_Q + " ORDER BY s.captured_at DESC, s.created_at DESC, s.id DESC LIMIT 1"),
                        {"r": room_id, "since": since, "slot": cameraSlot}).first()
    if not row:
        raise AppError(404, "NO_SNAPSHOT", "Camera chưa có ảnh")
    return _image(row)


@router.get("/{room_id}/camera/snapshots", summary="Lịch sử ảnh theo camera; phân trang 16 ảnh")
def camera_history(room_id: str, cameraSlot: int | None = Query(default=None, ge=1, le=2),
                   page: int = Query(default=1, ge=1), limit: int = Query(default=16, ge=1, le=100),
                   user: CurrentUser = Depends(current_user)):
    room_id, since = _access(room_id, user)
    params = {"r": room_id, "since": since, "slot": cameraSlot, "n": limit, "offset": (page-1)*limit}
    with engine().connect() as c:
        total = c.execute(text("SELECT count(*) FROM (" + _SNAP_Q + ") x"), params).scalar_one()
        rows = c.execute(text(_SNAP_Q + " ORDER BY s.captured_at DESC, s.created_at DESC, s.id DESC LIMIT :n OFFSET :offset"), params)
        items = [{"id": str(r.id), "capturedAt": r.captured_at.isoformat(), "sizeBytes": r.size_bytes} for r in rows]
    return {"items": items, "page": page, "total": total, "totalPages": max(1, (total+limit-1)//limit),
            "retentionHours": snapshots.retention_hours()}


@router.get("/{room_id}/camera/snapshots/{snapshot_id}", responses={200: {"content": {"image/jpeg": {}}}})
def camera_snapshot(room_id: str, snapshot_id: str, user: CurrentUser = Depends(current_user)):
    room_id, since = _access(room_id, user)
    sid = snapshots.valid_uuid(snapshot_id, "Ảnh")
    with engine().connect() as c:
        row = c.execute(text(_SNAP_Q + " AND s.id=:i"),
                        {"r": room_id, "since": since, "slot": None, "i": sid}).first()
    if not row:
        raise AppError(404, "NO_SNAPSHOT", "Ảnh không tồn tại")
    return _image(row)

"""FR-32 – FR-39: số liệu hiện tại, biểu đồ lịch sử, ngưỡng. Customer chỉ xem phòng của mình (BR-08, kiểm tra mỗi request)."""
import datetime as dt

from fastapi import APIRouter, Depends, Query
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


@router.get("/{room_id}/chart", summary="FR-35: biểu đồ từ bảng tổng hợp do NiFi ghi")
def chart(room_id: str, hours: int = 24, user: CurrentUser = Depends(current_user)):
    room_id = _authorize(room_id, user)
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
    room_id = snapshots.valid_room_id(room_id)
    if b.tempMin >= b.tempMax or b.humMin >= b.humMax:
        raise AppError(422, "INVALID_THRESHOLD", "Giá trị nhỏ nhất phải nhỏ hơn giá trị lớn nhất")
    with engine().begin() as c:
        c.execute(text("""INSERT INTO room_thresholds(room_id,temp_min,temp_max,hum_min,hum_max,consecutive_n)
                          VALUES (:r,:a,:b,:c,:d,:n) ON CONFLICT (room_id) DO UPDATE SET temp_min=:a,temp_max=:b,
                          hum_min=:c,hum_max=:d,consecutive_n=:n"""),
                  {"r": room_id, "a": b.tempMin, "b": b.tempMax, "c": b.humMin, "d": b.humMax, "n": b.consecutiveN})
    return {"ok": True}

_SNAP_Q = """SELECT id, image_path, size_bytes, captured_at FROM camera_snapshots
              WHERE room_id=:r AND (CAST(:since AS timestamptz) IS NULL OR captured_at >= :since)"""


def _image(row) -> FileResponse:
    path = snapshots.abs_path(row.image_path)
    if not path.exists():                                         # volume bị xóa/mất: metadata còn nhưng file không còn
        raise AppError(404, "NO_SNAPSHOT", "Ảnh không còn trên máy chủ")
    return FileResponse(path, media_type="image/jpeg",
                        headers={"Cache-Control": "no-store", "X-Captured-At": row.captured_at.isoformat(),
                                 "X-Snapshot-Id": str(row.id)})


@router.get("/{room_id}/camera/latest", summary="FR-33: ảnh camera mới nhất (cùng kiểm tra quyền như số liệu, BR-08)",
            responses={200: {"content": {"image/jpeg": {}}}})
def camera_latest(room_id: str, user: CurrentUser = Depends(current_user)):
    room_id, since = _access(room_id, user)
    with engine().connect() as c:
        row = c.execute(text(_SNAP_Q + " ORDER BY captured_at DESC, created_at DESC LIMIT 1"), {"r": room_id, "since": since}).first()
    if not row:
        raise AppError(404, "NO_SNAPSHOT", "Chưa có ảnh từ camera của phòng này")
    return _image(row)


@router.get("/{room_id}/camera/snapshots", summary="Lịch sử ảnh (metadata), mới nhất trước; phân trang bằng `before`")
def camera_history(room_id: str, limit: int = Query(default=48, ge=1, le=200), before: dt.datetime | None = None,
                   user: CurrentUser = Depends(current_user)):
    room_id, since = _access(room_id, user)
    if before is not None and before.tzinfo is None:
        before = before.replace(tzinfo=dt.timezone.utc)
    with engine().connect() as c:
        rows = c.execute(text(_SNAP_Q + " AND (CAST(:before AS timestamptz) IS NULL OR captured_at < :before) "
                                        "ORDER BY captured_at DESC, created_at DESC LIMIT :n"),
                         {"r": room_id, "since": since, "before": before, "n": limit})
        items = [{"id": str(r.id), "capturedAt": r.captured_at.isoformat(), "sizeBytes": r.size_bytes} for r in rows]
    return {"items": items, "nextBefore": items[-1]["capturedAt"] if len(items) == limit else None,
            "retentionHours": snapshots.retention_hours()}


@router.get("/{room_id}/camera/snapshots/{snapshot_id}", summary="Một ảnh trong lịch sử",
            responses={200: {"content": {"image/jpeg": {}}}})
def camera_snapshot(room_id: str, snapshot_id: str, user: CurrentUser = Depends(current_user)):
    room_id, since = _access(room_id, user)
    sid = snapshots.valid_uuid(snapshot_id, "Ảnh")
    with engine().connect() as c:
        row = c.execute(text(_SNAP_Q + " AND id=:i"), {"r": room_id, "since": since, "i": sid}).first()
    if not row:                                    # ảnh của phòng khác hoặc trước ngày thuê cũng trả 404, không lộ sự tồn tại
        raise AppError(404, "NO_SNAPSHOT", "Ảnh không tồn tại")
    return _image(row)

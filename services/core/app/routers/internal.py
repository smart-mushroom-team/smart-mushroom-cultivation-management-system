"""Endpoint nội bộ (không qua Gateway, bảo vệ bằng khóa dịch vụ - NFR-06)."""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import text

from common.db import engine
from common.security import require_service_key

from .. import clock

router = APIRouter(prefix="/internal", tags=["internal"], dependencies=[Depends(require_service_key)],
                   include_in_schema=False)


@router.get("/access/rooms/{room_id}")
def room_access(room_id: str, customerId: str):
    """BR-08: Customer xem được phòng khi có khay thuộc đơn ACTIVE còn hạn của mình. Monitoring gọi ở MỖI request, không cache.
    `since` = ngày bắt đầu sớm nhất trong các đơn hiệu lực đó: Monitoring chỉ cho xem ảnh chụp từ ngày này trở đi,
    để khách mới không xem được ảnh phòng thời người thuê trước."""
    with engine().connect() as c:
        since = c.execute(text("""
            SELECT min(r.start_date) FROM rentals r JOIN rental_trays rt ON rt.rental_id=r.id AND rt.is_active
                 JOIN trays t ON t.id=rt.tray_id
            WHERE r.customer_id=:c AND r.status='ACTIVE' AND r.end_date >= :today AND t.room_id=:room"""),
                         {"c": customerId, "today": clock.today(), "room": room_id}).scalar()
    return {"allowed": since is not None, "since": since.isoformat() if since else None,
            "reason": None if since else "Đơn thuê đã hết hạn hoặc không thuộc phòng này"}


@router.get("/rooms/{room_id}")
def room_info(room_id: str):
    """Monitoring dùng khi tạo thiết bị: phòng có tồn tại và đang ACTIVE không (không có FK liên DB, BR-16)."""
    try:
        uuid.UUID(room_id)
    except ValueError:
        return {"exists": False, "active": False}
    with engine().connect() as c:
        st = c.execute(text("SELECT status FROM rooms WHERE id=:i"), {"i": room_id}).scalar()
    return {"exists": st is not None, "active": st == "ACTIVE"}


@router.get("/access/camera/cycles/{cycle_id}")
def cycle_camera_access(cycle_id: str, customerId: str, roomId: str):
    """Quyền ảnh theo đúng cycle + customer + phòng, không tin cameraSlot từ client."""
    try:
        uuid.UUID(cycle_id)
        uuid.UUID(customerId)
        uuid.UUID(roomId)
    except ValueError:
        return {"allowed": False}
    with engine().connect() as c:
        row = c.execute(text("""
            SELECT t.location_row, r.start_date
            FROM cultivation_cycles cc
            JOIN rentals r ON r.id=cc.rental_id
            JOIN rental_trays rt ON rt.rental_id=cc.rental_id AND rt.tray_id=cc.tray_id
            JOIN trays t ON t.id=cc.tray_id
            WHERE cc.id=:cycle AND r.customer_id=:customer AND t.room_id=:room
              AND rt.is_active AND r.status='ACTIVE'
              AND r.start_date <= :today AND r.end_date >= :today
            LIMIT 1
        """), {"cycle": cycle_id, "customer": customerId, "room": roomId, "today": clock.today()}).first()
    if row is None or row.location_row not in (1, 2, 3, 4):
        return {"allowed": False}
    return {"allowed": True, "cameraSlot": 1 if row.location_row <= 2 else 2,
            "row": row.location_row, "since": row.start_date.isoformat()}

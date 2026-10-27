"""Endpoint nội bộ (không qua Gateway, bảo vệ bằng khóa dịch vụ - NFR-06)."""
from fastapi import APIRouter, Depends
from sqlalchemy import text

from common.db import engine
from common.security import require_service_key

from .. import clock

router = APIRouter(prefix="/internal", tags=["internal"], dependencies=[Depends(require_service_key)],
                   include_in_schema=False)


@router.get("/access/rooms/{room_id}")
def room_access(room_id: str, customerId: str):
    """BR-08: Customer xem được phòng khi có khay thuộc đơn ACTIVE còn hạn của mình. Monitoring gọi ở MỖI request, không cache."""
    with engine().connect() as c:
        ok = c.execute(text("""
            SELECT 1 FROM rentals r JOIN rental_trays rt ON rt.rental_id=r.id AND rt.is_active
                 JOIN trays t ON t.id=rt.tray_id
            WHERE r.customer_id=:c AND r.status='ACTIVE' AND r.end_date >= :today AND t.room_id=:room LIMIT 1"""),
                       {"c": customerId, "today": clock.today(), "room": room_id}).first()
    return {"allowed": ok is not None, "reason": None if ok else "Đơn thuê đã hết hạn hoặc không thuộc phòng này"}

"""FR-17 – FR-20: Khay của tôi, cập nhật tiến độ, thu hoạch, loại bỏ. Khung - cần hoàn thiện.

Quy tắc (BR-06):
  * stage chỉ tiến từng bước SEEDING -> INCUBATING -> FRUITING -> READY (kiểm tra trong code).
  * thu hoạch chỉ khi stage in (FRUITING, READY): ghi harvested_at, weight_kg, note; status = HARVESTED.
  * SEEDING/INCUBATING chỉ loại bỏ được: bắt buộc discard_reason; status = DISCARDED.
  * Sau khi thu hoạch/loại bỏ: gọi lifecycle.try_complete(conn, rental_id) trong cùng giao dịch (FR-24).
  * Mỗi thay đổi tạo notification cho khách (dedupeKey = f"CYCLE:{cycle_id}:{event}") và push FCM sau commit.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text

from common.db import engine
from common.security import CurrentUser, require_roles

router = APIRouter(tags=["cultivation"])


@router.get("/my-trays", summary="FR-17: Khay của tôi")
def my_trays(user: CurrentUser = Depends(require_roles("CUSTOMER"))):
    with engine().connect() as c:
        rows = c.execute(text("""
            SELECT t.id, t.tray_code, t.room_id, t.location_row, t.location_shelf, t.location_slot,
                   r.end_date, cc.stage, cc.status AS cycle_status, cc.expected_harvest_date
            FROM rentals r JOIN rental_trays rt ON rt.rental_id=r.id AND rt.is_active
                 JOIN trays t ON t.id=rt.tray_id
                 LEFT JOIN cultivation_cycles cc ON cc.rental_id=r.id AND cc.tray_id=t.id
            WHERE r.customer_id=:u AND r.status='ACTIVE' ORDER BY t.tray_code"""), {"u": user.id})
        return [{k: (str(v) if k in ("id", "room_id") else v) for k, v in r._mapping.items()} for r in rows]


# TODO FR-18: GET /cycles (Operator: khay đang thuê kèm khách, hạn thuê) và PATCH /cycles/{id} (stage, variety, expectedHarvestDate, note)
# TODO FR-19: POST /cycles/{id}/harvest
# TODO FR-20: POST /cycles/{id}/discard

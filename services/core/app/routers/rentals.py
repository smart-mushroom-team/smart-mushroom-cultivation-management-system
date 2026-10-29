"""FR-12 / UC-02: thuê khay. Chọn khay + thanh toán mô phỏng + kích hoạt đơn + tạo đợt nuôi đầu tiên
trong MỘT giao dịch cơ sở dữ liệu (BR-01, BR-04, BR-05). Đơn ACTIVE ngay, không có bước Operator xác nhận (v2.4)."""
import datetime as dt

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, require_roles

from .. import clock, notify

router = APIRouter(prefix="/rentals", tags=["rentals"])


class RentalIn(BaseModel):
    packageId: str
    trayCount: int = Field(gt=0, le=50)


def simulate_payment(amount) -> bool:
    """Thanh toán mô phỏng (SRS 2.7). Đổi thành False/ngẫu nhiên để test luồng thất bại UC-02 4b."""
    return True


def pick_trays(c, n: int) -> list[str]:
    """Chọn n khay AVAILABLE, ưu tiên cùng một phòng. FOR UPDATE SKIP LOCKED: hai đơn đồng thời không bao giờ nhận cùng khay."""
    room = c.execute(text("""SELECT t.room_id FROM trays t JOIN rooms r ON r.id=t.room_id
                             WHERE t.occupancy_status='AVAILABLE' AND r.status='ACTIVE'
                             GROUP BY t.room_id HAVING count(*) >= :n ORDER BY count(*) LIMIT 1"""), {"n": n}).scalar()
    base = "SELECT t.id FROM trays t JOIN rooms r ON r.id=t.room_id WHERE t.occupancy_status='AVAILABLE' AND r.status='ACTIVE'"
    if room:
        ids = c.execute(text(base + " AND t.room_id=:r ORDER BY t.tray_code LIMIT :n FOR UPDATE OF t SKIP LOCKED"),
                        {"r": room, "n": n}).scalars().all()
        if len(ids) == n:
            return [str(i) for i in ids]
    ids = c.execute(text(base + " ORDER BY t.room_id, t.tray_code LIMIT :n FOR UPDATE OF t SKIP LOCKED"), {"n": n}).scalars().all()
    return [str(i) for i in ids]


@router.post("", status_code=201, summary="FR-12: Customer thuê khay")
def create_rental(body: RentalIn, user: CurrentUser = Depends(require_roles("CUSTOMER"))):
    try:
        return _create_rental(body, user)
    except IntegrityError as e:
        # Lớp bảo vệ cuối của BR-01 (unique index một-khay-một-đơn-hiệu-lực) vừa chặn một xung đột: trả 409 thay vì 500.
        if "rental_trays_one_active_per_tray" in str(e.orig):
            raise AppError(409, "TRAY_CONFLICT", "Khay vừa được người khác thuê, vui lòng thử lại")
        raise


def _create_rental(body: RentalIn, user: CurrentUser):
    start = clock.today()
    with engine().begin() as c:
        pkg = c.execute(text("SELECT id,name,duration_days,price_per_tray FROM rental_packages WHERE id=:i AND is_active"),
                        {"i": body.packageId}).first()
        if not pkg:
            raise AppError(404, "PACKAGE_NOT_FOUND", "Gói thuê không tồn tại hoặc đã tắt")
        tray_ids = pick_trays(c, body.trayCount)
        if len(tray_ids) < body.trayCount:
            raise AppError(409, "NOT_ENOUGH_TRAYS", "Không đủ khay trống")          # UC-02 4a: rollback, không giữ khay nào
        total = pkg.price_per_tray * body.trayCount
        if not simulate_payment(total):
            raise AppError(402, "PAYMENT_FAILED", "Thanh toán thất bại")            # UC-02 4b
        end = start + dt.timedelta(days=pkg.duration_days - 1)                      # BR-05: tính cả hai đầu mút
        rid = c.execute(text("""INSERT INTO rentals(customer_id,customer_name,package_id,package_name,duration_days,
                                    price_per_tray,tray_count,total_amount,start_date,end_date)
                                VALUES (:cid,:cn,:pid,:pn,:dd,:pp,:tc,:ta,:s,:e) RETURNING id"""),
                        {"cid": user.id, "cn": user.name, "pid": pkg.id, "pn": pkg.name, "dd": pkg.duration_days,
                         "pp": pkg.price_per_tray, "tc": body.trayCount, "ta": total, "s": start, "e": end}).scalar()
        for tid in tray_ids:
            c.execute(text("INSERT INTO rental_trays(rental_id,tray_id) VALUES (:r,:t)"), {"r": rid, "t": tid})
            c.execute(text("INSERT INTO cultivation_cycles(rental_id,tray_id,start_date) VALUES (:r,:t,:s)"),
                      {"r": rid, "t": tid, "s": start})
        c.execute(text("UPDATE trays SET occupancy_status='RENTED' WHERE id = ANY(CAST(:ids AS uuid[]))"), {"ids": tray_ids})
        c.execute(text("INSERT INTO transactions(rental_id,amount) VALUES (:r,:a)"), {"r": rid, "a": total})
        notify.create(c, type="RENTAL_CREATED", title="Thuê khay thành công",
                      content=f"{body.trayCount} khay, đến hết {end:%d/%m/%Y}", dedupe_key=f"RENTAL_CREATED:{rid}",
                      user_id=user.id, data={"rentalId": str(rid)})
        notify.create(c, type="NEW_RENTAL", title="Có đơn thuê mới",                 # Operator chuẩn bị khay (rủi ro bỏ xác nhận)
                      content=f"{user.name} thuê {body.trayCount} khay", dedupe_key=f"NEW_RENTAL:{rid}",
                      staff=True, data={"rentalId": str(rid)})
    notify.push_to_user(user.id, "Thuê khay thành công", f"{body.trayCount} khay, đến hết {end:%d/%m/%Y}")   # sau commit (BR-18)
    return {"id": str(rid), "status": "ACTIVE", "startDate": start.isoformat(), "endDate": end.isoformat(),
            "totalAmount": float(total), "trayIds": tray_ids}


@router.get("/mine", summary="BR-02: chỉ đơn của chính khách")
def my_rentals(user: CurrentUser = Depends(require_roles("CUSTOMER"))):
    with engine().connect() as c:
        rows = c.execute(text("SELECT id,package_name,tray_count,status,start_date,end_date FROM rentals "
                              "WHERE customer_id=:u ORDER BY created_at DESC"), {"u": user.id})
        return [dict(r._mapping, id=str(r.id)) for r in rows]

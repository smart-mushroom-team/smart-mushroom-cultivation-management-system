"""FR-12 / UC-02: thuê khay. Chọn khay + thanh toán mô phỏng + kích hoạt đơn + tạo đợt nuôi đầu tiên
trong MỘT giao dịch cơ sở dữ liệu (BR-01, BR-04, BR-05). Đơn ACTIVE ngay, không có bước Operator xác nhận (v2.4)."""
import datetime as dt

from fastapi import APIRouter, Depends
from pydantic import Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, require_roles

from .. import clock, notify, variety

router = APIRouter(prefix="/rentals", tags=["rentals"])


class RentalIn(variety.VarietyChoice):
    packageId: str
    trayCount: int | None = Field(default=None, gt=0, le=32)
    roomId: str | None = None
    trayIds: list[str] | None = Field(default=None, min_length=1, max_length=32)

    @model_validator(mode="after")
    def validate_selection(self):
        if self.trayIds is not None:
            if not self.roomId or len(self.trayIds) != len(set(self.trayIds)):
                raise ValueError("Cần roomId và danh sách trayIds không trùng")
            if self.trayCount is not None and self.trayCount != len(self.trayIds):
                raise ValueError("trayCount không khớp trayIds")
        elif self.trayCount is None:
            raise ValueError("Cần trayIds hoặc trayCount")
        return self


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
        v_name, v_id, v_status = variety.resolve(c, body)
        # Catalog varieties require a package explicitly assigned to them.
        # Custom varieties (not in catalog) can only use GENERAL packages.
        scope = c.execute(text('SELECT package_scope FROM rental_packages WHERE id=:i'),{'i':pkg.id}).scalar()
        if v_id:
            matched=c.execute(text('SELECT 1 FROM rental_package_varieties WHERE package_id=:p AND variety_id=CAST(:v AS uuid)'),{'p':pkg.id,'v':v_id}).scalar()
            if scope!='VARIETY' or not matched:
                raise AppError(409,'PACKAGE_VARIETY_MISMATCH','Giống trong danh mục cần chọn gói dành riêng cho giống đó')
        elif scope!='GENERAL':
            raise AppError(409,'PACKAGE_VARIETY_MISMATCH','Giống tự nhập chỉ được chọn gói thuê chung')
        if body.trayIds is not None:
            # Lock theo thứ tự ổn định để tránh deadlock giữa các đơn cùng chọn khay.
            tray_ids = sorted(body.trayIds)
            selected = c.execute(text("""SELECT t.id FROM trays t JOIN rooms r ON r.id=t.room_id
                WHERE t.id = ANY(CAST(:ids AS uuid[])) AND t.room_id=CAST(:room AS uuid)
                  AND t.occupancy_status='AVAILABLE' AND r.status='ACTIVE'
                ORDER BY t.id FOR UPDATE OF t"""), {"ids": tray_ids, "room": body.roomId}).scalars().all()
            if len(selected) != len(tray_ids):
                raise AppError(409, "TRAY_CONFLICT", "Một số khay không thuộc phòng đã chọn hoặc đã được thuê")
        else:
            # Tương thích client Flutter cũ; sau khi cập nhật mobile sẽ bỏ chế độ tự chọn.
            tray_ids = pick_trays(c, body.trayCount)
            if tray_ids:
                room_count = c.execute(text("SELECT count(DISTINCT room_id) FROM trays WHERE id = ANY(CAST(:ids AS uuid[]))"), {"ids": tray_ids}).scalar()
                if room_count != 1:
                    raise AppError(409, "SINGLE_ROOM_REQUIRED", "Không đủ khay trống trong cùng một phòng")
        quantity = len(tray_ids)
        if quantity < (len(body.trayIds) if body.trayIds is not None else body.trayCount):
            raise AppError(409, "NOT_ENOUGH_TRAYS", "Không đủ khay trống")          # UC-02 4a: rollback, không giữ khay nào
        actual_room_id = body.roomId or str(c.execute(text("SELECT room_id FROM trays WHERE id=CAST(:i AS uuid)"), {"i": tray_ids[0]}).scalar())
        total = pkg.price_per_tray * quantity
        if not simulate_payment(total):
            raise AppError(402, "PAYMENT_FAILED", "Thanh toán thất bại")            # UC-02 4b
        end = start + dt.timedelta(days=pkg.duration_days - 1)                      # BR-05: tính cả hai đầu mút
        policy_version=c.execute(text('SELECT max(version) FROM rental_policies')).scalar()
        rid = c.execute(text("""INSERT INTO rentals(customer_id,customer_name,package_id,package_name,duration_days,
                                    price_per_tray,tray_count,total_amount,start_date,end_date,room_id,policy_version)
                                VALUES (:cid,:cn,:pid,:pn,:dd,:pp,:tc,:ta,:s,:e,CAST(:room AS uuid),:policy) RETURNING id"""),
                        {"cid": user.id, "cn": user.name, "pid": pkg.id, "pn": pkg.name, "dd": pkg.duration_days,
                         "pp": pkg.price_per_tray, "tc": quantity, "ta": total, "s": start, "e": end, "room": actual_room_id,"policy":policy_version}).scalar()
        for tid in tray_ids:
            c.execute(text("INSERT INTO rental_trays(rental_id,tray_id) VALUES (:r,:t)"), {"r": rid, "t": tid})
            c.execute(text("INSERT INTO cultivation_cycles(rental_id,tray_id,start_date,variety,variety_id,variety_status) "
                           "VALUES (:r,:t,:s,:v,CAST(:vi AS uuid),:vs)"),
                      {"r": rid, "t": tid, "s": start, "v": v_name, "vi": v_id, "vs": v_status})
        c.execute(text("UPDATE trays SET occupancy_status='RENTED' WHERE id = ANY(CAST(:ids AS uuid[]))"), {"ids": tray_ids})
        c.execute(text("INSERT INTO transactions(rental_id,amount) VALUES (:r,:a)"), {"r": rid, "a": total})
        notify.create(c, type="RENTAL_CREATED", title="Thuê khay thành công",
                      content=f"{quantity} khay, đến hết {end:%d/%m/%Y}", dedupe_key=f"RENTAL_CREATED:{rid}",
                      user_id=user.id, data={"rentalId": str(rid)})
        notify.create(c, type="NEW_RENTAL", title="Có đơn thuê mới",                 # Operator chuẩn bị khay (rủi ro bỏ xác nhận)
                      content=f"{user.name} thuê {quantity} khay", dedupe_key=f"NEW_RENTAL:{rid}",
                      staff=True, data={"rentalId": str(rid)})
        if v_status == "PENDING":
            notify.create(c, type="VARIETY_PENDING", title="Có giống nấm chờ duyệt",
                          content=f"{user.name} chọn giống \"{v_name}\" cho {quantity} khay", dedupe_key=f"VARIETY_PENDING:{rid}",
                          staff=True, data={"rentalId": str(rid)})
    notify.push_to_user(user.id, "Thuê khay thành công", f"{quantity} khay, đến hết {end:%d/%m/%Y}")   # sau commit (BR-18)
    notify.push_to_staff("Có đơn thuê mới", f"{user.name} thuê {quantity} khay", {"type": "NEW_RENTAL", "rentalId": str(rid)})
    if v_status == "PENDING":
        notify.push_to_staff("Có giống nấm chờ duyệt", f"{user.name} chọn giống \"{v_name}\"", {"type": "VARIETY_PENDING", "rentalId": str(rid)})
    return {"id": str(rid), "status": "ACTIVE", "startDate": start.isoformat(), "endDate": end.isoformat(),
            "totalAmount": float(total), "trayIds": tray_ids, "roomId": actual_room_id, "variety": v_name, "varietyStatus": v_status}


@router.get("/mine", summary="BR-02: chỉ đơn của chính khách")
def my_rentals(user: CurrentUser = Depends(require_roles("CUSTOMER"))):
    with engine().connect() as c:
        rows = c.execute(text("SELECT id,package_name,tray_count,status,start_date,end_date,duration_days,price_per_tray,total_amount,created_at,"
                              "(SELECT count(*) FROM cultivation_cycles cc WHERE cc.rental_id=rentals.id AND cc.status='GROWING') AS growing_count "
                              "FROM rentals WHERE customer_id=:u ORDER BY created_at DESC"), {"u": user.id})
        return [dict(r._mapping, id=str(r.id)) for r in rows]


@router.get('/all', summary='Admin: tất cả đơn thuê')
def all_rentals(_=Depends(require_roles('ADMIN'))):
    with engine().connect() as c:
        rows=c.execute(text('SELECT id,customer_name,package_name,tray_count,status,start_date,end_date,total_amount FROM rentals ORDER BY created_at DESC'))
        return [dict(r._mapping, id=str(r.id), start_date=r.start_date.isoformat(), end_date=r.end_date.isoformat(), total_amount=float(r.total_amount)) for r in rows]

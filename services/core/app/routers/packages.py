"""FR-10, FR-11: gói thuê (giá theo khay). Thay đổi gói không ảnh hưởng đơn cũ vì đơn lưu bản chụp."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text

from common.db import engine
from common.security import CurrentUser, current_user, require_roles

router = APIRouter(prefix="/packages", tags=["packages"])


class PackageIn(BaseModel):
    name: str
    durationDays: int = Field(gt=0)
    pricePerTray: float = Field(ge=0)


@router.get("", summary="FR-11: gói đang bật + số khay còn trống (chỉ tính AVAILABLE)")
def list_packages(_: CurrentUser = Depends(current_user)):
    with engine().connect() as c:
        free = c.execute(text("SELECT count(*) FROM trays t JOIN rooms r ON r.id=t.room_id "
                              "WHERE t.occupancy_status='AVAILABLE' AND r.status='ACTIVE'")).scalar()
        rows = c.execute(text("SELECT id,name,duration_days,price_per_tray FROM rental_packages WHERE is_active ORDER BY duration_days"))
        return {"availableTrays": free,
                "packages": [dict(r._mapping, id=str(r.id), price_per_tray=float(r.price_per_tray)) for r in rows]}


@router.post("", status_code=201, summary="FR-10: Admin tạo gói")
def create_package(body: PackageIn, _=Depends(require_roles("ADMIN"))):
    with engine().begin() as c:
        pid = c.execute(text("INSERT INTO rental_packages(name,duration_days,price_per_tray) VALUES (:n,:d,:p) RETURNING id"),
                        {"n": body.name, "d": body.durationDays, "p": body.pricePerTray}).scalar()
    return {"id": str(pid)}

# TODO FR-10: PATCH /{id} (sửa, bật/tắt gói) – chỉ dành cho Admin.

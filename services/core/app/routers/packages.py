"""FR-10, FR-11: gói thuê (giá theo khay). Sửa/tắt gói không ảnh hưởng đơn cũ vì đơn lưu bản chụp tên, thời hạn, giá."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, current_user, require_roles

router = APIRouter(prefix="/packages", tags=["packages"])


class PackageIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    durationDays: int = Field(gt=0)
    pricePerTray: float = Field(gt=0)
    varietyIds: list[str] = Field(default_factory=list)


class PackagePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    durationDays: int | None = Field(default=None, gt=0)
    pricePerTray: float | None = Field(default=None, ge=0)
    isActive: bool | None = None
    varietyIds: list[str] | None = None


def _row(r):
    return {"id": str(r.id), "name": r.name, "duration_days": r.duration_days,
            "price_per_tray": float(r.price_per_tray), "is_active": r.is_active,
            "scope": r.package_scope, "variety_ids": list(r.variety_ids or [])}


@router.get("", summary="FR-11: gói đang bật + số khay còn trống (chỉ tính AVAILABLE)")
def list_packages(_: CurrentUser = Depends(current_user)):
    with engine().connect() as c:
        free = c.execute(text("SELECT count(*) FROM trays t JOIN rooms r ON r.id=t.room_id "
                              "WHERE t.occupancy_status='AVAILABLE' AND r.status='ACTIVE'")).scalar()
        rows = c.execute(text("""SELECT p.id,p.name,p.duration_days,p.price_per_tray,p.is_active,p.package_scope,
            ARRAY(SELECT variety_id::text FROM rental_package_varieties WHERE package_id=p.id) AS variety_ids
            FROM rental_packages p WHERE p.is_active ORDER BY p.duration_days"""))
        return {"availableTrays": free, "packages": [_row(r) for r in rows]}


@router.get("/all", summary="FR-10: Admin xem tất cả gói, kể cả gói đã tắt")
def list_all(_=Depends(require_roles("OPERATOR"))):
    with engine().connect() as c:
        return [_row(r) for r in c.execute(text("""SELECT p.id,p.name,p.duration_days,p.price_per_tray,p.is_active,p.package_scope,
            ARRAY(SELECT variety_id::text FROM rental_package_varieties WHERE package_id=p.id) AS variety_ids
            FROM rental_packages p ORDER BY p.is_active DESC,p.duration_days"""))]


@router.post("", status_code=201, summary="FR-10: Admin tạo gói")
def create_package(body: PackageIn, _=Depends(require_roles("ADMIN"))):
    with engine().begin() as c:
        pid = c.execute(text("INSERT INTO rental_packages(name,duration_days,price_per_tray,package_scope) VALUES (:n,:d,:p,:s) RETURNING id"),
                        {"n": body.name, "d": body.durationDays, "p": body.pricePerTray, "s": "VARIETY" if body.varietyIds else "GENERAL"}).scalar()
        for vid in set(body.varietyIds):
            c.execute(text("INSERT INTO rental_package_varieties(package_id,variety_id) VALUES (:p,CAST(:v AS uuid))"),{"p":pid,"v":vid})
    return {"id": str(pid)}


@router.patch("/{package_id}", summary="FR-10: Admin sửa gói hoặc tắt/bật (isActive)")
def update_package(package_id: str, body: PackagePatch, _=Depends(require_roles("ADMIN"))):
    with engine().begin() as c:
        n = c.execute(text("""UPDATE rental_packages SET name=COALESCE(:n,name), duration_days=COALESCE(:d,duration_days),
                              price_per_tray=COALESCE(:p,price_per_tray), is_active=COALESCE(:a,is_active) WHERE id=:i"""),
                      {"n": body.name, "d": body.durationDays, "p": body.pricePerTray, "a": body.isActive,
                       "i": package_id}).rowcount
        if n == 0:
            raise AppError(404, "PACKAGE_NOT_FOUND", "Gói thuê không tồn tại")
        if body.varietyIds is not None:
            c.execute(text("DELETE FROM rental_package_varieties WHERE package_id=CAST(:p AS uuid)"),{"p":package_id})
            for vid in set(body.varietyIds):
                c.execute(text("INSERT INTO rental_package_varieties(package_id,variety_id) VALUES (CAST(:p AS uuid),CAST(:v AS uuid))"),{"p":package_id,"v":vid})
            c.execute(text("UPDATE rental_packages SET package_scope=:s WHERE id=CAST(:p AS uuid)"),{"p":package_id,"s":"VARIETY" if body.varietyIds else "GENERAL"})
        return _row(c.execute(text("""SELECT p.id,p.name,p.duration_days,p.price_per_tray,p.is_active,p.package_scope,
            ARRAY(SELECT variety_id::text FROM rental_package_varieties WHERE package_id=p.id) AS variety_ids
            FROM rental_packages p WHERE p.id=CAST(:i AS uuid)"""),{"i":package_id}).first())

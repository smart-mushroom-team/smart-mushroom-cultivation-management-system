"""Danh mục giống nấm (khách chọn khi thuê). Ai đăng nhập cũng xem được giống đang bật; Operator/Admin quản lý."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, current_user, require_roles

router = APIRouter(prefix="/varieties", tags=["varieties"])

_COLS = "id,name,description,growth_days,temp_min,temp_max,hum_min,hum_max,is_active"


class VarietyIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    growthDays: int = Field(gt=0, le=1000)
    tempMin: float = Field(ge=-40, le=85)
    tempMax: float = Field(ge=-40, le=85)
    humMin: float = Field(ge=0, le=100)
    humMax: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def _ranges(self):
        if not self.name.strip():
            raise ValueError("Tên giống là bắt buộc")
        if self.tempMin > self.tempMax or self.humMin > self.humMax:
            raise ValueError("Giá trị nhỏ nhất không được lớn hơn giá trị lớn nhất")
        return self


class VarietyPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    growthDays: int | None = Field(default=None, gt=0, le=1000)
    tempMin: float | None = Field(default=None, ge=-40, le=85)
    tempMax: float | None = Field(default=None, ge=-40, le=85)
    humMin: float | None = Field(default=None, ge=0, le=100)
    humMax: float | None = Field(default=None, ge=0, le=100)
    isActive: bool | None = None


def row(r) -> dict:
    return {"id": str(r.id), "name": r.name, "description": r.description, "growth_days": r.growth_days,
            "temp_min": float(r.temp_min), "temp_max": float(r.temp_max),
            "hum_min": float(r.hum_min), "hum_max": float(r.hum_max), "is_active": r.is_active}


def find_active_by_name(c, name: str):
    """Giống đang bật trùng tên (không phân biệt hoa thường, bỏ khoảng trắng thừa), hoặc None."""
    return c.execute(text(f"SELECT {_COLS} FROM mushroom_varieties WHERE is_active AND lower(btrim(name)) = lower(btrim(:n))"),
                     {"n": name}).first()


@router.get("", summary="Giống đang bật, để khách chọn khi thuê")
def list_active(_: CurrentUser = Depends(current_user)):
    with engine().connect() as c:
        return [row(r) for r in c.execute(text(f"SELECT {_COLS} FROM mushroom_varieties WHERE is_active ORDER BY name"))]


@router.get("/all", summary="Operator/Admin: tất cả giống, kể cả đã tắt")
def list_all(_=Depends(require_roles("OPERATOR"))):
    with engine().connect() as c:
        return [row(r) for r in c.execute(text(f"SELECT {_COLS} FROM mushroom_varieties ORDER BY is_active DESC, name"))]


def _dup() -> AppError:
    return AppError(409, "VARIETY_EXISTS", "Đã có giống nấm trùng tên này")


@router.post("", status_code=201, summary="Operator/Admin tạo giống")
def create_variety(body: VarietyIn, _=Depends(require_roles("OPERATOR"))):
    try:
        with engine().begin() as c:
            r = c.execute(text(f"""INSERT INTO mushroom_varieties(name,description,growth_days,temp_min,temp_max,hum_min,hum_max)
                                   VALUES (:n,:d,:g,:tmin,:tmax,:hmin,:hmax) RETURNING {_COLS}"""),
                          {"n": body.name.strip(), "d": body.description.strip(), "g": body.growthDays, "tmin": body.tempMin,
                           "tmax": body.tempMax, "hmin": body.humMin, "hmax": body.humMax}).first()
            return row(r)
    except IntegrityError as e:
        if "mushroom_varieties_name_uq" in str(e.orig):
            raise _dup()
        raise


@router.patch("/{variety_id}", summary="Operator/Admin sửa giống hoặc tắt/bật (isActive)")
def update_variety(variety_id: str, body: VarietyPatch, _=Depends(require_roles("OPERATOR"))):
    try:
        with engine().begin() as c:
            cur = c.execute(text(f"SELECT {_COLS} FROM mushroom_varieties WHERE id=:i FOR UPDATE"), {"i": variety_id}).first()
            if not cur:
                raise AppError(404, "VARIETY_NOT_FOUND", "Giống nấm không tồn tại")
            n = {
                "name": (body.name.strip() if body.name is not None else cur.name),
                "description": (body.description.strip() if body.description is not None else cur.description),
                "growth_days": body.growthDays if body.growthDays is not None else cur.growth_days,
                "tmin": body.tempMin if body.tempMin is not None else float(cur.temp_min),
                "tmax": body.tempMax if body.tempMax is not None else float(cur.temp_max),
                "hmin": body.humMin if body.humMin is not None else float(cur.hum_min),
                "hmax": body.humMax if body.humMax is not None else float(cur.hum_max),
                "a": body.isActive if body.isActive is not None else cur.is_active,
                "i": variety_id,
            }
            if not n["name"]:
                raise AppError(422, "INVALID_NAME", "Tên giống là bắt buộc")
            if n["tmin"] > n["tmax"] or n["hmin"] > n["hmax"]:
                raise AppError(422, "INVALID_RANGE", "Giá trị nhỏ nhất không được lớn hơn giá trị lớn nhất")
            r = c.execute(text(f"""UPDATE mushroom_varieties SET name=:name, description=:description, growth_days=:growth_days,
                                   temp_min=:tmin, temp_max=:tmax, hum_min=:hmin, hum_max=:hmax, is_active=:a
                                   WHERE id=:i RETURNING {_COLS}"""), n).first()
            return row(r)
    except IntegrityError as e:
        if "mushroom_varieties_name_uq" in str(e.orig):
            raise _dup()
        raise

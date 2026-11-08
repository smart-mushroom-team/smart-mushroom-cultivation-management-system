"""Chọn giống cho đợt nuôi: từ danh mục (duyệt ngay) hoặc tự nhập tên khác (chờ Operator duyệt)."""
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text

from common.errors import AppError

from .routers import varieties as catalog


class VarietyChoice(BaseModel):
    """Đúng một trong hai: varietyId (từ danh mục) hoặc customVariety (tên tự nhập); không gửi gì = chưa chọn."""
    varietyId: str | None = None
    customVariety: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def _one_of(self):
        if self.varietyId and self.customVariety is not None:
            raise ValueError("Chỉ gửi varietyId hoặc customVariety, không gửi cả hai")
        if self.customVariety is not None and not self.customVariety.strip():
            raise ValueError("Tên giống tự nhập không được để trống")
        return self


def resolve(c, choice: VarietyChoice) -> tuple[str | None, str | None, str]:
    """Trả (tên giống, variety_id, trạng thái). Tên tự nhập trùng danh mục thì dùng luôn giống của danh mục."""
    if choice.varietyId:
        r = c.execute(text("SELECT id,name FROM mushroom_varieties WHERE id=CAST(:i AS uuid) AND is_active"),
                      {"i": choice.varietyId}).first() if _is_uuid(choice.varietyId) else None
        if not r:
            raise AppError(404, "VARIETY_NOT_FOUND", "Giống nấm không tồn tại hoặc đã tắt")
        return r.name, str(r.id), "APPROVED"
    if choice.customVariety is not None:
        name = " ".join(choice.customVariety.split())
        hit = catalog.find_active_by_name(c, name)
        if hit:
            return hit.name, str(hit.id), "APPROVED"
        return name, None, "PENDING"
    return None, None, "NONE"


def _is_uuid(s: str) -> bool:
    import uuid
    try:
        uuid.UUID(s)
        return True
    except ValueError:
        return False

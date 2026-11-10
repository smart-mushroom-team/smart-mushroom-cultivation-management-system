from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from common.db import engine
from common.errors import AppError
from common.security import require_roles

from ..security import hash_password

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_roles("ADMIN"))])


class OperatorIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=72)


@router.get("", summary="FR-04: danh sách người dùng")
def list_users():
    with engine().connect() as c:
        rows = c.execute(text("SELECT id,name,email,role,status,created_at FROM users ORDER BY created_at")).mappings().all()
    return [dict(r, id=str(r["id"])) for r in rows]


@router.post("/operators", status_code=201, summary="FR-04: Admin tạo Operator")
def create_operator(body: OperatorIn):
    with engine().begin() as c:
        if c.execute(text("SELECT 1 FROM users WHERE lower(email)=lower(:e)"), {"e": body.email}).first():
            raise AppError(409, "EMAIL_EXISTS", "Email đã tồn tại")
        uid = c.execute(text("INSERT INTO users(name,email,password_hash,role) VALUES (:n,:e,:h,'OPERATOR') RETURNING id"),
                        {"n": body.name, "e": body.email, "h": hash_password(body.password)}).scalar()
    return {"id": str(uid)}


@router.post("/{user_id}/deactivate", summary="FR-04 / BR-15: vô hiệu hóa (không xóa)")
def deactivate(user_id: str):
    return _set_status(user_id, "INACTIVE")


@router.post("/{user_id}/activate", summary="FR-04: kích hoạt lại")
def activate(user_id: str):
    return _set_status(user_id, "ACTIVE")


def _set_status(user_id: str, status: str):
    with engine().begin() as c:
        n = c.execute(text("UPDATE users SET status=:s WHERE id=:i"), {"s": status, "i": user_id}).rowcount
    if not n:
        raise AppError(404, "NOT_FOUND", "Không tìm thấy người dùng")
    return {"id": user_id, "status": status}


@router.post("/admins", status_code=201, summary="Admin tạo Admin mới")
def create_admin(body: OperatorIn):
    name, email = body.name.strip(), body.email.strip().lower()
    if not name or not email or "@" not in email:
        raise AppError(422, "INVALID_INPUT", "Tên hoặc email không hợp lệ")
    try:
        with engine().begin() as c:
            uid = c.execute(text("""INSERT INTO users(name,email,password_hash,role)
                VALUES (:n,:e,:h,'ADMIN') RETURNING id"""),
                {"n": name, "e": email, "h": hash_password(body.password)}).scalar()
    except IntegrityError:
        raise AppError(409, "EMAIL_EXISTS", "Email đã tồn tại")
    return {"id": str(uid)}


class PasswordResetIn(BaseModel):
    password: str = Field(min_length=8, max_length=72)


@router.post("/{user_id}/reset-password", summary="Admin đặt lại mật khẩu Operator/Customer")
def reset_password(user_id: str, body: PasswordResetIn):
    # Không trả mật khẩu/hash về response; chỉ Operator/Customer được reset.
    with engine().begin() as c:
        row = c.execute(text("SELECT role FROM users WHERE id=CAST(:i AS uuid)"), {"i": user_id}).first()
        if not row:
            raise AppError(404, "NOT_FOUND", "Không tìm thấy người dùng")
        if row.role not in ("OPERATOR", "CUSTOMER"):
            raise AppError(403, "RESET_FORBIDDEN", "Không thể đặt lại mật khẩu Admin")
        c.execute(text("UPDATE users SET password_hash=:h WHERE id=CAST(:i AS uuid)"),
                  {"h": hash_password(body.password), "i": user_id})
    return {"ok": True}

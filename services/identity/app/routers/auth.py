from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from sqlalchemy import text

from common.db import engine
from common.errors import AppError

from ..security import hash_password, make_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=201, summary="FR-03: Customer tự đăng ký")
def register(body: RegisterIn):
    with engine().begin() as c:
        if c.execute(text("SELECT 1 FROM users WHERE lower(email)=lower(:e)"), {"e": body.email}).first():
            raise AppError(409, "EMAIL_EXISTS", "Email đã tồn tại")
        uid = c.execute(text("INSERT INTO users(name,email,password_hash,role) VALUES (:n,:e,:h,'CUSTOMER') RETURNING id"),
                        {"n": body.name, "e": body.email, "h": hash_password(body.password)}).scalar()
    return {"id": str(uid)}


@router.post("/login", summary="FR-02: đăng nhập, trả JWT (không có refresh token)")
def login(body: LoginIn):
    with engine().connect() as c:
        row = c.execute(text("SELECT id,name,role,status,password_hash FROM users WHERE lower(email)=lower(:e)"),
                        {"e": body.email}).first()
    if not row or not verify_password(body.password, row.password_hash):
        raise AppError(401, "BAD_CREDENTIALS", "Sai email hoặc mật khẩu")
    if row.status != "ACTIVE":
        raise AppError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị vô hiệu hóa")
    token, ttl = make_token(str(row.id), row.role, row.name)
    return {"accessToken": token, "tokenType": "Bearer", "expiresIn": ttl, "role": row.role, "name": row.name}

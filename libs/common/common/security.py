"""Xác thực JWT cục bộ (BR-16) và phân quyền theo vai trò (NFR-06)."""
import hmac
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import env
from .errors import AppError

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)   # hiện nút Authorize (Bearer JWT) trên Swagger UI


@dataclass
class CurrentUser:
    id: str
    role: str          # ADMIN | OPERATOR | CUSTOMER
    name: str


def decode_token(token: str) -> CurrentUser:
    try:
        data = jwt.decode(token, env("JWT_SECRET", required=True), algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AppError(401, "TOKEN_EXPIRED", "Phiên đăng nhập đã hết hạn")
    except jwt.PyJWTError:
        raise AppError(401, "TOKEN_INVALID", "Token không hợp lệ")
    return CurrentUser(id=data["sub"], role=data["role"], name=data.get("name", ""))


def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer)) -> CurrentUser:
    if cred is None:
        raise AppError(401, "UNAUTHENTICATED", "Thiếu token")
    return decode_token(cred.credentials)


def require_roles(*roles: str):
    """Admin kế thừa mọi quyền của Operator (SRS 2.4)."""
    allowed = set(roles)
    if "OPERATOR" in allowed:
        allowed.add("ADMIN")

    def dep(user: CurrentUser = Depends(current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise AppError(403, "FORBIDDEN", "Không đủ quyền")
        return user

    return dep


def require_service_key(x_service_key: str = Header(default="")) -> None:
    """Bảo vệ endpoint /internal (NFR-06)."""
    if not hmac.compare_digest(x_service_key, env("SERVICE_KEY", required=True)):
        raise AppError(403, "BAD_SERVICE_KEY", "Khóa dịch vụ không hợp lệ")

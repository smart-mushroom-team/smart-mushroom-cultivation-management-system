import datetime as dt

import bcrypt
import jwt

from common.config import env


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(user_id: str, role: str, name: str) -> tuple[str, int]:
    hours = int(env("JWT_EXPIRE_HOURS", "8"))                                   # BR-16: mặc định 8 giờ
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=hours)
    token = jwt.encode({"sub": user_id, "role": role, "name": name, "exp": exp},
                       env("JWT_SECRET", required=True), algorithm="HS256")
    return token, hours * 3600

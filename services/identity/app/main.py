"""Identity Service: đăng ký, đăng nhập, JWT, tạo Operator, vô hiệu hóa/kích hoạt lại (FR-01 – FR-04)."""
import logging
import pathlib
from contextlib import asynccontextmanager

from sqlalchemy import text

from common.app_factory import create_app
from common.config import env
from common.db import engine
from common.migrate import run_migrations

from .routers import auth, users
from .security import hash_password

log = logging.getLogger("identity")


@asynccontextmanager
async def lifespan(_):
    run_migrations(pathlib.Path(__file__).resolve().parent.parent / "migrations")
    seed_admin()
    yield


def seed_admin() -> None:
    """FR-01: tài khoản Admin đầu tiên bằng seed, không cho tự đăng ký Admin/Operator."""
    email, pw = env("SEED_ADMIN_EMAIL"), env("SEED_ADMIN_PASSWORD")
    if not email or not pw:
        return
    with engine().begin() as c:
        exists = c.execute(text("SELECT 1 FROM users WHERE lower(email)=lower(:e)"), {"e": email}).first()
        if not exists:
            c.execute(text("INSERT INTO users(name,email,password_hash,role) VALUES ('Administrator',:e,:h,'ADMIN')"),
                      {"e": email, "h": hash_password(pw)})
            log.info("Đã tạo tài khoản Admin seed %s", email)


app = create_app("identity", "Đăng ký, đăng nhập, quản lý người dùng")
app.router.lifespan_context = lifespan
app.include_router(auth.router)
app.include_router(users.router)

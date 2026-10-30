import os

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Engine

from .config import env

_engine: Engine | None = None


def database_url() -> URL | str:
    """Ưu tiên DB_USER/DB_PASSWORD/DB_HOST/DB_NAME (mật khẩu có ký tự đặc biệt như @ / : # vẫn dùng được);
    nếu không có thì dùng DATABASE_URL."""
    if os.getenv("DB_USER"):
        return URL.create("postgresql+psycopg2", username=env("DB_USER"), password=env("DB_PASSWORD"),
                          host=env("DB_HOST", "postgres"), port=int(env("DB_PORT", "5432")), database=env("DB_NAME", required=True))
    return env("DATABASE_URL", required=True)


def _connect_args() -> dict:
    """DB_SCHEMA (tùy chọn): dùng schema riêng, chủ yếu để chạy test tích hợp mà không đụng dữ liệu thật."""
    schema = os.getenv("DB_SCHEMA")
    return {"options": f"-csearch_path={schema}"} if schema else {}


def engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(database_url(), pool_pre_ping=True, connect_args=_connect_args())
    return _engine

"""Ngày nghiệp vụ UTC+7. Ở chế độ demo có thể đặt ngày giả lập, lưu bền trong system_settings (FR-26)."""
import datetime as dt
import os
from zoneinfo import ZoneInfo

from sqlalchemy import text

from common.db import engine

TZ = ZoneInfo("Asia/Ho_Chi_Minh")


def demo_enabled() -> bool:
    return os.getenv("DEMO_MODE", "false").lower() == "true"


def today() -> dt.date:
    if demo_enabled():
        with engine().connect() as c:
            v = c.execute(text("SELECT value FROM system_settings WHERE key='demo_date'")).scalar()
        if v:
            return dt.date.fromisoformat(v)
    return dt.datetime.now(TZ).date()

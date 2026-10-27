"""FR-26: chế độ demo - chạy job hết hạn thủ công và đặt ngày giả lập (bị khóa khi DEMO_MODE=false)."""
import datetime as dt

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from common.db import engine
from common.errors import AppError
from common.security import require_roles

from .. import clock, lifecycle

router = APIRouter(prefix="/demo", tags=["demo"], dependencies=[Depends(require_roles("ADMIN"))])


def _guard():
    if not clock.demo_enabled():
        raise AppError(403, "DEMO_DISABLED", "Chế độ demo đang tắt")


class DateIn(BaseModel):
    date: dt.date | None = None     # null = quay về ngày thật


@router.put("/date")
def set_date(body: DateIn):
    _guard()
    with engine().begin() as c:
        if body.date:
            c.execute(text("INSERT INTO system_settings(key,value) VALUES ('demo_date',:v) "
                           "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value"), {"v": body.date.isoformat()})
        else:
            c.execute(text("DELETE FROM system_settings WHERE key='demo_date'"))
    return {"today": clock.today().isoformat()}


@router.post("/run-expiry")
def run_expiry():
    _guard()
    return lifecycle.run_expiry(clock.today())

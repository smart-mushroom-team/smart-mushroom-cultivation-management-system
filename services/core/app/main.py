"""Core Service: phòng/khay, gói và đơn thuê, đợt nuôi, thu hoạch, thông báo, Expiry Job, FCM."""
import logging
import pathlib
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler

from common.app_factory import create_app
from common.migrate import run_migrations

from . import clock, consumer, lifecycle
from .routers import cycles, demo, internal, notifications, packages, rentals, rooms

log = logging.getLogger("core")
scheduler = BackgroundScheduler(timezone=clock.TZ)


@asynccontextmanager
async def lifespan(_):
    run_migrations(pathlib.Path(__file__).resolve().parent.parent / "migrations")
    scheduler.add_job(lambda: lifecycle.run_expiry(clock.today()), "cron", hour=0, minute=0, id="expiry")   # FR-22
    scheduler.start()
    consumer.start()
    yield
    scheduler.shutdown(wait=False)


app = create_app("core", "Phòng/khay, gói và đơn thuê, đợt nuôi, thông báo")
app.router.lifespan_context = lifespan
for r in (rooms.router, packages.router, rentals.router, cycles.router, notifications.router, demo.router, internal.router):
    app.include_router(r)

"""Monitoring Service: nhận dữ liệu thiết bị, snapshot Redis, ngưỡng và cảnh báo, biểu đồ."""
import pathlib
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler

from common.app_factory import create_app
from common.migrate import run_migrations

from . import jobs
from .routers import devices, iot, rooms

scheduler = BackgroundScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(_):
    run_migrations(pathlib.Path(__file__).resolve().parent.parent / "migrations")
    scheduler.add_job(jobs.device_status, "interval", seconds=10, id="device-status")
    scheduler.add_job(jobs.retention, "cron", hour=3, id="retention")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = create_app("monitoring", "Thiết bị IoT, số liệu cảm biến, ngưỡng và cảnh báo")
app.router.lifespan_context = lifespan
for r in (iot.router, devices.router, rooms.router):
    app.include_router(r)

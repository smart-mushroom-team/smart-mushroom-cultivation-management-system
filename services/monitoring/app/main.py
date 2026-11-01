"""Monitoring Service: nhận dữ liệu thiết bị, snapshot Redis, ngưỡng và cảnh báo, biểu đồ."""
import pathlib
import threading
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler

from common import rabbit
from common.app_factory import create_app
from common.events import ALERTS_QUEUE, TELEMETRY_QUEUE
from common.migrate import run_migrations

from . import jobs
from .routers import devices, iot, rooms

scheduler = BackgroundScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(_):
    run_migrations(pathlib.Path(__file__).resolve().parent.parent / "migrations")
    scheduler.add_job(jobs.device_status, "interval", seconds=10, id="device-status")
    scheduler.add_job(jobs.retention, "cron", hour=3, id="retention")
    scheduler.add_job(jobs.snapshot_retention, "interval", minutes=30, id="snapshot-retention")
    scheduler.start()
    # Tạo sẵn hàng đợi để NiFi (hoặc aggregator) nối vào được ngay từ lúc khởi động, không phải chờ tin đầu tiên. Không chặn khởi động.
    threading.Thread(target=rabbit.declare, args=(TELEMETRY_QUEUE, ALERTS_QUEUE), name="declare-queues", daemon=True).start()
    yield
    scheduler.shutdown(wait=False)


app = create_app("monitoring", "Thiết bị IoT, số liệu cảm biến, ngưỡng và cảnh báo")
app.router.lifespan_context = lifespan
for r in (iot.router, devices.router, rooms.router):
    app.include_router(r)

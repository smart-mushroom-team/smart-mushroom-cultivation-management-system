"""Job nền: cập nhật trạng thái thiết bị (mỗi 10 giây) và dọn dữ liệu cũ (FR-36)."""
import logging

from sqlalchemy import text

from common.db import engine

log = logging.getLogger("jobs")


def device_status() -> None:
    """TODO FR-37: khi thiết bị chuyển offline -> publish alerts.events (DEVICE_OFFLINE), một lần cho mỗi lần mất kết nối."""
    with engine().connect() as c:
        n = c.execute(text("""SELECT count(*) FROM devices WHERE status='ACTIVE' AND last_seen_at IS NOT NULL
                              AND now() - last_seen_at > interval_sec * 3 * interval '1 second'""")).scalar()
    log.debug("Thiết bị offline: %s", n)


def retention() -> None:
    with engine().begin() as c:
        c.execute(text("DELETE FROM sensor_readings WHERE recorded_at < now() - interval '7 days'"))
        c.execute(text("DELETE FROM sensor_aggregates WHERE window_start < now() - interval '30 days'"))

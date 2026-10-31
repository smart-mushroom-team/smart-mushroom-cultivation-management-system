"""Job nền: cập nhật trạng thái thiết bị (mỗi 10 giây) và dọn dữ liệu cũ (FR-36)."""
import logging

from sqlalchemy import text

from common.db import engine
from common.events import ALERTS_QUEUE
from common.rabbit import publish

from . import presence, snapshots

log = logging.getLogger("jobs")


def device_status() -> int:
    """FR-37: thiết bị quá 3 x chu kỳ không gửi dữ liệu -> publish DEVICE_OFFLINE đúng một lần cho mỗi lần mất kết nối.
    Chỉ đánh dấu 'đã báo' khi gửi thành công; gửi lỗi thì để nguyên và thử lại ở lần chạy sau (dedupeKey chống trùng).
    FOR UPDATE SKIP LOCKED: hai tiến trình chạy job cùng lúc không báo trùng. Trả về số cảnh báo đã gửi."""
    sent = 0
    with engine().begin() as c:
        rows = c.execute(text("""SELECT id,name,type,room_id,last_seen_at,interval_sec FROM devices
                                 WHERE status='ACTIVE' AND last_seen_at IS NOT NULL AND offline_alerted_at IS NULL
                                   AND now() - last_seen_at > interval_sec * :f * interval '1 second'
                                 ORDER BY last_seen_at FOR UPDATE SKIP LOCKED"""), {"f": presence.OFFLINE_FACTOR}).all()
        for d in rows:
            if publish(ALERTS_QUEUE, presence.offline_event(d)):
                c.execute(text("UPDATE devices SET offline_alerted_at=now() WHERE id=:i"), {"i": d.id})
                sent += 1
            else:
                log.error("Không gửi được cảnh báo offline của %s, sẽ thử lại", d.id)
    if sent:
        log.info("Đã báo %s thiết bị offline", sent)
    return sent


def retention() -> None:
    with engine().begin() as c:
        c.execute(text("DELETE FROM sensor_readings WHERE recorded_at < now() - interval '7 days'"))
        c.execute(text("DELETE FROM sensor_aggregates WHERE window_start < now() - interval '30 days'"))


def snapshot_retention() -> None:
    """Dọn ảnh camera quá hạn giữ (SNAPSHOT_RETENTION_HOURS, mặc định 24 giờ) để không đầy đĩa."""
    log.info("Dọn ảnh camera: %s", snapshots.purge_old())

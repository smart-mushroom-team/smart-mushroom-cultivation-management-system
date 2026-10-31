"""Trạng thái online/offline của thiết bị (FR-37, BR-11).

* Offline = không có dữ liệu trong 3 x chu kỳ gửi (interval_sec).
* Mỗi lần mất kết nối báo DEVICE_OFFLINE đúng MỘT lần (cột offline_alerted_at); có dữ liệu trở lại thì báo DEVICE_ONLINE.
* Thiết bị chưa từng gửi dữ liệu (last_seen_at rỗng) không bị coi là offline - tránh báo ngay sau khi vừa tạo.
"""
import datetime as dt
import logging

from sqlalchemy import text

from common.db import engine
from common.events import ALERTS_QUEUE
from common.rabbit import publish

log = logging.getLogger("presence")

OFFLINE_FACTOR = 3
KIND_VI = {"SENSOR_NODE": "Cảm biến", "CAMERA": "Camera"}


def mark_seen(conn, device_id) -> bool:
    """Ghi nhận thiết bị vừa gửi dữ liệu. Trả True nếu trước đó nó đang bị coi là offline (cần báo online trở lại).
    Khóa dòng để không chạy đua với job device_status."""
    was = conn.execute(text("SELECT offline_alerted_at IS NOT NULL FROM devices WHERE id=:d FOR UPDATE"), {"d": device_id}).scalar()
    conn.execute(text("UPDATE devices SET last_seen_at=now(), offline_alerted_at=NULL WHERE id=:d"), {"d": device_id})
    return bool(was)


def offline_event(d) -> dict:
    return {"type": "DEVICE_OFFLINE", "title": f"{KIND_VI.get(d.type, 'Thiết bị')} {d.name} mất kết nối",
            "content": f"Không nhận được dữ liệu từ {d.name} quá {OFFLINE_FACTOR * d.interval_sec} giây",
            "roomId": str(d.room_id), "deviceId": str(d.id),
            # last_seen_at nằm trong dedupeKey: gửi lại cùng một sự cố không tạo thêm thông báo, sự cố mới thì khác khóa
            "dedupeKey": f"DEVICE_OFFLINE:{d.id}:{d.last_seen_at.isoformat()}"}


def online_event(d, now: dt.datetime | None = None) -> dict:
    now = now or dt.datetime.now(dt.timezone.utc)
    return {"type": "DEVICE_ONLINE", "title": f"{KIND_VI.get(d.type, 'Thiết bị')} {d.name} đã hoạt động trở lại",
            "content": f"{d.name} đã gửi dữ liệu trở lại", "roomId": str(d.room_id), "deviceId": str(d.id),
            "dedupeKey": f"DEVICE_ONLINE:{d.id}:{now.isoformat()}"}


def announce_online(d) -> None:
    """Gọi SAU commit khi mark_seen trả True: báo thiết bị đã hoạt động trở lại. Lỗi gửi chỉ ghi log (không ảnh hưởng nhận dữ liệu)."""
    with engine().connect() as c:
        full = c.execute(text("SELECT id,name,type,room_id,interval_sec FROM devices WHERE id=:i"), {"i": d.id}).first()
    if full is not None and not publish(ALERTS_QUEUE, online_event(full)):
        log.warning("Không gửi được thông báo online trở lại của %s", d.id)

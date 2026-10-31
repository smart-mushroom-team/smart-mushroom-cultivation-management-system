"""Core nhận sự kiện cảnh báo từ Monitoring (alerts.events): lưu thông báo cho Operator/Admin, xử lý lặp không tạo trùng (BR-19)."""
from sqlalchemy import text

from app import consumer

OFFLINE = {"type": "DEVICE_OFFLINE", "title": "Cảm biến A mất kết nối", "content": "Không nhận được dữ liệu quá 90 giây",
           "roomId": "11111111-1111-1111-1111-111111111111", "deviceId": "22222222-2222-2222-2222-222222222222",
           "dedupeKey": "DEVICE_OFFLINE:22222222-2222-2222-2222-222222222222:2030-01-01T00:00:00+00:00"}


def staff_notes(client, h):
    return client.get("/notifications", headers=h).json()


def test_event_becomes_staff_notification(client, operator, admin, customer):
    consumer.handle(OFFLINE)
    for h in (operator, admin):                                   # cả Operator và Admin đều thấy (recipient_role=STAFF)
        (n,) = staff_notes(client, h)
        assert n["type"] == "DEVICE_OFFLINE" and n["title"].startswith("Cảm biến A") and n["data"]["roomId"] == OFFLINE["roomId"]
    assert staff_notes(client, customer) == []                    # khách không nhận cảnh báo hạ tầng


def test_redelivered_event_creates_no_duplicate(client, operator, db):
    for _ in range(3):                                            # RabbitMQ giao lại cùng một sự kiện
        consumer.handle(OFFLINE)
    assert len(staff_notes(client, operator)) == 1
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM notifications")).scalar() == 1


def test_new_incident_with_new_key_creates_new_notification(client, operator):
    consumer.handle(OFFLINE)
    consumer.handle({**OFFLINE, "dedupeKey": OFFLINE["dedupeKey"] + "-2"})
    assert len(staff_notes(client, operator)) == 2


def test_threshold_and_online_events_are_accepted(client, operator):
    consumer.handle({"type": "TEMP_OUT_OF_RANGE", "title": "Cảnh báo nhiệt độ vượt ngưỡng", "content": "Nhiệt độ 37°C",
                     "roomId": OFFLINE["roomId"], "deviceId": OFFLINE["deviceId"], "dedupeKey": "TEMP:r:2030-01-01T00:00:00"})
    consumer.handle({"type": "DEVICE_ONLINE", "title": "x đã hoạt động trở lại", "dedupeKey": "DEVICE_ONLINE:d:t"})   # content tùy chọn
    assert {n["type"] for n in staff_notes(client, operator)} == {"TEMP_OUT_OF_RANGE", "DEVICE_ONLINE"}

"""Chỉ số Prometheus riêng của Core cho luồng RabbitMQ -> Core -> FCM (hiện ở /metrics, Grafana ở Bước 6).

  mushroom_alert_events_total{result}      stored | duplicate | dead   (tin cảnh báo Core đã xử lý xong)
  mushroom_alert_consumer_connected        1 khi consumer đang nghe hàng đợi, 0 khi mất kết nối RabbitMQ
  mushroom_push_total{target,result}       target: staff | user. result: sent | failed | dry_run | no_token (đếm theo lần gọi push)
  mushroom_push_dead_tokens_total          số token FCM báo không còn hợp lệ và đã bị xóa

Độ sâu hàng đợi (alerts.events, alerts.events.dead) do chính RabbitMQ cung cấp (plugin prometheus), không đếm ở đây.
"""
from prometheus_client import Counter, Gauge

ALERT_EVENTS = Counter("mushroom_alert_events_total", "Tin cảnh báo từ RabbitMQ mà Core đã xử lý", ["result"])
CONSUMER_CONNECTED = Gauge("mushroom_alert_consumer_connected", "1 nếu consumer alerts.events đang nghe RabbitMQ")
PUSH = Counter("mushroom_push_total", "Số lần gọi gửi push FCM", ["target", "result"])
PUSH_DEAD_TOKENS = Counter("mushroom_push_dead_tokens_total", "Token FCM không còn hợp lệ đã bị xóa")

for _r in ("stored", "duplicate", "dead"):                       # có sẵn giá trị 0 để Grafana không báo "No data"
    ALERT_EVENTS.labels(_r)
for _t in ("staff", "user"):
    for _r in ("sent", "failed", "dry_run", "no_token"):
        PUSH.labels(_t, _r)
CONSUMER_CONNECTED.set(0)

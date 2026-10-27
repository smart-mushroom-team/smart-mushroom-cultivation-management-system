"""Hợp đồng sự kiện RabbitMQ (FR-52, FR-53, BR-19) – dùng chung giữa Monitoring (gửi) và Core (nhận)."""
ALERTS_QUEUE = "alerts.events"          # Monitoring -> Core
TELEMETRY_QUEUE = "telemetry.events"    # Monitoring -> NiFi

# Ví dụ thông điệp cảnh báo:
# {"dedupeKey": "OFFLINE:<deviceId>:<lastSeenIso>", "type": "DEVICE_OFFLINE" | "THRESHOLD_EXCEEDED",
#  "roomId": "...", "deviceId": "...", "title": "...", "content": "...", "occurredAt": "ISO8601"}
#
# Ví dụ thông điệp số liệu:
# {"deviceId": "...", "roomId": "...", "temperature": 28.5, "humidity": 82.1, "recordedAt": "ISO8601"}

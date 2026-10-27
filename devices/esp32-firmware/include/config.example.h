// Sao chép thành config.h (đã nằm trong .gitignore) và điền giá trị thật. KHÔNG commit config.h.
#pragma once
#define WIFI_SSID     "ten-wifi"
#define WIFI_PASSWORD "mat-khau-wifi"
// Địa chỉ máy chạy docker compose trong cùng mạng LAN (cổng Gateway)
#define API_URL       "http://192.168.1.10:8000/iot/telemetry"
#define DEVICE_KEY    "khoa-thiet-bi-do-admin-tao"
#define SEND_INTERVAL_MS 30000
#define DHT_PIN 4

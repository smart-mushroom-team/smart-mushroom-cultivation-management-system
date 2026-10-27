"""Giả lập cảm biến để demo khi không có phần cứng (thiết bị tạo với isSimulated=true).
Dùng: python simulate_devices.py http://localhost:8000 <DEVICE_KEY> [--anomaly]
--anomaly: nhiệt độ vượt ngưỡng liên tục để kiểm thử cảnh báo (FR-38/39)."""
import random
import sys
import time

import requests

base, key = sys.argv[1], sys.argv[2]
anomaly = "--anomaly" in sys.argv
while True:
    t = random.uniform(34, 38) if anomaly else random.uniform(24, 27)
    h = random.uniform(80, 90)
    r = requests.post(f"{base}/iot/telemetry", json={"temperature": round(t, 1), "humidity": round(h, 1)},
                      headers={"X-Device-Key": key}, timeout=5)
    print(r.status_code, round(t, 1), round(h, 1))
    time.sleep(5)

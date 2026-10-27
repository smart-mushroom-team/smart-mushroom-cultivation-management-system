"""Nạp dữ liệu mẫu qua API (chạy sau `make up`): python scripts/seed_sample_data.py [http://localhost:8000]"""
import os
import sys

import requests

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
admin = requests.post(f"{base}/api/identity/auth/login",
                      json={"email": os.environ.get("SEED_ADMIN_EMAIL", "admin@example.com"),
                            "password": os.environ["SEED_ADMIN_PASSWORD"]}, timeout=10)
admin.raise_for_status()
h = {"Authorization": f"Bearer {admin.json()['accessToken']}"}

room = requests.post(f"{base}/api/core/rooms", json={"name": "Phòng 1"}, headers=h, timeout=10).json()["id"]
for i in range(1, 11):
    requests.post(f"{base}/api/core/trays", headers=h, timeout=10,
                  json={"trayCode": f"T-{i:03d}", "roomId": room, "row": 1, "shelf": (i - 1) // 5 + 1, "slot": (i - 1) % 5 + 1})
for name, days, price in (("Gói 30 ngày", 30, 150000), ("Gói 60 ngày", 60, 270000)):
    requests.post(f"{base}/api/core/packages", json={"name": name, "durationDays": days, "pricePerTray": price}, headers=h, timeout=10)
print("Đã tạo 1 phòng, 10 khay, 2 gói")

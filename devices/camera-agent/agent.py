"""Chụp ảnh định kỳ và gửi lên Monitoring (FR-28). TODO: endpoint /iot/snapshot phía backend."""
import time

import cv2
import requests
import yaml

cfg = yaml.safe_load(open("config.yaml", encoding="utf8"))
cap = cv2.VideoCapture(cfg["camera_source"])

while True:
    ok, frame = cap.read()
    if ok:
        _, buf = cv2.imencode(".jpg", frame)
        r = requests.post(cfg["api_url"], headers={"X-Device-Key": cfg["device_key"]},
                          files={"image": ("snap.jpg", buf.tobytes(), "image/jpeg")}, timeout=10)
        print("snapshot", r.status_code)
    time.sleep(cfg["interval_sec"])

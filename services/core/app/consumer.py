"""Nhận sự kiện cảnh báo từ RabbitMQ (FR-52, BR-19): lưu thông báo (dedupeKey) rồi mới ack.
Lỗi nhiều lần thì bỏ qua và ghi log (không có dead-letter ở v2.4)."""
import json
import logging
import threading
import time

import pika

from common import rabbit
from common.db import engine
from common.events import ALERTS_QUEUE

from . import notify

log = logging.getLogger("consumer")
MAX_ATTEMPTS = 3


def handle(msg: dict) -> None:
    with engine().begin() as c:
        notify.create(c, type=msg["type"], title=msg["title"], content=msg.get("content", ""),
                      dedupe_key=msg["dedupeKey"], staff=True,
                      data={"roomId": msg.get("roomId"), "deviceId": msg.get("deviceId")})


def _run() -> None:
    attempts: dict[str, int] = {}
    while True:
        try:
            conn = pika.BlockingConnection(rabbit.params())
            ch = conn.channel()
            ch.queue_declare(queue=ALERTS_QUEUE, durable=True)
            ch.basic_qos(prefetch_count=10)
            for method, _props, body in ch.consume(ALERTS_QUEUE):
                try:
                    handle(json.loads(body))
                    ch.basic_ack(method.delivery_tag)
                except Exception:                           # noqa: BLE001
                    k = body.decode()[:200]
                    attempts[k] = attempts.get(k, 0) + 1
                    log.exception("Xử lý sự kiện lỗi (lần %d)", attempts[k])
                    ch.basic_nack(method.delivery_tag, requeue=attempts[k] < MAX_ATTEMPTS)
        except Exception:                                   # noqa: BLE001
            log.warning("Mất kết nối RabbitMQ, thử lại sau 5 giây")
            time.sleep(5)


def start() -> None:
    threading.Thread(target=_run, name="alerts-consumer", daemon=True).start()

"""Publish/consume RabbitMQ bằng pika. Hàng đợi bền (durable); publish có xác nhận của broker (BR-19)."""
import json
import logging
import os
import time

import pika

from .config import env

log = logging.getLogger("rabbit")


def params() -> pika.ConnectionParameters:
    """Dựng từ RABBITMQ_USER/PASSWORD/HOST riêng lẻ nên mật khẩu có ký tự đặc biệt vẫn dùng được."""
    if os.getenv("RABBITMQ_USER"):
        return pika.ConnectionParameters(host=env("RABBITMQ_HOST", "rabbitmq"), port=int(env("RABBITMQ_PORT", "5672")),
                                         credentials=pika.PlainCredentials(env("RABBITMQ_USER"), env("RABBITMQ_PASSWORD")))
    return pika.URLParameters(env("RABBITMQ_URL", required=True))


_params = params


def publish(queue: str, message: dict, retries: int = 3) -> bool:
    """Trả True nếu broker xác nhận. Thử lại ngắn; hết lượt thì ghi log và bỏ qua (BR-14)."""
    for attempt in range(1, retries + 1):
        try:
            with pika.BlockingConnection(_params()) as conn:
                ch = conn.channel()
                ch.queue_declare(queue=queue, durable=True)
                ch.confirm_delivery()
                ch.basic_publish("", queue, json.dumps(message).encode(),
                                 pika.BasicProperties(delivery_mode=2, content_type="application/json"))
            return True
        except Exception as exc:        # noqa: BLE001
            log.warning("publish %s lần %d thất bại: %s", queue, attempt, exc)
            time.sleep(0.5 * attempt)
    log.error("Bỏ qua sự kiện sau %d lần thử: %s", retries, message)
    return False

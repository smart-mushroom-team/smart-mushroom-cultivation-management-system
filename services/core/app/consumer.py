"""Nhận sự kiện cảnh báo từ RabbitMQ (FR-52, BR-19) rồi lưu thông báo và push cho Operator/Admin.

Luồng một tin: kiểm tra -> lưu thông báo (dedupeKey, một giao dịch) -> commit -> push FCM -> ack.
  * Tin giao lại (RabbitMQ at-least-once) không tạo thông báo mới và KHÔNG push lại.
  * Tin hỏng (JSON sai, thiếu trường): không thử lại vì lần nào cũng hỏng, chuyển thẳng sang hàng đợi lỗi.
  * Lỗi tạm thời (DB bận...): thử lại MAX_ATTEMPTS lần cách nhau 1s, 2s, 4s; vẫn lỗi thì chuyển sang hàng đợi lỗi.
  * Hàng đợi lỗi `alerts.events.dead` xem được ở giao diện RabbitMQ (:15672); đẩy lại bằng `python -m app.replay`.
  * Tin chỉ được ack sau khi đã lưu xong hoặc đã nằm an toàn trong hàng đợi lỗi: mất kết nối giữa chừng thì được giao lại.
"""
import json
import logging
import threading
import time

import pika

from common import rabbit
from common.db import engine
from common.events import ALERTS_QUEUE

from . import metrics, notify

log = logging.getLogger("consumer")
DEAD_QUEUE = ALERTS_QUEUE + ".dead"
MAX_ATTEMPTS = 4
BACKOFF = (1, 2, 4)                          # giây chờ trước lần thử thứ 2, 3, 4
REQUIRED = ("type", "title", "dedupeKey")


class BadMessage(Exception):
    """Tin không đúng hợp đồng (libs/common/common/events.py): thử lại cũng vô ích."""


def parse(body: bytes) -> dict:
    try:
        msg = json.loads(body)
    except (ValueError, TypeError) as e:
        raise BadMessage("không phải JSON hợp lệ") from e
    if not isinstance(msg, dict):
        raise BadMessage("thông điệp phải là một object JSON")
    for k in REQUIRED:
        if not isinstance(msg.get(k), str) or not msg[k].strip():
            raise BadMessage(f"thiếu hoặc sai trường '{k}'")
    return msg


def handle(msg: dict) -> bool:
    """Lưu thông báo cho STAFF, rồi push. Trả True nếu là sự kiện mới."""
    with engine().begin() as c:
        created = notify.create(c, type=msg["type"], title=msg["title"], content=msg.get("content", ""),
                                dedupe_key=msg["dedupeKey"], staff=True,
                                data={"roomId": msg.get("roomId"), "deviceId": msg.get("deviceId")})
    if created:                              # sau commit; push không ném lỗi (FCM hỏng không làm tin này bị thử lại)
        notify.push_to_staff(msg["title"], msg.get("content", ""),
                             {"type": msg["type"], "roomId": msg.get("roomId"), "deviceId": msg.get("deviceId")})
    return created


def deliver(body: bytes, sleep=time.sleep) -> tuple[str, str | None]:
    """Xử lý một tin, trả ("ack", None) hoặc ("dead", lý do)."""
    last = ""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            created = handle(parse(body))
            metrics.ALERT_EVENTS.labels("stored" if created else "duplicate").inc()
            return "ack", None
        except BadMessage as e:
            log.error("Tin hỏng, chuyển sang %s: %s | %s", DEAD_QUEUE, e, body[:200])
            metrics.ALERT_EVENTS.labels("dead").inc()
            return "dead", f"tin hỏng: {e}"
        except Exception as e:                  # noqa: BLE001
            last = f"{e.__class__.__name__}: {e}"
            log.exception("Xử lý sự kiện lỗi (lần %d/%d)", attempt, MAX_ATTEMPTS)
            if attempt < MAX_ATTEMPTS:
                sleep(BACKOFF[attempt - 1])
    log.error("Bỏ cuộc sau %d lần, chuyển sang %s", MAX_ATTEMPTS, DEAD_QUEUE)
    metrics.ALERT_EVENTS.labels("dead").inc()
    return "dead", f"lỗi sau {MAX_ATTEMPTS} lần thử: {last}"


def _dead_letter(ch, body: bytes, reason: str) -> None:
    ch.basic_publish("", DEAD_QUEUE, body, pika.BasicProperties(
        delivery_mode=2, headers={"reason": reason[:500], "failedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}))


def _run() -> None:
    while True:
        try:
            conn = pika.BlockingConnection(rabbit.params())
            ch = conn.channel()
            ch.confirm_delivery()                    # chỉ ack tin gốc sau khi hàng đợi lỗi đã nhận
            ch.queue_declare(queue=ALERTS_QUEUE, durable=True)
            ch.queue_declare(queue=DEAD_QUEUE, durable=True)
            ch.basic_qos(prefetch_count=10)
            log.info("Consumer đang nghe %s", ALERTS_QUEUE)
            metrics.CONSUMER_CONNECTED.set(1)
            for method, _props, body in ch.consume(ALERTS_QUEUE):
                verdict, reason = deliver(body)
                if verdict == "dead":
                    _dead_letter(ch, body, reason or "")
                ch.basic_ack(method.delivery_tag)
        except Exception:                           # noqa: BLE001
            metrics.CONSUMER_CONNECTED.set(0)
            log.warning("Mất kết nối RabbitMQ, thử lại sau 5 giây")
            time.sleep(5)


def start() -> None:
    threading.Thread(target=_run, name="alerts-consumer", daemon=True).start()

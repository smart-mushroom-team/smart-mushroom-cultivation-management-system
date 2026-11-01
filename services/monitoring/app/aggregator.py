"""Aggregator DỰ PHÒNG cho luồng NiFi (FR-53): đọc telemetry.events và gộp 5 phút vào sensor_aggregates bằng ĐÚNG câu SQL của NiFi
(app/upsert_aggregate.sql). Mặc định KHÔNG chạy; NiFi là thành phần chính.

Dùng khi: NiFi chưa dựng xong / bị lỗi lúc demo, hoặc muốn chạy test toàn luồng mà không có NiFi.
    docker compose --profile fallback up -d aggregator

Chạy cùng lúc với NiFi cũng không làm đếm đôi: mỗi tin trong hàng đợi chỉ giao cho MỘT consumer (hai bên chia nhau tin).
Giao tin at-least-once: mất kết nối sau khi ghi DB mà chưa ack thì tin được giao lại và cộng thêm một lần (sai số tối đa vài lần đo).
"""
import datetime as dt
import json
import logging
import math
import pathlib
import re
import time
import uuid

import pika
from sqlalchemy import text

from common import rabbit
from common.db import engine
from common.events import TELEMETRY_QUEUE

log = logging.getLogger("aggregator")
SQL_FILE = pathlib.Path(__file__).with_name("upsert_aggregate.sql")


class BadEvent(Exception):
    """Sự kiện không đúng hợp đồng (libs/common/common/events.py): thử lại cũng vô ích, bỏ qua."""


def load_sql() -> str:
    """Câu SQL kiểu JDBC (dấu ?), đã bỏ dòng chú thích."""
    return "\n".join(ln for ln in SQL_FILE.read_text(encoding="utf8").splitlines() if not ln.lstrip().startswith("--"))


def named_sql() -> tuple[str, int]:
    """Đổi ? thành :p1, :p2... cho SQLAlchemy. Trả (câu SQL, số tham số)."""
    n = 0

    def repl(_):
        nonlocal n
        n += 1
        return f":p{n}"
    return re.sub(r"\?", repl, load_sql()), n


_SQL, _N_PARAMS = named_sql()


def _number(v, name: str) -> str:
    if v is None:
        return ""
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
        raise BadEvent(f"'{name}' không phải số hợp lệ")
    return str(v)


def parse(body: bytes) -> tuple[str, str, str, str]:
    """Kiểm tra tin và trả bốn tham số của câu SQL theo thứ tự (roomId, recordedAt, temperature, humidity)."""
    try:
        ev = json.loads(body)
    except (ValueError, TypeError) as e:
        raise BadEvent("không phải JSON hợp lệ") from e
    if not isinstance(ev, dict):
        raise BadEvent("thông điệp phải là một object JSON")
    try:
        room = str(uuid.UUID(str(ev.get("roomId"))))
    except ValueError as e:
        raise BadEvent("roomId không phải uuid") from e
    try:
        ts = dt.datetime.fromisoformat(str(ev.get("recordedAt")))
    except ValueError as e:
        raise BadEvent("recordedAt không phải thời gian ISO 8601") from e
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt.timezone.utc)
    t, h = _number(ev.get("temperature"), "temperature"), _number(ev.get("humidity"), "humidity")
    if not t and not h:
        raise BadEvent("cần ít nhất temperature hoặc humidity")
    return room, ts.isoformat(), t, h


def apply(params: tuple[str, str, str, str]) -> None:
    assert _N_PARAMS == len(params) == 4
    with engine().begin() as c:
        c.execute(text(_SQL), {f"p{i}": v for i, v in enumerate(params, 1)})


def on_message(ch, tag: int, body: bytes, sleep=time.sleep) -> str:
    """Xử lý một tin. Trả 'ack' | 'dropped' | 'retry'. Tin hỏng bỏ đi (số liệu thô vẫn nằm ở sensor_readings); lỗi DB thì trả tin về hàng đợi."""
    try:
        apply(parse(body))
    except BadEvent as e:
        log.error("Bỏ tin telemetry hỏng: %s | %s", e, body[:200])
        ch.basic_ack(tag)
        return "dropped"
    except Exception:                       # noqa: BLE001  # DB bận/sập: không mất tin
        log.exception("Ghi tổng hợp lỗi, trả tin về hàng đợi")
        ch.basic_nack(tag, requeue=True)
        sleep(2)
        return "retry"
    ch.basic_ack(tag)
    return "ack"


def run() -> None:
    while True:
        try:
            with pika.BlockingConnection(rabbit.params()) as conn:
                ch = conn.channel()
                ch.queue_declare(queue=TELEMETRY_QUEUE, durable=True)
                ch.basic_qos(prefetch_count=50)
                log.info("Aggregator dự phòng đang nghe %s", TELEMETRY_QUEUE)
                for method, _props, body in ch.consume(TELEMETRY_QUEUE):
                    on_message(ch, method.delivery_tag, body)
        except Exception:                   # noqa: BLE001
            log.warning("Mất kết nối RabbitMQ, thử lại sau 5 giây")
            time.sleep(5)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    run()

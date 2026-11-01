"""Đẩy lại các tin trong hàng đợi lỗi về alerts.events (sau khi đã sửa nguyên nhân, ví dụ DB từng bị sập).

    docker compose exec core python -m app.replay            # đẩy lại tất cả
    docker compose exec core python -m app.replay --max 10   # chỉ 10 tin
    docker compose exec core python -m app.replay --discard  # xóa hết, không đẩy lại (tin hỏng thật sự)

Tin đã được xử lý trước đó vẫn an toàn khi đẩy lại: dedupeKey chặn thông báo trùng.
"""
import argparse

import pika

from common import rabbit
from common.events import ALERTS_QUEUE

from .consumer import DEAD_QUEUE


def replay(max_messages: int | None = None, discard: bool = False) -> int:
    n = 0
    with pika.BlockingConnection(rabbit.params()) as conn:
        ch = conn.channel()
        ch.confirm_delivery()
        ch.queue_declare(queue=DEAD_QUEUE, durable=True)
        ch.queue_declare(queue=ALERTS_QUEUE, durable=True)
        while max_messages is None or n < max_messages:
            method, _props, body = ch.basic_get(DEAD_QUEUE, auto_ack=False)
            if method is None:
                break
            if not discard:                            # chỉ ack khỏi hàng đợi lỗi khi alerts.events đã nhận
                ch.basic_publish("", ALERTS_QUEUE, body, pika.BasicProperties(delivery_mode=2, content_type="application/json"))
            ch.basic_ack(method.delivery_tag)
            n += 1
    return n


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--max", type=int, help="số tin tối đa")
    ap.add_argument("--discard", action="store_true", help="xóa thay vì đẩy lại")
    a = ap.parse_args()
    print(f"{'Đã xóa' if a.discard else 'Đã đẩy lại'} {replay(a.max, a.discard)} tin")

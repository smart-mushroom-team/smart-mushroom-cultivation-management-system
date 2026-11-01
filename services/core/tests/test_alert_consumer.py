"""Core nhận sự kiện cảnh báo từ Monitoring (alerts.events): lưu thông báo cho Operator/Admin, xử lý lặp không tạo trùng (BR-19)."""
from sqlalchemy import text

from app import consumer

OFFLINE = {"type": "DEVICE_OFFLINE", "title": "Cảm biến A mất kết nối", "content": "Không nhận được dữ liệu quá 90 giây",
           "roomId": "11111111-1111-1111-1111-111111111111", "deviceId": "22222222-2222-2222-2222-222222222222",
           "dedupeKey": "DEVICE_OFFLINE:22222222-2222-2222-2222-222222222222:2030-01-01T00:00:00+00:00"}


def staff_notes(client, h):
    return client.get("/notifications", headers=h).json()


def test_event_becomes_staff_notification(client, operator, admin, customer):
    consumer.handle(OFFLINE)
    for h in (operator, admin):                                   # cả Operator và Admin đều thấy (recipient_role=STAFF)
        (n,) = staff_notes(client, h)
        assert n["type"] == "DEVICE_OFFLINE" and n["title"].startswith("Cảm biến A") and n["data"]["roomId"] == OFFLINE["roomId"]
    assert staff_notes(client, customer) == []                    # khách không nhận cảnh báo hạ tầng


def test_redelivered_event_creates_no_duplicate(client, operator, db):
    for _ in range(3):                                            # RabbitMQ giao lại cùng một sự kiện
        consumer.handle(OFFLINE)
    assert len(staff_notes(client, operator)) == 1
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM notifications")).scalar() == 1


def test_new_incident_with_new_key_creates_new_notification(client, operator):
    consumer.handle(OFFLINE)
    consumer.handle({**OFFLINE, "dedupeKey": OFFLINE["dedupeKey"] + "-2"})
    assert len(staff_notes(client, operator)) == 2


def test_threshold_and_online_events_are_accepted(client, operator):
    consumer.handle({"type": "TEMP_OUT_OF_RANGE", "title": "Cảnh báo nhiệt độ vượt ngưỡng", "content": "Nhiệt độ 37°C",
                     "roomId": OFFLINE["roomId"], "deviceId": OFFLINE["deviceId"], "dedupeKey": "TEMP:r:2030-01-01T00:00:00"})
    consumer.handle({"type": "DEVICE_ONLINE", "title": "x đã hoạt động trở lại", "dedupeKey": "DEVICE_ONLINE:d:t"})   # content tùy chọn
    assert {n["type"] for n in staff_notes(client, operator)} == {"TEMP_OUT_OF_RANGE", "DEVICE_ONLINE"}


# ================================================================ parse: tin hỏng
import json  # noqa: E402

import pika  # noqa: E402
import pytest  # noqa: E402

from app import replay  # noqa: E402

GOOD = json.dumps(OFFLINE).encode()


@pytest.mark.parametrize("body", [
    b"khong phai json", b"[1, 2]", b"null", b"{}", None,
    json.dumps({**OFFLINE, "dedupeKey": ""}).encode(),            # trống
    json.dumps({**OFFLINE, "title": "   "}).encode(),             # chỉ có khoảng trắng
    json.dumps({**OFFLINE, "type": 5}).encode(),                  # sai kiểu
    json.dumps({k: v for k, v in OFFLINE.items() if k != "dedupeKey"}).encode(),
])
def test_parse_rejects_bad_messages(body):
    with pytest.raises(consumer.BadMessage):
        consumer.parse(body)


def test_parse_accepts_minimal_valid_message():
    assert consumer.parse(b'{"type":"X","title":"t","dedupeKey":"k"}')["type"] == "X"


# ================================================================ deliver: ack / thử lại / hàng đợi lỗi
def test_deliver_good_message_is_acked_and_stored(client, operator):
    assert consumer.deliver(GOOD) == ("ack", None)
    assert len(staff_notes(client, operator)) == 1


def test_deliver_bad_message_goes_dead_without_retrying(monkeypatch):
    calls, sleeps = [], []
    monkeypatch.setattr(consumer, "handle", lambda m: calls.append(m))
    verdict, reason = consumer.deliver(b"{}", sleep=sleeps.append)
    assert verdict == "dead" and "tin hỏng" in reason
    assert calls == [] and sleeps == []                           # tin hỏng: không xử lý, không chờ thử lại


def test_deliver_retries_transient_failure_then_succeeds(monkeypatch):
    attempts, sleeps = [], []

    def flaky(msg):
        attempts.append(1)
        if len(attempts) < 3:
            raise RuntimeError("DB bận")
        return True
    monkeypatch.setattr(consumer, "handle", flaky)
    assert consumer.deliver(GOOD, sleep=sleeps.append) == ("ack", None)
    assert len(attempts) == 3 and sleeps == [1, 2]                # lùi dần 1s, 2s


def test_deliver_gives_up_after_max_attempts(monkeypatch):
    attempts, sleeps = [], []
    monkeypatch.setattr(consumer, "handle", lambda m: attempts.append(1) or (_ for _ in ()).throw(RuntimeError("DB sập")))
    verdict, reason = consumer.deliver(GOOD, sleep=sleeps.append)
    assert verdict == "dead" and "RuntimeError: DB sập" in reason and str(consumer.MAX_ATTEMPTS) in reason
    assert len(attempts) == consumer.MAX_ATTEMPTS and sleeps == [1, 2, 4]


# ================================================================ pika giả: vòng nghe, hàng đợi lỗi, replay
class Stop(BaseException):
    """Thoát khỏi vòng `while True` của consumer trong test (không bị `except Exception` nuốt)."""


class FakeChannel:
    def __init__(self, incoming=(), dead=(), fail_dead_publish=False):
        self.incoming, self.dead = list(incoming), list(dead)
        self.fail_dead_publish = fail_dead_publish
        self.events = []                                            # thứ tự thao tác thật sự xảy ra

    def confirm_delivery(self): ...
    def queue_declare(self, queue, durable=False): ...
    def basic_qos(self, prefetch_count): ...

    def consume(self, queue):
        for i, body in enumerate(self.incoming, 1):
            yield type("M", (), {"delivery_tag": i})(), None, body
        raise pika.exceptions.AMQPConnectionError("mất kết nối")          # hết tin thì broker "đứt", consumer phải kết nối lại

    def basic_publish(self, exchange, routing_key, body, properties=None):
        if routing_key == consumer.DEAD_QUEUE and self.fail_dead_publish:
            raise pika.exceptions.UnroutableError([])
        self.events.append(("publish", routing_key, body, properties))

    def basic_ack(self, tag):
        self.events.append(("ack", tag))

    def basic_get(self, queue, auto_ack=False):
        if not self.dead:
            return None, None, None
        return type("M", (), {"delivery_tag": 100 + len(self.events)})(), None, self.dead.pop(0)


class FakeConn:
    def __init__(self, ch):
        self.ch = ch

    def channel(self):
        return self.ch

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def run_loop(monkeypatch, ch):
    monkeypatch.setattr(consumer.rabbit, "params", lambda: None)                                # không phụ thuộc biến RABBITMQ_*
    monkeypatch.setattr(pika, "BlockingConnection", lambda params: FakeConn(ch))
    monkeypatch.setattr(consumer.time, "sleep", lambda s: (_ for _ in ()).throw(Stop()))        # lần mất kết nối đầu tiên thì dừng
    with pytest.raises(Stop):
        consumer._run()


def test_loop_acks_everything_and_dead_letters_the_bad_one_first(client, operator, monkeypatch):
    other = json.dumps({**OFFLINE, "dedupeKey": "khac"}).encode()
    ch = FakeChannel(incoming=[GOOD, b"rac ruoi", other])
    run_loop(monkeypatch, ch)
    assert [e[0] for e in ch.events] == ["ack", "publish", "ack", "ack"]       # tin hỏng được cất vào hàng đợi lỗi TRƯỚC khi ack
    _, queue, body, props = ch.events[1]
    assert queue == consumer.DEAD_QUEUE and body == b"rac ruoi"
    assert "tin hỏng" in props.headers["reason"] and props.headers["failedAt"].endswith("Z") and props.delivery_mode == 2
    assert [e[1] for e in ch.events if e[0] == "ack"] == [1, 2, 3]
    assert len(staff_notes(client, operator)) == 2                             # hai tin tốt đều được lưu


def test_loop_does_not_ack_when_dead_letter_publish_fails(monkeypatch):
    """Không cất được vào hàng đợi lỗi thì KHÔNG ack: RabbitMQ giao lại, không mất tin."""
    ch = FakeChannel(incoming=[b"rac ruoi"], fail_dead_publish=True)
    run_loop(monkeypatch, ch)
    assert [e for e in ch.events if e[0] == "ack"] == []


def test_replay_moves_messages_back_and_acks_after_publishing(monkeypatch):
    ch = FakeChannel(dead=[b"a", b"b", b"c"])
    monkeypatch.setattr(replay.rabbit, "params", lambda: None)
    monkeypatch.setattr(pika, "BlockingConnection", lambda params: FakeConn(ch))
    assert replay.replay(max_messages=2) == 2
    kinds = [(e[0], e[1] if e[0] == "publish" else None) for e in ch.events]
    assert kinds == [("publish", "alerts.events"), ("ack", None), ("publish", "alerts.events"), ("ack", None)]   # publish rồi mới ack
    assert ch.dead == [b"c"]


def test_replay_all_and_discard(monkeypatch):
    monkeypatch.setattr(replay.rabbit, "params", lambda: None)
    ch = FakeChannel(dead=[b"a", b"b"])
    monkeypatch.setattr(pika, "BlockingConnection", lambda params: FakeConn(ch))
    assert replay.replay() == 2 and [e[0] for e in ch.events] == ["publish", "ack", "publish", "ack"]
    ch2 = FakeChannel(dead=[b"a", b"b"])
    monkeypatch.setattr(pika, "BlockingConnection", lambda params: FakeConn(ch2))
    assert replay.replay(discard=True) == 2 and [e[0] for e in ch2.events] == ["ack", "ack"]       # xóa: không đẩy lại
    assert replay.replay(discard=True) == 0


def test_replayed_message_is_safe_after_it_was_already_processed(client, operator):
    consumer.deliver(GOOD)
    consumer.deliver(GOOD)                                                     # như khi đẩy lại tin đã xử lý trước đó
    assert len(staff_notes(client, operator)) == 1


# ================================================================ chỉ số Prometheus
def _m(name, **labels):
    from prometheus_client import REGISTRY
    return REGISTRY.get_sample_value(name, labels) or 0


def test_event_metrics_stored_duplicate_dead(client, operator, monkeypatch):
    series = {r: _m("mushroom_alert_events_total", result=r) for r in ("stored", "duplicate", "dead")}
    key = json.dumps({**OFFLINE, "dedupeKey": "metrics-1"}).encode()
    consumer.deliver(key)
    consumer.deliver(key)                                                      # giao lại: trùng
    consumer.deliver(b"rac ruoi")                                              # hỏng
    monkeypatch.setattr(consumer, "handle", lambda m: (_ for _ in ()).throw(RuntimeError("DB sập")))
    consumer.deliver(GOOD, sleep=lambda s: None)                               # lỗi tạm thời hết lượt thử: cũng vào hàng đợi lỗi
    now = {r: _m("mushroom_alert_events_total", result=r) for r in series}
    assert {r: now[r] - series[r] for r in series} == {"stored": 1, "duplicate": 1, "dead": 2}


def test_consumer_connected_gauge_follows_the_connection(monkeypatch):
    seen = []
    ch = FakeChannel()
    orig = ch.consume

    def consume(queue):
        seen.append(_m("mushroom_alert_consumer_connected"))                   # đang nghe: phải là 1
        yield from orig(queue)
    ch.consume = consume
    monkeypatch.setattr(consumer.rabbit, "params", lambda: None)
    monkeypatch.setattr(pika, "BlockingConnection", lambda params: FakeConn(ch))

    def stop(_):
        seen.append(_m("mushroom_alert_consumer_connected"))                    # lúc này đã mất kết nối
        raise Stop()
    monkeypatch.setattr(consumer.time, "sleep", stop)
    with pytest.raises(Stop):
        consumer._run()
    assert seen == [1, 0]

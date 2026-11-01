"""rabbit.declare: tạo sẵn hàng đợi bền khi service khởi động, không bao giờ ném lỗi."""
import pika

from common import rabbit


class FakeCh:
    def __init__(self):
        self.declared = []

    def queue_declare(self, queue, durable=False):
        self.declared.append((queue, durable))


class FakeConn:
    def __init__(self, ch):
        self.ch = ch

    def channel(self):
        return self.ch

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_declare_creates_every_queue_durable(monkeypatch):
    ch = FakeCh()
    monkeypatch.setattr(rabbit, "params", lambda: None)
    monkeypatch.setattr(pika, "BlockingConnection", lambda p: FakeConn(ch))
    assert rabbit.declare("telemetry.events", "alerts.events") is True
    assert ch.declared == [("telemetry.events", True), ("alerts.events", True)]


def test_declare_never_raises_when_broker_is_down(monkeypatch):
    calls = []

    def boom(p):
        calls.append(1)
        raise pika.exceptions.AMQPConnectionError("không nối được")
    monkeypatch.setattr(rabbit, "params", lambda: None)
    monkeypatch.setattr(pika, "BlockingConnection", boom)
    monkeypatch.setattr(rabbit.time, "sleep", lambda s: None)
    assert rabbit.declare("q", retries=3) is False and len(calls) == 3

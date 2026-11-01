"""Bước 3: đường đi của push FCM (BR-18, FR-43). Firebase được thay bằng bản giả: không gọi mạng, không cần service account.

Kiểm: đăng ký/chuyển/hủy token, push theo vai trò, nội dung gửi đi, xóa token chết nhưng giữ token lỗi tạm thời,
chia lô 500 token, một lô hỏng không làm mất lô sau, và FCM hỏng không bao giờ làm hỏng nghiệp vụ."""
import datetime as dt
import uuid

import pytest
from conftest import make_token, rent
from sqlalchemy import text

from app import consumer, lifecycle, notify

D = dt.date


# ---------------------------------------------------------------- firebase giả
class FakeFcm:
    """Ghi lại từng lần gọi send_each_for_multicast. Quy ước token: bắt đầu bằng 'dead-' -> Unregistered, 'bad-' -> không phải token
    hợp lệ (INVALID_ARGUMENT), 'busy-' -> quá tải tạm thời, còn lại thành công. Token 'boom-' làm cả lô ném lỗi (mất mạng)."""

    def __init__(self, messaging):
        self.m = messaging
        self.calls = []

    def __call__(self, message):
        self.calls.append(message)
        if any(t.startswith("boom-") for t in message.tokens):
            raise ConnectionError("mất mạng")
        out = []
        for t in message.tokens:
            if t.startswith("dead-"):
                out.append(self.m.SendResponse(None, self.m.UnregisteredError("Requested entity was not found.")))
            elif t.startswith("bad-"):
                out.append(self.m.SendResponse(None, ValueError("The registration token is not a valid FCM registration token")))
            elif t.startswith("busy-"):
                out.append(self.m.SendResponse(None, self.m.QuotaExceededError("Quota exceeded")))
            else:
                out.append(self.m.SendResponse({"name": "projects/x/messages/1"}, None))
        return self.m.BatchResponse(out)


@pytest.fixture()
def fcm(monkeypatch):
    from firebase_admin import messaging
    fake = FakeFcm(messaging)
    monkeypatch.setenv("FCM_DRY_RUN", "false")
    monkeypatch.setattr(notify, "_init", lambda: None)
    monkeypatch.setattr(messaging, "send_each_for_multicast", fake)
    return fake


def tokens_in_db(db):
    with db.connect() as c:
        return {r[0] for r in c.execute(text("SELECT token FROM device_tokens"))}


def insert_tokens(db, user_id, tokens, role="CUSTOMER"):
    with db.begin() as c:
        for t in tokens:
            c.execute(text("INSERT INTO device_tokens(user_id,token,role) VALUES (:u,:t,:r)"), {"u": user_id, "t": t, "r": role})


def reg(client, h, token, platform="android"):
    r = client.post("/notifications/device-tokens", json={"token": token, "platform": platform}, headers=h)
    assert r.status_code == 200, r.text


def sent_tokens(fcm):
    return [t for call in fcm.calls for t in call.tokens]


# ================================================================ đăng ký token (FR-43)
def test_register_token_requires_login_and_valid_body(client, customer):
    assert client.post("/notifications/device-tokens", json={"token": "abcdefgh1"}).status_code == 401
    assert client.post("/notifications/device-tokens", json={"token": "ngan"}, headers=customer).status_code == 422
    assert client.post("/notifications/device-tokens", json={"token": "abcdefgh1", "platform": "windows"}, headers=customer).status_code == 422


def test_register_twice_keeps_one_row(client, customer, db):
    reg(client, customer, "token-aaaaaaaa")
    reg(client, customer, "token-aaaaaaaa")
    assert tokens_in_db(db) == {"token-aaaaaaaa"}


def test_token_follows_the_logged_in_user_and_role(client, operator, customer, db):
    """Cùng một máy: Operator đăng xuất, khách đăng nhập -> token thuộc khách và không còn nhận cảnh báo hạ tầng."""
    reg(client, operator, "shared-phone-1")
    with db.connect() as c:
        assert c.execute(text("SELECT role FROM device_tokens")).scalar() == "OPERATOR"
    reg(client, customer, "shared-phone-1")
    with db.connect() as c:
        assert c.execute(text("SELECT role FROM device_tokens")).scalar() == "CUSTOMER"
    assert notify.push_to_staff("t", "b") == 0


def test_unregister_removes_only_own_token(client, customer, db):
    other = make_token("CUSTOMER")
    reg(client, customer, "token-mine-0001")
    reg(client, other, "token-theirs-01")
    client.delete("/notifications/device-tokens/token-theirs-01", headers=customer)        # xóa token của người khác: không có tác dụng
    assert tokens_in_db(db) == {"token-mine-0001", "token-theirs-01"}
    client.delete("/notifications/device-tokens/token-mine-0001", headers=customer)
    assert tokens_in_db(db) == {"token-theirs-01"}


# ================================================================ chế độ chạy thử và kiểm tra FCM
def test_test_push_endpoint_reports_state(client, customer, monkeypatch):
    monkeypatch.setenv("FCM_DRY_RUN", "true")
    assert client.post("/notifications/test-push").status_code == 401
    r = client.post("/notifications/test-push", headers=customer).json()
    assert r == {"registeredTokens": 0, "sent": 0, "dryRun": True}
    reg(client, customer, "token-aaaaaaaa")
    r = client.post("/notifications/test-push", headers=customer).json()
    assert r == {"registeredTokens": 1, "sent": 1, "dryRun": True}


def test_test_push_endpoint_sends_only_to_my_devices(client, customer, fcm):
    reg(client, customer, "mine-0000001")
    reg(client, make_token("CUSTOMER"), "other-000001")
    r = client.post("/notifications/test-push", headers=customer).json()
    assert r == {"registeredTokens": 1, "sent": 1, "dryRun": False}
    assert sent_tokens(fcm) == ["mine-0000001"]


def test_describe_mode_tells_the_truth(monkeypatch, tmp_path):
    monkeypatch.setenv("FCM_DRY_RUN", "true")
    assert "dry-run" in notify.describe_mode()
    monkeypatch.setenv("FCM_DRY_RUN", "false")
    monkeypatch.setenv("FIREBASE_CREDENTIALS_FILE", str(tmp_path / "khong-co.json"))
    assert "ĐÃ BẬT" in notify.describe_mode() and "khong-co.json" in notify.describe_mode()
    f = tmp_path / "sa.json"
    f.write_text("{}")
    monkeypatch.setenv("FIREBASE_CREDENTIALS_FILE", str(f))
    assert "gửi thật" in notify.describe_mode() and "ĐÃ BẬT" not in notify.describe_mode()


# ================================================================ push theo vai trò
def test_staff_push_reaches_admin_and_operator_only(client, db, fcm):
    insert_tokens(db, str(uuid.uuid4()), ["admin-phone-01"], "ADMIN")
    insert_tokens(db, str(uuid.uuid4()), ["oper-phone-001"], "OPERATOR")
    insert_tokens(db, str(uuid.uuid4()), ["cust-phone-001"], "CUSTOMER")
    assert notify.push_to_staff("Cảnh báo", "Nhiệt độ cao") == 2
    assert sorted(sent_tokens(fcm)) == ["admin-phone-01", "oper-phone-001"]


def test_user_push_reaches_only_that_user(client, db, fcm):
    u1, u2 = str(uuid.uuid4()), str(uuid.uuid4())
    insert_tokens(db, u1, ["u1-phone-a", "u1-phone-b"])
    insert_tokens(db, u2, ["u2-phone-a"])
    assert notify.push_to_user(u1, "t", "b") == 2
    assert sorted(sent_tokens(fcm)) == ["u1-phone-a", "u1-phone-b"]


def test_no_tokens_means_no_fcm_call(client, db, fcm):
    assert notify.push_to_user(str(uuid.uuid4()), "t", "b") == 0 and notify.push_to_staff("t", "b") == 0
    assert fcm.calls == []


# ================================================================ nội dung gửi đi
def test_message_content(client, db, fcm):
    u = str(uuid.uuid4())
    insert_tokens(db, u, ["phone-000001"])
    notify.push_to_user(u, "Tiêu đề", "Nội dung", {"type": "X", "roomId": None, "n": 5})
    (msg,) = fcm.calls
    assert msg.notification.title == "Tiêu đề" and msg.notification.body == "Nội dung"
    assert msg.data == {"type": "X", "n": "5"}                         # data của FCM phải là chuỗi; None bị bỏ
    assert msg.android.priority == "high"


# ================================================================ token chết / lỗi tạm thời (BR-18)
def test_dead_tokens_are_deleted_and_transient_failures_kept(client, db, fcm):
    u = str(uuid.uuid4())
    insert_tokens(db, u, ["good-0000001", "dead-0000001", "bad-00000001", "busy-0000001"])
    assert notify.push_to_user(u, "t", "b") == 1
    assert tokens_in_db(db) == {"good-0000001", "busy-0000001"}        # Unregistered và 'không phải token hợp lệ' bị xóa; quá tải thì giữ


def test_batches_of_500_and_a_failed_batch_does_not_lose_the_next(client, db, fcm):
    u = str(uuid.uuid4())
    toks = [f"t{i:05d}-phone" for i in range(1203)]
    toks[600] = "boom-0000001"                                        # token làm hỏng lô chứa nó (id là UUID nên không biết lô nào)
    insert_tokens(db, u, toks)
    sent = notify.push_to_user(u, "t", "b")
    assert sorted(len(c.tokens) for c in fcm.calls) == [203, 500, 500]
    failed = [c for c in fcm.calls if any(t.startswith("boom-") for t in c.tokens)]
    assert len(failed) == 1
    assert sent == 1203 - len(failed[0].tokens)                       # chỉ lô hỏng không tính; các lô còn lại (kể cả lô sau nó) vẫn được gửi
    assert len(tokens_in_db(db)) == 1203                              # lỗi mạng không bị coi là token chết


# ================================================================ FCM hỏng không làm hỏng nghiệp vụ
def test_fcm_down_never_breaks_the_alert_pipeline(client, operator, db, monkeypatch):
    monkeypatch.setenv("FCM_DRY_RUN", "false")
    monkeypatch.setattr(notify, "_init", lambda: (_ for _ in ()).throw(RuntimeError("không thấy service account")))
    insert_tokens(db, str(uuid.uuid4()), ["oper-phone-001"], "OPERATOR")
    msg = {"type": "DEVICE_OFFLINE", "title": "Cảm biến A mất kết nối", "dedupeKey": "k1", "roomId": "r"}
    assert consumer.handle(msg) is True                               # không ném lỗi
    assert len(client.get("/notifications", headers=operator).json()) == 1       # thông báo vẫn nằm trong DB
    assert len(tokens_in_db(db)) == 1                                 # và token không bị xóa oan


# ================================================================ điểm đặt push trong nghiệp vụ
@pytest.fixture()
def pushes(monkeypatch):
    log = {"user": [], "staff": []}
    monkeypatch.setattr(notify, "push_to_user", lambda uid, title, body, data=None: log["user"].append((uid, title)) or 1)
    monkeypatch.setattr(notify, "push_to_staff", lambda title, body, data=None: log["staff"].append((title, data)) or 1)
    return log


def test_renting_pushes_customer_and_staff(client, farm, pushes):
    h, uid, r = rent(client, farm)
    assert pushes["user"] == [(uid, "Thuê khay thành công")]
    assert pushes["staff"] == [("Có đơn thuê mới", {"type": "NEW_RENTAL", "rentalId": r["id"]})]


def test_alert_event_pushes_staff_once_even_if_redelivered(client, operator, pushes):
    ev = {"type": "TEMP_OUT_OF_RANGE", "title": "Cảnh báo nhiệt độ vượt ngưỡng", "content": "37°C", "dedupeKey": "TEMP:r:t", "roomId": "r"}
    for _ in range(3):                                                # RabbitMQ giao lại: thông báo và push chỉ một lần
        consumer.handle(ev)
    assert pushes["staff"] == [("Cảnh báo nhiệt độ vượt ngưỡng", {"type": "TEMP_OUT_OF_RANGE", "roomId": "r", "deviceId": None})]


def test_expiry_completion_pushes_customer_once(client, farm, operator, pushes, db):
    from conftest import advance, cycles
    h, uid, r = rent(client, farm)
    cid = cycles(client, operator)[0]["id"]
    advance(client, operator, cid, "INCUBATING", "FRUITING")
    client.post(f"/cycles/{cid}/harvest", json={"weightKg": 1}, headers=operator)
    pushes["user"].clear()
    with db.begin() as c:
        c.execute(text("UPDATE rentals SET end_date=:e, start_date=LEAST(start_date,:e) WHERE id=:i"), {"e": D(2030, 1, 1), "i": r["id"]})
    lifecycle.run_expiry(D(2030, 1, 2))
    lifecycle.run_expiry(D(2030, 1, 3))
    assert pushes["user"] == [(uid, "Đơn thuê đã hoàn tất")]


# ================================================================ chỉ số Prometheus
def metric(name, **labels):
    from prometheus_client import REGISTRY
    return REGISTRY.get_sample_value(name, labels) or 0


def test_push_metrics_count_each_outcome(db, fcm, monkeypatch):
    uid = str(uuid.uuid4())
    before = {r: metric("mushroom_push_total", target="user", result=r) for r in ("sent", "failed", "dry_run", "no_token")}
    notify.push_to_user(uid, "t", "b")                                              # chưa có token nào
    insert_tokens(db, uid, ["ok-0000000001", "dead-0000001"])
    dead_before = metric("mushroom_push_dead_tokens_total")
    notify.push_to_user(uid, "t", "b")                                              # một token sống -> sent, một token chết bị xóa
    assert metric("mushroom_push_dead_tokens_total") == dead_before + 1
    with db.begin() as c:
        c.execute(text("DELETE FROM device_tokens"))
    insert_tokens(db, uid, ["busy-0000001"])
    notify.push_to_user(uid, "t", "b")                                              # FCM từ chối tạm thời, không ai nhận được -> failed
    monkeypatch.setenv("FCM_DRY_RUN", "true")
    notify.push_to_user(uid, "t", "b")
    after = {r: metric("mushroom_push_total", target="user", result=r) for r in before}
    assert {r: after[r] - before[r] for r in before} == {"sent": 1, "failed": 1, "dry_run": 1, "no_token": 1}


def test_push_metrics_failure_when_firebase_blows_up(db, fcm):
    insert_tokens(db, str(uuid.uuid4()), ["boom-00000001"], role="OPERATOR")
    before = metric("mushroom_push_total", target="staff", result="failed")
    assert notify.push_to_staff("t", "b") == 0
    assert metric("mushroom_push_total", target="staff", result="failed") == before + 1


def test_metrics_endpoint_exposes_core_series(client):
    body = client.get("/metrics").text
    for series in ("mushroom_alert_events_total", "mushroom_alert_consumer_connected", "mushroom_push_total", "mushroom_push_dead_tokens_total"):
        assert series in body, series

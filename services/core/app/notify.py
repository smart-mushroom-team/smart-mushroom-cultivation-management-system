"""Tạo thông báo (luôn lưu DB trước) và gửi push FCM như kênh bổ sung (BR-18, NFR-20).

Quy ước: push chỉ gọi SAU khi giao dịch nghiệp vụ đã commit, và không bao giờ ném lỗi ra ngoài – FCM hỏng thì thông báo
vẫn nằm trong DB và ứng dụng vẫn đọc được.
"""
import json
import logging
import os

from sqlalchemy import text

from common.db import engine

from . import metrics

log = logging.getLogger("notify")
STAFF_ROLES = ("ADMIN", "OPERATOR")
BATCH = 500                                  # FCM chỉ nhận tối đa 500 token cho một lần gửi nhiều token
_fcm_ready = False


def dry_run() -> bool:
    return os.getenv("FCM_DRY_RUN", "true").lower() == "true"


def describe_mode() -> str:
    """Một dòng cho log khởi động, để biết ngay push đang chạy kiểu nào."""
    if dry_run():
        return "FCM: dry-run (chỉ ghi log, không gửi thật). Đặt FCM_DRY_RUN=false và tệp service account để gửi thật"
    path = os.getenv("FIREBASE_CREDENTIALS_FILE", "")
    if os.path.isfile(path):
        return f"FCM: gửi thật, service account {path}"
    return f"FCM: ĐÃ BẬT gửi thật nhưng không thấy tệp service account ({path or 'chưa đặt FIREBASE_CREDENTIALS_FILE'}): push sẽ lỗi"


def create(conn, *, type: str, title: str, content: str = "", dedupe_key: str,
           user_id: str | None = None, staff: bool = False, data: dict | None = None) -> bool:
    """Trả True nếu tạo mới; xử lý lặp trả False (ON CONFLICT DO NOTHING)."""
    r = conn.execute(text("""
        INSERT INTO notifications(recipient_user_id, recipient_role, type, title, content, data, dedupe_key)
        VALUES (:u, :r, :t, :ti, :c, CAST(:d AS jsonb), :k) ON CONFLICT (dedupe_key) DO NOTHING"""),
        {"u": user_id, "r": "STAFF" if staff else None, "t": type, "ti": title, "c": content,
         "d": json.dumps(data or {}), "k": dedupe_key})
    return r.rowcount == 1


def registered_tokens(user_id: str) -> int:
    with engine().connect() as c:
        return c.execute(text("SELECT count(*) FROM device_tokens WHERE user_id=:u"), {"u": user_id}).scalar()


def push_to_user(user_id: str, title: str, body: str, data: dict | None = None) -> int:
    """FR-43. Trả số token đã gửi được (dry-run: số token sẽ gửi)."""
    return _push("user", "WHERE user_id=:u", {"u": user_id}, title, body, data)


def push_to_staff(title: str, body: str, data: dict | None = None) -> int:
    """Cảnh báo hạ tầng và việc cần xử lý: mọi thiết bị đã đăng ký của Operator và Admin."""
    return _push("staff", "WHERE role = ANY(:r)", {"r": list(STAFF_ROLES)}, title, body, data)


def _push(target: str, where: str, params: dict, title: str, body: str, data: dict | None) -> int:
    result = "failed"
    try:
        with engine().connect() as c:
            tokens = [r[0] for r in c.execute(text(f"SELECT token FROM device_tokens {where} ORDER BY id"), params)]
        if not tokens:
            result = "no_token"
            return 0
        if dry_run():
            log.info("[FCM dry-run] -> %d token: %s | %s", len(tokens), title, body)
            result = "dry_run"
            return len(tokens)
        sent = _send(tokens, title, body, data or {})
        result = "sent" if sent else "failed"
        return sent
    except Exception:                       # noqa: BLE001
        log.exception("Gửi FCM thất bại (bỏ qua, nghiệp vụ không bị ảnh hưởng)")
        return 0
    finally:
        metrics.PUSH.labels(target, result).inc()


def _init() -> None:
    global _fcm_ready
    if _fcm_ready:
        return
    import firebase_admin
    from firebase_admin import credentials
    path = os.getenv("FIREBASE_CREDENTIALS_FILE", "")
    if not os.path.isfile(path):
        raise RuntimeError(f"Không thấy tệp service account FCM '{path}'. Đặt tệp vào ./secrets hoặc dùng FCM_DRY_RUN=true")
    firebase_admin.initialize_app(credentials.Certificate(path))
    _fcm_ready = True


def _is_dead_token(exc, messaging) -> bool:
    """Token không còn dùng được (app bị gỡ, token cũ, sai project): xóa. Lỗi tạm thời (quá tải, mạng) thì giữ lại."""
    if isinstance(exc, (messaging.UnregisteredError, messaging.SenderIdMismatchError)):
        return True
    return "registration token" in str(exc).lower()            # INVALID_ARGUMENT: "not a valid FCM registration token"


def _send(tokens: list[str], title: str, body: str, data: dict) -> int:
    from firebase_admin import messaging
    _init()
    payload = {k: str(v) for k, v in data.items() if v is not None}       # data của FCM bắt buộc là chuỗi
    sent, dead = 0, []
    for i in range(0, len(tokens), BATCH):
        chunk = tokens[i:i + BATCH]
        try:
            resp = messaging.send_each_for_multicast(messaging.MulticastMessage(
                tokens=chunk, notification=messaging.Notification(title=title, body=body), data=payload,
                android=messaging.AndroidConfig(priority="high")))
        except Exception:                   # noqa: BLE001  # một lô lỗi (mạng...) không làm mất các lô sau
            log.exception("Gửi lô %d token thất bại", len(chunk))
            continue
        for tok, r in zip(chunk, resp.responses):
            if r.success:
                sent += 1
            elif _is_dead_token(r.exception, messaging):
                dead.append(tok)
            else:
                log.warning("FCM từ chối một token (giữ lại): %s", r.exception)
    if dead:                                # BR-18: token không còn hợp lệ thì xóa
        with engine().begin() as c:
            c.execute(text("DELETE FROM device_tokens WHERE token = ANY(:t)"), {"t": dead})
        metrics.PUSH_DEAD_TOKENS.inc(len(dead))
        log.info("Đã xóa %d token FCM không còn hợp lệ", len(dead))
    return sent

"""Tạo thông báo (luôn lưu DB trước) và gửi push FCM như kênh bổ sung (BR-18)."""
import json
import logging
import os

from sqlalchemy import text

from common.db import engine

log = logging.getLogger("notify")
_fcm_ready = False


def create(conn, *, type: str, title: str, content: str = "", dedupe_key: str,
           user_id: str | None = None, staff: bool = False, data: dict | None = None) -> bool:
    """Trả True nếu tạo mới; xử lý lặp trả False (ON CONFLICT DO NOTHING)."""
    r = conn.execute(text("""
        INSERT INTO notifications(recipient_user_id, recipient_role, type, title, content, data, dedupe_key)
        VALUES (:u, :r, :t, :ti, :c, CAST(:d AS jsonb), :k) ON CONFLICT (dedupe_key) DO NOTHING"""),
        {"u": user_id, "r": "STAFF" if staff else None, "t": type, "ti": title, "c": content,
         "d": json.dumps(data or {}), "k": dedupe_key})
    return r.rowcount == 1


def push_to_user(user_id: str, title: str, body: str, data: dict | None = None) -> None:
    """FR-43: chỉ gọi sau khi giao dịch nghiệp vụ đã commit; lỗi chỉ ghi log (BR-18, NFR-20)."""
    try:
        with engine().connect() as c:
            tokens = [r[0] for r in c.execute(text("SELECT token FROM device_tokens WHERE user_id=:u"), {"u": user_id})]
        if not tokens:
            return
        if os.getenv("FCM_DRY_RUN", "true").lower() == "true":
            log.info("[FCM dry-run] -> %s tokens: %s | %s", len(tokens), title, body)
            return
        _send(tokens, title, body, data or {})
    except Exception:                       # noqa: BLE001
        log.exception("Gửi FCM thất bại (bỏ qua, nghiệp vụ không bị ảnh hưởng)")


def _send(tokens: list[str], title: str, body: str, data: dict) -> None:
    global _fcm_ready
    import firebase_admin
    from firebase_admin import credentials, messaging
    if not _fcm_ready:
        firebase_admin.initialize_app(credentials.Certificate(os.environ["FIREBASE_CREDENTIALS_FILE"]))
        _fcm_ready = True
    resp = messaging.send_each_for_multicast(messaging.MulticastMessage(
        tokens=tokens, notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in data.items()}))
    bad = [t for t, r in zip(tokens, resp.responses) if not r.success and "registration-token" in str(r.exception)]
    if bad:                                  # BR-18: token không còn hợp lệ thì xóa
        with engine().begin() as c:
            c.execute(text("DELETE FROM device_tokens WHERE token = ANY(:t)"), {"t": bad})

"""FR-42, FR-43: thông báo trong ứng dụng + đăng ký FCM token."""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text

from common.db import engine
from common.security import CurrentUser, current_user

from .. import notify

router = APIRouter(prefix="/notifications", tags=["notifications"])


class TokenIn(BaseModel):
    token: str = Field(min_length=8, max_length=4096)
    platform: Literal["android", "ios", "web"] = "android"


@router.get("", summary="Danh sách thông báo của tôi (Customer: gửi riêng; Operator/Admin: theo vai trò STAFF)")
def list_mine(user: CurrentUser = Depends(current_user)):
    staff = user.role in ("ADMIN", "OPERATOR")
    with engine().connect() as c:
        rows = c.execute(text("""
            SELECT n.id, n.type, n.title, n.content, n.data, n.created_at, (nr.user_id IS NOT NULL) AS read
            FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id=n.id AND nr.user_id=:u
            WHERE n.recipient_user_id=:u OR (:staff AND n.recipient_role='STAFF')
            ORDER BY n.created_at DESC LIMIT 100"""), {"u": user.id, "staff": staff})
        return [dict(r._mapping, id=str(r.id)) for r in rows]


@router.post("/{nid}/read")
def mark_read(nid: str, user: CurrentUser = Depends(current_user)):
    with engine().begin() as c:
        c.execute(text("INSERT INTO notification_reads(notification_id,user_id) VALUES (:n,:u) ON CONFLICT DO NOTHING"),
                  {"n": nid, "u": user.id})
    return {"ok": True}


@router.post("/device-tokens", summary="FR-43: đăng ký FCM token sau đăng nhập")
def register_token(body: TokenIn, user: CurrentUser = Depends(current_user)):
    # Role đi theo token: staff đăng xuất, khách đăng nhập trên cùng máy thì token chuyển sang khách và không còn nhận cảnh báo hạ tầng.
    with engine().begin() as c:
        c.execute(text("""INSERT INTO device_tokens(user_id,token,platform,role) VALUES (:u,:t,:p,:r)
                          ON CONFLICT (token) DO UPDATE SET user_id=EXCLUDED.user_id, role=EXCLUDED.role, platform=EXCLUDED.platform"""),
                  {"u": user.id, "t": body.token, "p": body.platform, "r": user.role})
    return {"ok": True}


@router.post("/test-push", summary="Gửi thử một push tới các thiết bị đã đăng ký của chính tôi (kiểm tra FCM)")
def test_push(user: CurrentUser = Depends(current_user)):
    registered = notify.registered_tokens(user.id)
    sent = notify.push_to_user(user.id, "Thông báo thử", "Nếu thấy dòng này thì FCM đã hoạt động", {"type": "TEST"}) if registered else 0
    return {"registeredTokens": registered, "sent": sent, "dryRun": notify.dry_run()}


@router.delete("/device-tokens/{token}", summary="FR-43: hủy đăng ký khi đăng xuất")
def unregister_token(token: str, user: CurrentUser = Depends(current_user)):
    with engine().begin() as c:
        c.execute(text("DELETE FROM device_tokens WHERE token=:t AND user_id=:u"), {"t": token, "u": user.id})
    return {"ok": True}

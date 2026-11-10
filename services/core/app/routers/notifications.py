"""FR-42, FR-43: thông báo trong ứng dụng + đăng ký FCM token."""
from typing import Literal

from fastapi import APIRouter, Depends, Query
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


@router.get("/page", summary="Thông báo có lọc loại và phân trang (mới nhất trước)")
def list_mine_page(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    type: str | None = Query(None),
    user: CurrentUser = Depends(current_user),
):
    allowed = {"NEW_RENTAL", "DEVICE_OFFLINE", "VARIETY_PENDING", "DEVICE_ONLINE"}
    from common.errors import AppError
    if type and type not in allowed:
        raise AppError(422, "INVALID_TYPE", "Loại thông báo không hợp lệ")
    staff = user.role in ("ADMIN", "OPERATOR")
    params = {"u": user.id, "staff": staff, "type": type, "limit": limit, "offset": (page - 1) * limit}
    where = "(n.recipient_user_id=:u OR (:staff AND n.recipient_role='STAFF')) AND (CAST(:type AS text) IS NULL OR n.type=:type)"
    with engine().connect() as c:
        total = c.execute(text(f"SELECT count(*) FROM notifications n WHERE {where}"), params).scalar_one()
        rows = c.execute(text(f"""
            SELECT n.id, n.type, n.title, n.content, n.data, n.created_at,
                   (nr.user_id IS NOT NULL) AS read
            FROM notifications n LEFT JOIN notification_reads nr
              ON nr.notification_id=n.id AND nr.user_id=:u
            WHERE {where}
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT :limit OFFSET :offset"""), params).mappings().all()
    return {"items": [dict(r, id=str(r["id"])) for r in rows], "total": total, "page": page, "limit": limit}


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

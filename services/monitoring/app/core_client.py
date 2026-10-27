"""Kiểm tra quyền xem phòng của Customer qua Core (BR-08). Fail-closed: lỗi/timeout -> từ chối."""
import httpx

from common.config import env
from common.errors import AppError


def can_view_room(room_id: str, customer_id: str) -> bool:
    try:
        resp = httpx.get(f"{env('CORE_URL', 'http://core:8000')}/internal/access/rooms/{room_id}",
                         params={"customerId": customer_id}, headers={"X-Service-Key": env("SERVICE_KEY", required=True)},
                         timeout=3)
        resp.raise_for_status()
        return bool(resp.json().get("allowed"))
    except Exception:                                   # noqa: BLE001
        raise AppError(503, "ACCESS_CHECK_UNAVAILABLE", "Không kiểm tra được quyền truy cập, vui lòng thử lại")

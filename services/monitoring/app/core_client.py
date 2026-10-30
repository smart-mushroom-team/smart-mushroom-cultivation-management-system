"""Gọi Core qua endpoint nội bộ (khóa dịch vụ). Fail-closed: lỗi/timeout -> từ chối, không đoán."""
import httpx

from common.config import env
from common.errors import AppError


def _get(path: str, **params) -> dict:
    try:
        resp = httpx.get(f"{env('CORE_URL', 'http://core:8000')}/internal{path}", params=params or None,
                         headers={"X-Service-Key": env("SERVICE_KEY", required=True)}, timeout=3)
        resp.raise_for_status()
        return resp.json()
    except Exception:                                   # noqa: BLE001
        raise AppError(503, "CORE_UNAVAILABLE", "Không kết nối được dịch vụ Core, vui lòng thử lại")


def can_view_room(room_id: str, customer_id: str) -> bool:
    """BR-08: Customer xem được phòng khi có đơn ACTIVE còn hạn. Gọi ở MỖI request, không cache."""
    return bool(_get(f"/access/rooms/{room_id}", customerId=customer_id).get("allowed"))


def room_exists(room_id: str) -> bool:
    return bool(_get(f"/rooms/{room_id}").get("active"))

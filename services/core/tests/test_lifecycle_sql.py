"""TODO: test tích hợp với PostgreSQL thật (docker compose) – xem tests/e2e. Ở đây chỉ kiểm tra module import được."""
from app import lifecycle, notify  # noqa: F401


def test_import():
    assert callable(lifecycle.run_expiry)

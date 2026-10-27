"""Kiểm thử BR-01 trên stack thật (cần `make up` + seed): nhiều khách cùng thuê khay cuối cùng, chỉ một đơn thành công.
Bỏ qua mặc định; bật bằng E2E=1. TODO: tạo N khách, ThreadPoolExecutor gọi POST /api/core/rentals đồng thời."""
import os

import pytest

pytestmark = pytest.mark.skipif(os.getenv("E2E") != "1", reason="cần stack docker compose đang chạy")


def test_only_one_wins_last_tray():
    pytest.skip("TODO: hiện thực hóa")

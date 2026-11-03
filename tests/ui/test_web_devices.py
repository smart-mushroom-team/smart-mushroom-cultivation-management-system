"""Test GIAO DIỆN thiết bị (Bước 5d) bằng trình duyệt thật trên stack thật. Cách chạy giống test_web_monitoring.py
(cần E2E_BASE_URL = Gateway để kiểm khóa thiết bị thật sự dùng được / hết hiệu lực). Dữ liệu có tiền tố 'E2E UI'; không xóa sau khi chạy."""
import os
import pathlib
import re
import uuid

import pytest
import requests

pytest.importorskip("playwright.sync_api", reason="cần `pip install playwright && playwright install chromium`")
from playwright.sync_api import expect, sync_playwright  # noqa: E402

if os.getenv("E2E") != "1":
    pytest.skip("đặt E2E=1 để chạy (cần stack đang chạy)", allow_module_level=True)

WEB = os.getenv("E2E_WEB_URL", "http://localhost:5173").rstrip("/")
GATEWAY = os.getenv("E2E_BASE_URL", "http://localhost:8000").rstrip("/")
RUN = uuid.uuid4().hex[:6]
PW = "E2e-matkhau-123"
SHOTS = pathlib.Path(os.environ["UI_SHOTS"]) if os.getenv("UI_SHOTS") else None
S: dict = {}


def api(method, path, token=None, expect_status=None, **kw):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    r = requests.request(method, f"{WEB}{path}", headers=headers, timeout=20, **kw)
    if expect_status is not None:
        assert r.status_code == expect_status, f"{method} {path} -> {r.status_code}: {r.text[:300]}"
    return r


def send(key):
    return requests.post(f"{GATEWAY}/iot/telemetry", headers={"X-Device-Key": key}, json={"temperature": 25, "humidity": 80}, timeout=20).status_code


@pytest.fixture(scope="module", autouse=True)
def data():
    try:
        assert requests.get(f"{WEB}/", timeout=5).status_code == 200
    except Exception:                                            # noqa: BLE001
        pytest.skip(f"Web chưa chạy ở {WEB} (chạy `make web-dev`).")
    for k in ("SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"):
        if not os.getenv(k):
            pytest.skip(f"thiếu biến môi trường {k}")
    admin = api("post", "/api/identity/auth/login", expect_status=200, json={"email": os.environ["SEED_ADMIN_EMAIL"], "password": os.environ["SEED_ADMIN_PASSWORD"]}).json()["accessToken"]
    S["room_name"] = f"E2E UI thiết bị {RUN}"
    api("post", "/api/core/rooms", admin, 201, json={"name": S["room_name"]})
    S["op_email"] = f"e2e-dev-{RUN}-op@example.com"
    api("post", "/api/identity/users/operators", admin, 201, json={"name": f"Operator Dev {RUN}", "email": S["op_email"], "password": PW})
    S["name"] = f"Cảm biến UI {RUN}"
    yield


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=os.getenv("E2E_HEADED") != "1")
        yield b
        b.close()


@pytest.fixture()
def page(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="vi-VN", permissions=["clipboard-read", "clipboard-write"])
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    pg.goto(f"{WEB}/dang-nhap")
    pg.get_by_label("Email").fill(S["op_email"])
    pg.get_by_label("Mật khẩu").fill(PW)
    pg.get_by_role("button", name="Đăng nhập").click()
    expect(pg.get_by_role("heading", name="Tổng quan")).to_be_visible()
    pg.get_by_role("link", name="Thiết bị").click()
    expect(pg.get_by_role("heading", name="Thiết bị")).to_be_visible()
    yield pg
    ctx.close()


def shot(page, name):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)


def card(page):
    return page.get_by_role("listitem").filter(has_text=S["name"])


def test_create_shows_key_once_and_the_key_works(page):
    page.get_by_role("button", name="Thêm thiết bị").click()
    page.get_by_role("button", name="Tạo thiết bị").click()
    expect(page.get_by_text("Nhập tên để phân biệt thiết bị.")).to_be_visible()
    page.get_by_label("Tên thiết bị").fill(S["name"])
    page.get_by_label("Phòng").select_option(label=S["room_name"])
    page.get_by_label("Chu kỳ gửi (giây)").fill("30")
    page.get_by_role("button", name="Tạo thiết bị").click()

    key_box = page.get_by_test_id("api-key")
    expect(key_box).to_be_visible()
    key = key_box.inner_text().strip()
    assert re.fullmatch(r"mk_[\w-]{20,}", key)
    shot(page, "device-key")
    page.get_by_role("button", name="Sao chép khóa").click()
    expect(page.get_by_text("Đã sao chép.")).to_be_visible()
    assert page.evaluate("navigator.clipboard.readText()") == key
    assert send(key) == 202                                           # khóa vừa hiện dùng được thật
    S["key"] = key

    page.get_by_role("button", name="Đã lưu khóa, ẩn đi").click()
    expect(page.get_by_test_id("api-key")).to_have_count(0)
    page.reload()
    expect(card(page)).to_be_visible()
    assert key not in page.content()                                  # tải lại thì không còn thấy khóa ở đâu
    assert key not in page.evaluate("JSON.stringify({...localStorage})")


def test_status_turns_online_after_data_and_duplicate_type_is_refused(page):
    expect(card(page)).to_contain_text("Trực tuyến")                  # số đo ở test trước vừa tới
    page.get_by_role("button", name="Thêm thiết bị").click()
    page.get_by_label("Tên thiết bị").fill("Trùng loại")
    page.get_by_label("Phòng").select_option(label=S["room_name"])
    page.get_by_role("button", name="Tạo thiết bị").click()
    expect(page.get_by_text("đã có thiết bị cùng loại đang hoạt động")).to_be_visible()


def test_disable_blocks_the_device_and_enable_restores_it(page):
    card(page).get_by_role("button", name="Tắt thiết bị").click()
    expect(card(page)).to_contain_text("Đã tắt")
    assert send(S["key"]) == 401                                      # thiết bị bị tắt thì Gateway từ chối
    card(page).get_by_role("button", name="Bật lại").click()
    expect(card(page).get_by_role("button", name="Tắt thiết bị")).to_be_visible()
    assert send(S["key"]) == 202


def test_edit_name_and_interval(page):
    card(page).get_by_role("button", name="Sửa").click()
    card(page).get_by_label("Chu kỳ gửi (giây)").fill("2")
    expect(page.get_by_text("Nhập số nguyên từ 5 đến 3600.")).to_be_visible()
    expect(card(page).get_by_role("button", name="Lưu")).to_be_disabled()
    card(page).get_by_label("Chu kỳ gửi (giây)").fill("45")
    card(page).get_by_role("button", name="Lưu").click()
    expect(card(page)).to_contain_text("gửi mỗi 45 giây")
    shot(page, "devices-list")


def test_rotate_key_invalidates_the_old_one(page):
    card(page).get_by_role("button", name="Đổi khóa API").click()
    card(page).get_by_role("button", name="Đổi khóa", exact=True).click()
    new = page.get_by_test_id("api-key").inner_text().strip()
    assert new != S["key"]
    expect(page.get_by_text("Khóa cũ đã hết hiệu lực")).to_be_visible()
    assert send(S["key"]) == 401
    assert send(new) == 202


def test_mobile_width_has_no_horizontal_overflow(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 800}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    pg.goto(f"{WEB}/dang-nhap")
    pg.get_by_label("Email").fill(S["op_email"])
    pg.get_by_label("Mật khẩu").fill(PW)
    pg.get_by_role("button", name="Đăng nhập").click()
    pg.get_by_role("link", name="Thiết bị").click()
    expect(pg.get_by_role("listitem").filter(has_text=S["name"])).to_be_visible()
    pg.get_by_role("button", name="Thêm thiết bị").click()
    assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    shot(pg, "devices-mobile")
    ctx.close()

"""Test GIAO DIỆN Admin: người dùng và chế độ demo (Bước 5f) trên stack thật (cần DEMO_MODE=true ở Core).
Cách chạy giống test_web_staff.py. Test đổi ngày demo nhưng luôn trả về ngày thật ở cuối; dữ liệu có tiền tố 'E2E UI', không xóa."""
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


def login_status(email, password):
    return api("post", "/api/identity/auth/login", json={"email": email, "password": password}).status_code


def login(email, password):
    return api("post", "/api/identity/auth/login", expect_status=200, json={"email": email, "password": password}).json()["accessToken"]


@pytest.fixture(scope="module", autouse=True)
def data():
    try:
        assert requests.get(f"{WEB}/", timeout=5).status_code == 200
    except Exception:                                            # noqa: BLE001
        pytest.skip(f"Web chưa chạy ở {WEB} (chạy `make web-dev`).")
    for k in ("SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"):
        if not os.getenv(k):
            pytest.skip(f"thiếu biến môi trường {k}")
    S["admin"] = login(os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"])
    S["demo"] = api("get", "/api/core/demo/status", S["admin"], 200).json()
    yield
    if S["demo"]["enabled"]:                                     # luôn trả về ngày thật, dù test hỏng giữa chừng
        api("put", "/api/core/demo/date", S["admin"], json={"date": None})


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=os.getenv("E2E_HEADED") != "1")
        yield b
        b.close()


@pytest.fixture()
def page(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    pg.goto(f"{WEB}/dang-nhap")
    pg.get_by_label("Email").fill(os.environ["SEED_ADMIN_EMAIL"])
    pg.get_by_label("Mật khẩu").fill(os.environ["SEED_ADMIN_PASSWORD"])
    pg.get_by_role("button", name="Đăng nhập").click()
    expect(pg.get_by_role("heading", name="Tổng quan")).to_be_visible()
    yield pg
    ctx.close()


def shot(page, name):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)


def open_users(page):
    page.get_by_role("link", name="Người dùng").click()
    expect(page.get_by_role("heading", name="Người dùng")).to_be_visible()


def row(page):
    return page.get_by_role("listitem").filter(has_text=S["email"])


def test_create_operator_who_can_then_sign_in(page):
    S["email"] = f"e2e-adm-{RUN}@example.com"
    S["name"] = f"Operator Adm {RUN}"
    open_users(page)
    page.get_by_role("button", name="Thêm Operator").click()
    page.get_by_role("button", name="Tạo tài khoản").click()
    expect(page.get_by_text("Nhập họ tên.")).to_be_visible()
    page.get_by_label("Họ tên").fill(S["name"])
    page.get_by_label("Email").fill(S["email"])
    page.get_by_label("Mật khẩu tạm").fill("ngan")
    page.get_by_role("button", name="Tạo tài khoản").click()
    expect(page.get_by_text("Mật khẩu cần ít nhất 8 ký tự.")).to_be_visible()
    page.get_by_label("Mật khẩu tạm").fill(PW)
    page.get_by_role("button", name="Tạo tài khoản").click()
    expect(row(page)).to_contain_text("Operator")
    expect(row(page)).to_contain_text("Đang hoạt động")
    assert login_status(S["email"], PW) == 200

    page.get_by_role("button", name="Thêm Operator").click()                    # trùng email -> lời của server
    page.get_by_label("Họ tên").fill("Người trùng")
    page.get_by_label("Email").fill(S["email"].upper())
    page.get_by_label("Mật khẩu tạm").fill(PW)
    page.get_by_role("button", name="Tạo tài khoản").click()
    expect(page.get_by_text(re.compile("Email đã tồn tại"))).to_be_visible()
    shot(page, "users")


def test_deactivate_blocks_new_logins_and_activate_restores(page):
    open_users(page)
    row(page).get_by_role("button", name=re.compile("^Khóa")).click()
    expect(page.get_by_text(re.compile("Phiên đang mở vẫn dùng được"))).to_be_visible()
    page.get_by_role("button", name="Xác nhận khóa").click()
    expect(row(page)).to_contain_text("Đã khóa")
    assert login_status(S["email"], PW) == 403                                   # tài khoản bị vô hiệu hóa
    row(page).get_by_role("button", name=re.compile("^Mở lại")).click()
    expect(row(page)).to_contain_text("Đang hoạt động")
    assert login_status(S["email"], PW) == 200


def test_own_account_cannot_be_locked_and_filters_work(page):
    open_users(page)
    mine = page.get_by_role("listitem").filter(has_text=os.environ["SEED_ADMIN_EMAIL"])
    expect(mine).to_contain_text("Bạn")
    expect(mine.get_by_role("button", name=re.compile("^Khóa"))).to_be_disabled()
    page.get_by_label("Vai trò").select_option("OPERATOR")
    expect(row(page)).to_be_visible()
    expect(mine).to_have_count(0)
    page.get_by_label("Tìm").fill(f"adm-{RUN}")
    expect(page.get_by_role("listitem")).to_have_count(1)


def test_demo_date_expiry_job_and_back_to_real_date(page):
    if not S["demo"]["enabled"]:
        pytest.skip("Core đang chạy với DEMO_MODE=false")
    admin = S["admin"]
    pkg = api("post", "/api/core/packages", admin, 201, json={"name": f"E2E UI 1 ngày {RUN}", "durationDays": 1, "pricePerTray": 1000}).json()["id"]
    email = f"e2e-adm-{RUN}-kh@example.com"
    api("post", "/api/identity/auth/register", expect_status=201, json={"name": f"Khách Adm {RUN}", "email": email, "password": PW})
    cust = login(email, PW)
    api("post", "/api/core/rentals", cust, 201, json={"packageId": pkg, "trayCount": 1})
    assert api("get", "/api/core/rentals/mine", cust, 200).json()[0]["status"] == "ACTIVE"

    page.get_by_role("link", name="Chế độ demo").click()
    expect(page.get_by_role("heading", name="Chế độ demo")).to_be_visible()
    real = S["demo"]["today"]
    page.get_by_role("button", name="+7 ngày").click()
    expect(page.get_by_text("Đang dùng ngày giả lập.")).to_be_visible()
    assert api("get", "/api/core/demo/status", admin, 200).json()["today"] > real
    shot(page, "demo")

    page.get_by_role("button", name="Chạy job...").click()
    page.get_by_role("button", name="Xác nhận chạy").click()
    expect(page.get_by_text(re.compile(r"Đã chạy: \d+ đơn hết hạn"))).to_be_visible()
    assert api("get", "/api/core/rentals/mine", cust, 200).json()[0]["status"] in ("EXPIRED", "COMPLETED")   # đơn của khách đã hết hạn thật
    staff = api("get", "/api/core/notifications", admin, 200).json()
    assert any(n["type"] == "RENTAL_EXPIRED_GROWING" for n in staff)                                          # Operator được báo đợt nuôi dang dở

    page.get_by_role("button", name="Về ngày thật").click()
    expect(page.get_by_text("Đang dùng ngày thật.")).to_be_visible()
    assert api("get", "/api/core/demo/status", admin, 200).json()["demoDate"] is None


def test_operator_menu_hides_admin_pages(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 800}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    pg.goto(f"{WEB}/dang-nhap")
    pg.get_by_label("Email").fill(S["email"])
    pg.get_by_label("Mật khẩu").fill(PW)
    pg.get_by_role("button", name="Đăng nhập").click()
    expect(pg.get_by_role("heading", name="Tổng quan")).to_be_visible()
    for label in ("Người dùng", "Chế độ demo", "Phòng, khay, gói"):
        expect(pg.get_by_text(label)).to_have_count(0)
    for path in ("/nguoi-dung", "/demo"):
        pg.goto(f"{WEB}{path}")
        expect(pg.get_by_role("heading", name="Không đủ quyền")).to_be_visible()
    ctx.close()


def test_mobile_width_has_no_horizontal_overflow(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 800}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    pg.goto(f"{WEB}/dang-nhap")
    pg.get_by_label("Email").fill(os.environ["SEED_ADMIN_EMAIL"])
    pg.get_by_label("Mật khẩu").fill(os.environ["SEED_ADMIN_PASSWORD"])
    pg.get_by_role("button", name="Đăng nhập").click()
    pg.get_by_role("link", name="Người dùng").click()
    expect(pg.get_by_role("heading", name="Người dùng")).to_be_visible()
    pg.wait_for_timeout(500)
    assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "trang Người dùng tràn ngang"
    pg.get_by_role("link", name="Chế độ demo").click()
    expect(pg.get_by_role("heading", name="Chế độ demo")).to_be_visible()
    assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "trang Demo tràn ngang"
    shot(pg, "admin-mobile")
    ctx.close()

"""Test GIAO DIỆN danh mục Admin (Bước 5e): phòng, khay, gói thuê, trên stack thật. Cách chạy giống test_web_staff.py.
Dữ liệu có tiền tố 'E2E UI'; test không xóa (trừ khay vừa tạo để thử xóa)."""
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
    S["op_email"] = f"e2e-cat-{RUN}-op@example.com"
    api("post", "/api/identity/users/operators", S["admin"], 201, json={"name": f"Operator Cat {RUN}", "email": S["op_email"], "password": PW})
    S["room"] = f"E2E UI danh mục {RUN}"
    S["pkg"] = f"E2E UI gói {RUN}"
    yield


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=os.getenv("E2E_HEADED") != "1")
        yield b
        b.close()


def sign_in(pg, email, password):
    pg.goto(f"{WEB}/dang-nhap")
    pg.get_by_label("Email").fill(email)
    pg.get_by_label("Mật khẩu").fill(password)
    pg.get_by_role("button", name="Đăng nhập").click()
    expect(pg.get_by_role("heading", name="Tổng quan")).to_be_visible()


@pytest.fixture()
def page(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    sign_in(pg, os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"])
    pg.get_by_role("link", name="Phòng, khay, gói").click()
    expect(pg.get_by_role("heading", name="Phòng, khay, gói")).to_be_visible()
    yield pg
    ctx.close()


def shot(page, name):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)


def room_card(page):
    return page.get_by_role("listitem").filter(has_text=S["room"])


def free_trays():
    tok = login(os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"])
    return api("get", "/api/core/packages", tok, 200).json()["availableTrays"]


def test_operator_cannot_open_the_catalog(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 800}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    sign_in(pg, S["op_email"], PW)
    expect(pg.get_by_text("Phòng, khay, gói")).to_have_count(0)                  # không có trong menu
    pg.goto(f"{WEB}/danh-muc")
    expect(pg.get_by_role("heading", name="Không đủ quyền")).to_be_visible()
    ctx.close()


def test_create_and_rename_room(page):
    page.get_by_label("Tên phòng").fill(S["room"])
    page.get_by_role("button", name="Thêm phòng").click()
    expect(room_card(page)).to_contain_text("0/0 khay đang thuê")
    room_card(page).get_by_role("button", name="Sửa tên").click()
    room_card(page).get_by_label("Tên phòng").fill(S["room"] + " (A)")
    room_card(page).get_by_role("button", name="Lưu").click()
    S["room"] += " (A)"
    expect(room_card(page)).to_be_visible()


def test_bulk_add_trays_then_edit_and_delete(page):
    before = free_trays()
    page.get_by_role("button", name="Khay", exact=True).click()
    page.get_by_role("button", name="Thêm khay").click()
    expect(page.get_by_text("Chọn phòng đặt khay.")).to_be_visible()
    page.locator("#t-room").select_option(label=S["room"])
    page.get_by_label("Mã khay (hoặc tiền tố)").fill(f"UK{RUN}")
    page.get_by_label("Số lượng").fill("3")
    page.get_by_role("button", name="Thêm khay").click()
    expect(page.get_by_text("Đã thêm 3 khay.")).to_be_visible()
    for i in (1, 2, 3):
        expect(page.get_by_role("listitem").filter(has_text=f"UK{RUN}-0{i}")).to_contain_text(f"ô {i}")
    assert free_trays() == before + 3                                              # khách thấy thêm 3 khay trống

    page.get_by_role("button", name="Thêm khay").click()                           # thêm lại cùng mã -> server từ chối, UI nói rõ
    expect(page.get_by_text(re.compile(r"Đã thêm 0/3 khay, dừng ở .*Mã khay đã tồn tại"))).to_be_visible()

    page.get_by_role("button", name=f"Sửa khay UK{RUN}-03").click()
    page.get_by_label("Ô", exact=True).fill("9")
    page.get_by_role("button", name="Lưu", exact=True).click()
    expect(page.get_by_role("listitem").filter(has_text=f"UK{RUN}-03")).to_contain_text("ô 9")

    page.get_by_role("button", name=f"Xóa khay UK{RUN}-03").click()
    page.get_by_role("button", name="Xác nhận xóa").click()
    expect(page.get_by_role("listitem").filter(has_text=f"UK{RUN}-03")).to_have_count(0)
    shot(page, "catalog-trays")


def test_rented_room_cannot_be_stopped_and_rented_tray_cannot_be_deleted(page):
    pkg = api("post", "/api/core/packages", S["admin"], 201, json={"name": f"E2E UI thuê {RUN}", "durationDays": 30, "pricePerTray": 1000}).json()["id"]
    email = f"e2e-cat-{RUN}-kh@example.com"
    api("post", "/api/identity/auth/register", expect_status=201, json={"name": f"Khách Cat {RUN}", "email": email, "password": PW})
    tok = login(email, PW)
    # Chỉ phòng của test này có khay trống đáng tin cậy nếu các phòng khác cũng có khay; nên thuê rồi xem khay rơi vào phòng nào.
    api("post", "/api/core/rentals", tok, 201, json={"packageId": pkg, "trayCount": 1})
    tray = api("get", "/api/core/my-trays", tok, 200).json()[0]
    room_id = tray["room_id"]
    rooms = {r["id"]: r["name"] for r in api("get", "/api/core/rooms", S["admin"], 200).json()}
    page.get_by_role("listitem").filter(has_text=rooms[room_id]).first.get_by_role("button", name="Ngừng phòng").click()
    expect(page.get_by_text(re.compile("Phòng còn \\d+ khay đang được thuê, không thể ngừng"))).to_be_visible()
    page.get_by_role("button", name="Khay", exact=True).click()
    page.get_by_role("button", name=f"Xóa khay {tray['tray_code']}").click()
    page.get_by_role("button", name="Xác nhận xóa").click()
    expect(page.get_by_text("Khay đã từng được thuê, không thể xóa")).to_be_visible()


def test_stop_and_restart_an_empty_room(page):
    room_card(page).get_by_role("button", name="Ngừng phòng").click()
    expect(room_card(page)).to_contain_text("Đã ngừng")
    page.get_by_role("button", name="Khay", exact=True).click()
    page.get_by_role("button", name="Thêm khay").click()
    expect(page.locator("#t-room").locator("option", has_text=S["room"])).to_have_count(0)   # phòng đã ngừng không chọn được để thêm khay
    page.get_by_role("button", name="Phòng", exact=True).click()
    room_card(page).get_by_role("button", name="Bật lại").click()
    expect(room_card(page)).to_contain_text("Đang hoạt động")


def test_package_lifecycle_and_customer_visibility(page):
    page.get_by_role("button", name="Gói thuê").click()
    page.get_by_role("button", name="Thêm gói").click()
    expect(page.get_by_text("Nhập tên gói.")).to_be_visible()
    page.get_by_label("Tên gói").fill(S["pkg"])
    page.get_by_label("Giá mỗi khay (đ)").fill("75.000")
    page.get_by_role("button", name="Thêm gói").click()
    item = page.get_by_role("listitem").filter(has_text=S["pkg"])
    expect(item).to_contain_text("30 ngày")
    expect(item).to_contain_text("75.000")
    shot(page, "catalog-packages")

    tok = login(os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"])
    names = lambda: [p["name"] for p in api("get", "/api/core/packages", tok, 200).json()["packages"]]       # noqa: E731
    assert S["pkg"] in names()
    item.get_by_role("button", name="Sửa").click()
    item.get_by_label("Thời hạn (ngày)").fill("45")
    item.get_by_role("button", name="Lưu").click()
    expect(item).to_contain_text("45 ngày")
    item.get_by_role("button", name="Tắt gói").click()
    expect(item).to_contain_text("Đã tắt")
    assert S["pkg"] not in names()                                                 # gói tắt không còn hiện cho khách
    item.get_by_role("button", name="Bật lại").click()
    expect(item).to_contain_text("Đang bán")
    assert S["pkg"] in names()


def test_mobile_width_has_no_horizontal_overflow(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 800}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    sign_in(pg, os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"])
    pg.get_by_role("link", name="Phòng, khay, gói").click()
    for tab in ("Khay", "Gói thuê", "Phòng"):
        pg.get_by_role("button", name=tab, exact=True).click()
        pg.wait_for_timeout(400)
        assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), f"tab {tab} tràn ngang trên điện thoại"
    shot(pg, "catalog-mobile")
    ctx.close()

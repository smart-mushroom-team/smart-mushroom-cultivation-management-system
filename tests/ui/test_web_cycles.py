"""Test GIAO DIỆN đợt nuôi (Bước 5c) bằng trình duyệt thật trên stack thật. Cách chạy giống test_web_staff.py.
Test tự tạo phòng, khay, gói, hai khách (mỗi khách thuê 1 khay); dữ liệu có tiền tố 'E2E UI', không xóa sau khi chạy."""
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
    admin = login(os.environ["SEED_ADMIN_EMAIL"], os.environ["SEED_ADMIN_PASSWORD"])
    room = api("post", "/api/core/rooms", admin, 201, json={"name": f"E2E UI nuôi {RUN}"}).json()["id"]
    for i in range(4):
        api("post", "/api/core/trays", admin, 201, json={"trayCode": f"UC-{RUN}-{i}", "roomId": room, "row": 1, "shelf": 1, "slot": i + 1})
    pkg = api("post", "/api/core/packages", admin, 201, json={"name": f"E2E UI {RUN}", "durationDays": 30, "pricePerTray": 1000}).json()["id"]
    S["op_email"] = f"e2e-cyc-{RUN}-op@example.com"
    api("post", "/api/identity/users/operators", admin, 201, json={"name": f"Operator Cyc {RUN}", "email": S["op_email"], "password": PW})
    S["cust"] = {}
    for who in ("harvest", "discard"):
        email = f"e2e-cyc-{RUN}-{who}@example.com"
        name = f"Khách {who} {RUN}"
        api("post", "/api/identity/auth/register", expect_status=201, json={"name": name, "email": email, "password": PW})
        tok = login(email, PW)
        api("post", "/api/core/rentals", tok, 201, json={"packageId": pkg, "trayCount": 1})
        cyc = api("get", "/api/core/my-trays", tok, 200).json()[0]
        S["cust"][who] = {"name": name, "token": tok, "cycle": cyc["id"], "tray": cyc["tray_code"]}
    yield


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
    pg.get_by_label("Email").fill(S["op_email"])
    pg.get_by_label("Mật khẩu").fill(PW)
    pg.get_by_role("button", name="Đăng nhập").click()
    expect(pg.get_by_role("heading", name="Tổng quan")).to_be_visible()
    yield pg
    ctx.close()


def shot(page, name):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)


def open_cycle(page, who):
    page.get_by_role("link", name="Đợt nuôi").click()
    expect(page.get_by_role("heading", name="Đợt nuôi")).to_be_visible()
    row = page.get_by_role("row").filter(has_text=S["cust"][who]["name"])
    expect(row).to_be_visible()
    row.get_by_role("link").click()
    expect(page.get_by_role("heading", name=f"Khay {S['cust'][who]['tray']}")).to_be_visible()


def customer_notes(who, type_):
    r = api("get", "/api/core/notifications", S["cust"][who]["token"], 200).json()
    return [n for n in r if n["type"] == type_]


def test_list_shows_both_customers_trays(page):
    page.get_by_role("link", name="Đợt nuôi").click()
    for who in ("harvest", "discard"):
        row = page.get_by_role("row").filter(has_text=S["cust"][who]["name"])
        expect(row).to_contain_text("Cấy giống")
    shot(page, "cycles-list")


def test_stage_advances_one_step_and_customer_is_notified(page):
    open_cycle(page, "harvest")
    expect(page.get_by_text("Chỉ thu hoạch được khi khay đã ra quả thể")).to_be_visible()
    page.get_by_role("button", name="Chuyển sang Ủ tơ").click()
    expect(page.get_by_role("button", name="Chuyển sang Ra quả thể")).to_be_visible()
    expect(page.get_by_role("listitem").filter(has_text="Cấy giống → Ủ tơ")).to_be_visible()      # nhật ký cập nhật
    assert len(customer_notes("harvest", "CYCLE_STAGE")) == 1                                       # khách nhận đúng 1 thông báo
    page.get_by_role("button", name="Chuyển sang Ra quả thể").click()
    expect(page.get_by_role("button", name="Chuyển sang Sẵn sàng thu hoạch")).to_be_visible()
    shot(page, "cycle-detail")


def test_edit_info_validates_date_and_saves(page):
    open_cycle(page, "harvest")
    page.get_by_label("Giống nấm").fill("Sò xám")
    page.get_by_label("Thu hoạch dự kiến").fill("2020-01-01")
    expect(page.get_by_text("không thể trước ngày bắt đầu")).to_be_visible()
    expect(page.get_by_role("button", name="Lưu thông tin")).to_be_disabled()
    page.get_by_label("Thu hoạch dự kiến").fill("2099-01-01")
    page.get_by_role("button", name="Lưu thông tin").click()
    expect(page.get_by_text("Đã lưu.")).to_be_visible()
    page.reload()
    expect(page.get_by_label("Giống nấm")).to_have_value("Sò xám")
    expect(page.get_by_text("01/01/2099").first).to_be_visible()


def test_harvest_validates_weight_then_closes_the_cycle(page):
    open_cycle(page, "harvest")
    page.get_by_role("button", name="Ghi nhận thu hoạch").click()
    expect(page.get_by_text("lớn hơn 0 và không quá 1000 kg")).to_be_visible()
    page.get_by_label("Khối lượng (kg)").fill("2,5")
    page.get_by_role("button", name="Ghi nhận thu hoạch").click()
    expect(page.get_by_text("Đã thu hoạch", exact=True).first).to_be_visible()
    expect(page.get_by_text("2.5 kg")).to_be_visible()
    expect(page.get_by_role("button", name="Ghi nhận thu hoạch")).to_have_count(0)               # hết form thao tác sau khi đóng
    assert customer_notes("harvest", "CYCLE_HARVESTED")
    page.get_by_role("link", name="← Về danh sách đợt nuôi").click()
    expect(page.get_by_role("row").filter(has_text=S["cust"]["harvest"]["name"])).to_have_count(0)  # rời tab "Đang nuôi"
    page.get_by_role("button", name="Đã thu hoạch").click()
    expect(page.get_by_role("row").filter(has_text=S["cust"]["harvest"]["name"])).to_be_visible()
    shot(page, "cycles-harvested")


def test_discard_needs_reason_and_confirmation(page):
    open_cycle(page, "discard")
    btn = page.get_by_role("button", name="Loại bỏ...")
    expect(btn).to_be_disabled()
    page.get_by_label("Lý do").fill("Nấm mốc xanh")
    btn.click()
    page.get_by_role("button", name="Hủy").click()
    expect(page.get_by_role("button", name="Xác nhận loại bỏ")).to_have_count(0)
    assert not customer_notes("discard", "CYCLE_DISCARDED")                                      # hủy thì chưa gửi gì
    btn.click()
    page.get_by_role("button", name="Xác nhận loại bỏ").click()
    expect(page.get_by_text("Nấm mốc xanh").first).to_be_visible()
    expect(page.get_by_text("Lý do loại bỏ")).to_be_visible()
    n = customer_notes("discard", "CYCLE_DISCARDED")
    assert n and "Nấm mốc xanh" in n[0]["content"]


def test_mobile_width_has_no_horizontal_overflow(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 800}, locale="vi-VN")
    pg = ctx.new_page()
    pg.set_default_timeout(15000)
    pg.goto(f"{WEB}/dang-nhap")
    pg.get_by_label("Email").fill(S["op_email"])
    pg.get_by_label("Mật khẩu").fill(PW)
    pg.get_by_role("button", name="Đăng nhập").click()
    pg.get_by_role("link", name="Đợt nuôi").click()
    pg.get_by_role("button", name="Đã thu hoạch").click()
    row = pg.get_by_role("row").filter(has_text=S["cust"]["harvest"]["name"])
    expect(row).to_be_visible()
    assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "trang bị tràn ngang (bảng phải cuộn trong khung của nó)"
    row.get_by_role("link").click()
    expect(pg.get_by_role("heading", name=re.compile("^Khay "))).to_be_visible()
    assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    shot(pg, "cycle-mobile")
    ctx.close()

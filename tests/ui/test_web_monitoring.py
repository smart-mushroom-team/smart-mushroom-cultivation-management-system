"""E2E UI checks for the operator room monitoring flow."""
import io
import os
import pathlib
import re
import time
import uuid
import datetime as dt

import pytest
import requests

pytest.importorskip("playwright.sync_api", reason="cần playwright")
from playwright.sync_api import expect, sync_playwright  # noqa: E402

if os.getenv("E2E") != "1":
    pytest.skip("đặt E2E=1 để chạy", allow_module_level=True)

WEB = os.getenv("E2E_WEB_URL", "http://localhost:5173").rstrip("/")
GATEWAY = os.getenv("E2E_BASE_URL", "http://localhost:8000").rstrip("/")
RUN = uuid.uuid4().hex[:6]
PW = "E2e-matkhau-123"
SHOTS = pathlib.Path(os.environ["UI_SHOTS"]) if os.getenv("UI_SHOTS") else None
S: dict = {}


def api(method, path, token=None, expect_status=None, **kw):
    headers = {**kw.pop("headers", {})}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.request(method, f"{WEB}{path}", headers=headers, timeout=20, **kw)
    if expect_status is not None:
        assert response.status_code == expect_status, f"{method} {path} -> {response.status_code}: {response.text[:300]}"
    return response


def jpeg(color):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (320, 180), color).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module", autouse=True)
def data():
    if not os.getenv("SEED_ADMIN_EMAIL") or not os.getenv("SEED_ADMIN_PASSWORD"):
        pytest.skip("thiếu biến môi trường seed admin")
    admin = api("post", "/api/identity/auth/login", expect_status=200, json={"email": os.environ["SEED_ADMIN_EMAIL"], "password": os.environ["SEED_ADMIN_PASSWORD"]}).json()["accessToken"]
    S["room_name"] = f"E2E UI giám sát {RUN}"
    S["room"] = api("post", "/api/core/rooms", admin, 201, json={"name": S["room_name"]}).json()["id"]
    S["op_email"] = f"e2e-mon-{RUN}-op@example.com"
    api("post", "/api/identity/users/operators", admin, 201, json={"name": f"Operator Mon {RUN}", "email": S["op_email"], "password": PW})
    sensor = api("post", "/api/monitoring/devices", admin, 201, json={"name": f"Cảm biến {RUN}", "type": "SENSOR_NODE", "roomId": S["room"]}).json()["apiKey"]
    camera = api("post", "/api/monitoring/devices", admin, 201, json={"name": f"Camera {RUN}", "type": "CAMERA", "roomId": S["room"]}).json()["apiKey"]
    now = dt.datetime.now(dt.timezone.utc)
    for m in range(40, 24, -1):
        requests.post(f"{GATEWAY}/iot/telemetry", headers={"X-Device-Key": sensor}, json={"temperature": 24.0, "humidity": 82.0, "recordedAt": (now - dt.timedelta(minutes=m)).isoformat()}, timeout=20).raise_for_status()
    for i, color in enumerate(("#5a3a66", "#3a7a4c", "#a8650d")):
        ts = now - dt.timedelta(minutes=30 - i * 10)
        requests.post(f"{GATEWAY}/iot/snapshot", headers={"X-Device-Key": camera, "Content-Type": "image/jpeg", "X-Captured-At": ts.isoformat()}, data=jpeg(color), timeout=20).raise_for_status()
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
    pg = ctx.new_page(); pg.set_default_timeout(15000); pg.goto(f"{WEB}/dang-nhap"); pg.get_by_label("Email").fill(S["op_email"]); pg.get_by_label("Mật khẩu").fill(PW); pg.get_by_role("button", name="Đăng nhập").click(); expect(pg.get_by_role("heading", name="Tổng quan")).to_be_visible(); yield pg; ctx.close()


def test_monitoring_navigation_and_mobile_width(page, browser):
    page.get_by_role("link", name="Giám sát phòng").click()
    page.get_by_role("link", name=re.compile(re.escape(S["room_name"]))).click()
    expect(page.get_by_role("heading", name=S["room_name"])).to_be_visible()
    expect(page.get_by_role("link", name="Giám sát phòng")).to_have_attribute("aria-current", "page")
    ctx = browser.new_context(viewport={"width": 390, "height": 800}, locale="vi-VN")
    mobile = ctx.new_page(); mobile.goto(f"{WEB}/dang-nhap"); mobile.get_by_label("Email").fill(S["op_email"]); mobile.get_by_label("Mật khẩu").fill(PW); mobile.get_by_role("button", name="Đăng nhập").click(); mobile.get_by_role("link", name="Giám sát phòng").click(); mobile.get_by_role("link", name=re.compile(re.escape(S["room_name"]))).click(); time.sleep(1); assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"); ctx.close()

"""Test tích hợp chạy trên PostgreSQL thật, trong một schema tạm (không đụng dữ liệu dev).

Chạy trong stack:  docker compose exec core python -m pytest -q
Chạy ngoài Docker: đặt DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME rồi chạy pytest.
Không có DB thì các test cần DB tự bỏ qua."""
import os
import pathlib
import uuid

import jwt
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("SERVICE_KEY", "test-key")
MIGRATIONS = pathlib.Path(__file__).resolve().parent.parent / "migrations"


def _base_url():
    if not os.getenv("DB_USER"):
        return None
    return URL.create("postgresql+psycopg2", username=os.environ["DB_USER"], password=os.getenv("DB_PASSWORD"),
                      host=os.getenv("DB_HOST", "postgres"), port=int(os.getenv("DB_PORT", "5432")),
                      database=os.environ["DB_NAME"])


@pytest.fixture(scope="session")
def db():
    url = _base_url()
    if url is None:
        pytest.skip("không có DB_USER/DB_NAME: bỏ qua test tích hợp")
    schema = "t_" + uuid.uuid4().hex[:8]
    admin = create_engine(url)
    try:
        with admin.begin() as c:
            c.execute(text(f"CREATE SCHEMA {schema}"))
    except Exception as e:                                   # noqa: BLE001
        pytest.skip(f"không kết nối được DB: {e.__class__.__name__}")
    os.environ["DB_SCHEMA"] = schema
    from common import db as dbmod
    from common.migrate import run_migrations
    dbmod._engine = None
    run_migrations(MIGRATIONS)
    yield dbmod.engine()
    dbmod.engine().dispose()
    dbmod._engine = None
    os.environ.pop("DB_SCHEMA", None)
    with admin.begin() as c:
        c.execute(text(f"DROP SCHEMA {schema} CASCADE"))


@pytest.fixture(autouse=True)
def _clean(request):
    """Mỗi test dùng DB trống (chỉ khi test đó dùng fixture db)."""
    if "db" not in request.fixturenames:
        yield
        return
    eng = request.getfixturevalue("db")
    with eng.begin() as c:
        c.execute(text("TRUNCATE rooms, trays, rental_packages, rentals, rental_trays, transactions, cultivation_cycles, "
                       "cycle_progress_logs, notifications, notification_reads, device_tokens, system_settings CASCADE"))
    yield


def make_token(role: str, user_id: str | None = None, name: str = "Tester") -> dict:
    uid = user_id or str(uuid.uuid4())
    tok = jwt.encode({"sub": uid, "role": role, "name": name}, os.environ["JWT_SECRET"], algorithm="HS256")
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture()
def client(db):
    from fastapi.testclient import TestClient

    from app.main import app
    return TestClient(app)          # không dùng `with` nên lifespan (scheduler, RabbitMQ) không chạy


@pytest.fixture()
def admin():
    return make_token("ADMIN")


@pytest.fixture()
def operator():
    return make_token("OPERATOR")


@pytest.fixture()
def customer():
    return make_token("CUSTOMER")


# ---------- helper dùng chung cho test nghiệp vụ ----------
@pytest.fixture()
def farm(client, admin, operator):
    """1 phòng, 3 khay, 1 gói 30 ngày."""
    room = client.post("/rooms", json={"name": "P1"}, headers=operator).json()["id"]
    for i in range(3):
        client.post("/trays", json={"trayCode": f"T{i}", "roomId": room, "row": 1, "shelf": 1, "slot": i + 1}, headers=operator)
    pkg = client.post("/packages", json={"name": "30", "durationDays": 30, "pricePerTray": 100}, headers=admin).json()["id"]
    return {"room": room, "pkg": pkg}


def rent(client, farm, n=1, uid=None):
    uid = uid or str(uuid.uuid4())
    h = make_token("CUSTOMER", uid, "Khách A")
    r = client.post("/rentals", json={"packageId": farm["pkg"], "trayCount": n}, headers=h)
    assert r.status_code == 201, r.text
    return h, uid, r.json()


def cycles(client, operator, status="GROWING"):
    return client.get(f"/cycles?status={status}", headers=operator).json()


def advance(client, operator, cid, *stages):
    for s in stages:
        assert client.patch(f"/cycles/{cid}", json={"stage": s}, headers=operator).status_code == 200



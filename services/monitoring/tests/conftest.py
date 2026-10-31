"""Test tích hợp Monitoring trên PostgreSQL thật, trong schema tạm (không đụng dữ liệu dev).

Chạy trong stack:  docker compose exec monitoring python -m pytest -q
Chạy ngoài Docker: đặt DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME rồi chạy pytest.
Không có DB thì các test cần DB tự bỏ qua. Core, Redis, RabbitMQ được thay bằng bản giả (xem các fixture bên dưới)."""
import os
import pathlib
import uuid

import jwt
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret-1")
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
    try:                                                      # migration có GRANT cho nifi_user; trong stack thật role đã có sẵn
        with admin.begin() as c:
            c.execute(text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nifi_user') "
                           "THEN CREATE ROLE nifi_user; END IF; END $$"))
    except Exception:                                         # noqa: BLE001
        pass
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
    if "db" not in request.fixturenames:
        yield
        return
    eng = request.getfixturevalue("db")
    with eng.begin() as c:
        c.execute(text("TRUNCATE devices, sensor_readings, room_thresholds, sensor_aggregates, camera_snapshots CASCADE"))
    yield


def make_token(role: str, user_id: str | None = None, name: str = "Tester") -> dict:
    tok = jwt.encode({"sub": user_id or str(uuid.uuid4()), "role": role, "name": name}, os.environ["JWT_SECRET"], algorithm="HS256")
    return {"Authorization": f"Bearer {tok}"}


class FakeCore:
    """Thay core_client: đặt rooms (tập id phòng tồn tại) và access (tập (room, customer) được xem)."""
    def __init__(self):
        self.rooms: set[str] = set()
        self.access: set[tuple[str, str]] = set()
        self.since: dict[tuple[str, str], str] = {}        # (room, customer) -> "YYYY-MM-DD" ngày bắt đầu đơn thuê
        self.down = False

    def room_exists(self, room_id):
        self._check()
        return room_id in self.rooms

    def room_access(self, room_id, customer_id):
        self._check()
        ok = (room_id, customer_id) in self.access
        return {"allowed": ok, "since": self.since.get((room_id, customer_id)) if ok else None}

    def can_view_room(self, room_id, customer_id):
        return self.room_access(room_id, customer_id)["allowed"]

    def _check(self):
        if self.down:
            from common.errors import AppError
            raise AppError(503, "CORE_UNAVAILABLE", "Core down")


@pytest.fixture()
def core(monkeypatch):
    from app import core_client
    fake = FakeCore()
    monkeypatch.setattr(core_client, "room_exists", fake.room_exists)
    monkeypatch.setattr(core_client, "can_view_room", fake.can_view_room)
    monkeypatch.setattr(core_client, "room_access", fake.room_access)
    return fake


@pytest.fixture()
def room(core):
    rid = str(uuid.uuid4())
    core.rooms.add(rid)
    return rid


class Published(list):
    """Danh sách (queue, message) đã gửi. fail_queues: tên queue mô phỏng RabbitMQ lỗi (publish trả False, không ghi nhận).
    on_publish: hàm gọi ngay trước mỗi lần gửi (dùng để kiểm tra trạng thái DB tại thời điểm gửi)."""
    def __init__(self):
        super().__init__()
        self.fail_queues: set[str] = set()
        self.attempts: list = []
        self.on_publish = None

    def of(self, queue: str, type_: str | None = None):
        return [m for q, m in self if q == queue and (type_ is None or m.get("type") == type_)]


@pytest.fixture()
def published(monkeypatch):
    """Ghi lại mọi sự kiện publish thay vì gửi RabbitMQ thật."""
    sent = Published()

    def fake_publish(queue, message, retries=3):
        sent.attempts.append((queue, message))
        if sent.on_publish:
            sent.on_publish(queue, message)
        if queue in sent.fail_queues:
            return False
        sent.append((queue, message))
        return True
    from app import jobs, presence, thresholds
    from app.routers import iot
    for mod in (iot, thresholds, jobs, presence):
        if hasattr(mod, "publish"):
            monkeypatch.setattr(mod, "publish", fake_publish)
    return sent


@pytest.fixture()
def cache_stub(monkeypatch):
    """Redis giả trong bộ nhớ."""
    from app import cache
    store: dict = {}
    monkeypatch.setattr(cache, "set_snapshot", lambda room_id, data: store.__setitem__(f"snap:{room_id}", data))
    monkeypatch.setattr(cache, "get_snapshot", lambda room_id: store.get(f"snap:{room_id}"))
    monkeypatch.setattr(cache, "touch", lambda device_id, ts: store.__setitem__(f"seen:{device_id}", ts))
    return store


@pytest.fixture()
def client(db, cache_stub, published):
    from fastapi.testclient import TestClient

    from app.main import app
    return TestClient(app)          # không dùng `with` nên lifespan (scheduler) không chạy


@pytest.fixture()
def operator():
    return make_token("OPERATOR")


@pytest.fixture()
def admin():
    return make_token("ADMIN")


@pytest.fixture()
def customer():
    return make_token("CUSTOMER")

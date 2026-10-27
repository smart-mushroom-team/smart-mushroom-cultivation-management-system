from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_internal_blocked():
    assert client.get("/api/core/internal/x").status_code == 404


def test_needs_jwt():
    assert client.get("/api/core/rooms").status_code == 401

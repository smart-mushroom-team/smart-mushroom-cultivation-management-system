from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from common.errors import install_error_handlers


def _app():
    app = FastAPI()
    install_error_handlers(app)

    class In(BaseModel):
        t: float = Field(ge=0, le=10)

    @app.post("/x")
    def x(b: In):
        return b

    return TestClient(app)


def test_validation_error_uses_common_format_and_hides_input():
    r = _app().post("/x", json={"t": 99})
    body = r.json()
    assert r.status_code == 422 and body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["details"][0]["field"] == "t" and "99" not in str(body)


def test_nan_input_returns_422_not_500():
    r = _app().post("/x", content=b'{"t": NaN}', headers={"Content-Type": "application/json"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"

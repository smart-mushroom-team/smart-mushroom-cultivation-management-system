import jwt
import pytest

from common.errors import AppError
from common.security import decode_token


def test_decode_ok(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "s")
    t = jwt.encode({"sub": "u1", "role": "ADMIN", "name": "A"}, "s", algorithm="HS256")
    assert decode_token(t).role == "ADMIN"


def test_decode_bad(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "s")
    with pytest.raises(AppError):
        decode_token("xxx")

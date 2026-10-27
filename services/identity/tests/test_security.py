from app.security import hash_password, make_token, verify_password
from common.security import decode_token


def test_password_roundtrip():
    assert verify_password("x", hash_password("x"))


def test_token(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "s")
    t, _ = make_token("u1", "OPERATOR", "Op")
    assert decode_token(t).role == "OPERATOR"

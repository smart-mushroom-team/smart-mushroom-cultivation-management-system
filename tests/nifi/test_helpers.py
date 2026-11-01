"""Phần phụ của Bước 4: tải driver JDBC (đối chiếu SHA-1) và nạp .env cho script dựng luồng."""
import hashlib
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "infra" / "nifi"))
import download_driver as dd  # noqa: E402
import provision_flow as pf  # noqa: E402

JAR = b"PK\x03\x04 gia lap"
SHA = hashlib.sha1(JAR).hexdigest()


def getter(jar=JAR, sha=SHA):
    calls = []

    def get(url):
        calls.append(url)
        return (f"{sha}  postgresql-42.7.4.jar\n".encode() if url.endswith(".sha1") else jar)
    get.calls = calls
    return get


def test_download_saves_when_sha1_matches(tmp_path):
    g = getter()
    out = dd.download("42.7.4", tmp_path / "drivers", g)
    assert out.read_bytes() == JAR and out.name == "postgresql-42.7.4.jar"
    assert g.calls[0].endswith("/42.7.4/postgresql-42.7.4.jar.sha1") and "repo1.maven.org" in g.calls[0]


def test_download_refuses_a_tampered_jar(tmp_path):
    with pytest.raises(SystemExit, match="SHA-1 không khớp"):
        dd.download("42.7.4", tmp_path, getter(jar=b"da bi sua"))
    assert list(tmp_path.iterdir()) == []                                      # không để lại tệp hỏng


def test_download_skips_when_already_present_and_valid(tmp_path):
    dd.download("42.7.4", tmp_path, getter())
    g = getter()
    dd.download("42.7.4", tmp_path, g)
    assert len(g.calls) == 1                                                   # chỉ hỏi SHA-1, không tải lại jar
    (tmp_path / "postgresql-42.7.4.jar").write_bytes(b"hong")                  # tệp cũ bị hỏng thì tải lại
    assert dd.download("42.7.4", tmp_path, getter()).read_bytes() == JAR


def test_env_file_fills_only_missing_vars(tmp_path, monkeypatch):
    f = tmp_path / ".env"
    f.write_text('# ghi chú\nNIFI_USER=admin\nNIFI_PASSWORD="co dau = bang"\nRABBITMQ_USER=mq # khong phai chu thich\n\nTRONG=\nSAI DONG\n', encoding="utf8")
    monkeypatch.delenv("NIFI_USER", raising=False)
    monkeypatch.delenv("NIFI_PASSWORD", raising=False)
    monkeypatch.setenv("RABBITMQ_USER", "da-co-san")
    monkeypatch.delenv("TRONG", raising=False)
    pf.load_env_file(f)
    import os
    assert os.environ["NIFI_USER"] == "admin" and os.environ["NIFI_PASSWORD"] == "co dau = bang"
    assert os.environ["RABBITMQ_USER"] == "da-co-san"                          # biến đã có thì không bị ghi đè
    assert os.environ["TRONG"] == ""
    pf.load_env_file(tmp_path / "khong-co.env")                                # thiếu tệp: im lặng

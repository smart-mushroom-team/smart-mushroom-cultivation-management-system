#!/usr/bin/env python3
"""Tải driver JDBC của PostgreSQL vào infra/nifi/drivers/ (NiFi không kèm sẵn) và đối chiếu SHA-1 do chính Maven Central công bố.

    python infra/nifi/download_driver.py            # hoặc: make nifi-driver
    python infra/nifi/download_driver.py --version 42.7.4

Chỉ dùng thư viện chuẩn của Python nên chạy được trên Windows/macOS/Linux. Đã có tệp đúng thì không tải lại.
"""
import argparse
import hashlib
import pathlib
import sys
import urllib.request

DRIVERS = pathlib.Path(__file__).resolve().parent / "drivers"
BASE = "https://repo1.maven.org/maven2/org/postgresql/postgresql"


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=120) as r:                  # noqa: S310  (URL cố định, HTTPS)
        return r.read()


def sha1_of(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()                                # noqa: S324  (Maven công bố SHA-1; chỉ để đối chiếu toàn vẹn)


def download(version: str, dest: pathlib.Path = DRIVERS, get=fetch) -> pathlib.Path:
    name = f"postgresql-{version}.jar"
    target = dest / name
    expected = get(f"{BASE}/{version}/{name}.sha1").decode().split()[0].strip().lower()
    if target.exists() and sha1_of(target.read_bytes()) == expected:
        print(f"Đã có {target} (SHA-1 khớp), bỏ qua.")
        return target
    data = get(f"{BASE}/{version}/{name}")
    actual = sha1_of(data)
    if actual != expected:
        raise SystemExit(f"SHA-1 không khớp (tải về {actual}, Maven công bố {expected}); không lưu tệp.")
    dest.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    print(f"Đã tải {target} ({len(data) // 1024} KB, SHA-1 khớp).")
    return target


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", default="42.7.4")
    try:
        download(ap.parse_args().version)
    except OSError as e:
        sys.exit(f"Không tải được từ Maven Central: {e}\nTải tay {BASE}/<version>/postgresql-<version>.jar và đặt vào {DRIVERS}")

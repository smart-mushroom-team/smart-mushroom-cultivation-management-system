"""Áp dụng migration SQL thuần theo thứ tự tên tệp (NNN_*.sql); ghi lại trong schema_migrations."""
import logging
import pathlib

from sqlalchemy import text

from .db import engine

log = logging.getLogger("migrate")


def run_migrations(directory: str | pathlib.Path) -> None:
    files = sorted(pathlib.Path(directory).glob("*.sql"))
    with engine().begin() as conn:
        conn.execute(text("SELECT pg_advisory_xact_lock(727274)"))      # tránh hai tiến trình chạy cùng lúc
        conn.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations ("
                          "filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"))
        done = {r[0] for r in conn.execute(text("SELECT filename FROM schema_migrations"))}
        for f in files:
            if f.name in done:
                continue
            log.info("Áp dụng migration %s", f.name)
            conn.exec_driver_sql(f.read_text(encoding="utf8"))
            conn.execute(text("INSERT INTO schema_migrations(filename) VALUES (:n)"), {"n": f.name})

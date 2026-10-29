"""Expiry lifecycle tests against PostgreSQL."""
import datetime as dt

from conftest import advance, cycles, rent
from sqlalchemy import text

from app import lifecycle


D = dt.date


def _set_end(db, rental_id, end):
    with db.begin() as c:
        c.execute(text("UPDATE rentals SET end_date=:end, start_date=LEAST(start_date,:end) WHERE id=:id"),
                  {"end": end, "id": rental_id})


def _status(db, rental_id):
    with db.connect() as c:
        return c.execute(text("SELECT status FROM rentals WHERE id=:id"), {"id": rental_id}).scalar()


def _count(db, sql):
    with db.connect() as c:
        return c.execute(text(sql)).scalar()


def test_last_day_is_still_active(client, farm, db):
    _, _, rental = rent(client, farm)
    _set_end(db, rental["id"], D(2030, 1, 30))
    assert lifecycle.run_expiry(D(2030, 1, 30))["expired"] == 0
    assert _status(db, rental["id"]) == "ACTIVE"
    assert lifecycle.run_expiry(D(2030, 1, 31))["expired"] == 1


def test_expired_growing_rental_notifies_once(client, farm, operator, db):
    _, _, rental = rent(client, farm, 2)
    _set_end(db, rental["id"], D(2030, 1, 1))
    first = lifecycle.run_expiry(D(2030, 1, 2))
    assert first == {"expired": 1, "completed": 0, "errors": 0}
    assert _status(db, rental["id"]) == "EXPIRED"
    assert _count(db, "SELECT count(*) FROM trays WHERE occupancy_status='RENTED'") == 2
    for _ in range(3):
        assert lifecycle.run_expiry(D(2030, 1, 3)) == {"expired": 0, "completed": 0, "errors": 0}
    notifications = client.get("/notifications", headers=operator).json()
    assert len([item for item in notifications if item["type"] == "RENTAL_EXPIRED_GROWING"]) == 1


def test_expired_rental_completes_after_last_cycle(client, farm, operator, db):
    _, _, rental = rent(client, farm)
    cycle_id = cycles(client, operator)[0]["id"]
    advance(client, operator, cycle_id, "INCUBATING", "FRUITING")
    client.post(f"/cycles/{cycle_id}/harvest", json={"weightKg": 1}, headers=operator)
    _set_end(db, rental["id"], D(2030, 1, 1))
    result = lifecycle.run_expiry(D(2030, 1, 2))
    assert result == {"expired": 1, "completed": 1, "errors": 0}
    assert _status(db, rental["id"]) == "COMPLETED"
    assert _count(db, "SELECT count(*) FROM trays WHERE occupancy_status='RENTED'") == 0
    assert _count(db, "SELECT count(*) FROM rental_trays WHERE is_active") == 0


def test_expiry_is_idempotent(client, farm, db):
    _, _, rental = rent(client, farm)
    _set_end(db, rental["id"], D(2030, 1, 1))
    first = lifecycle.run_expiry(D(2030, 1, 2))
    again = lifecycle.run_expiry(D(2030, 1, 2))
    assert first["expired"] == 1
    assert again == {"expired": 0, "completed": 0, "errors": 0}

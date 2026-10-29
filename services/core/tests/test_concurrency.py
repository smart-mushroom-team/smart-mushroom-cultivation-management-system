"""Concurrent rental tests against PostgreSQL."""
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from conftest import make_token
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


def _seed(db, n_trays: int) -> str:
    with db.begin() as c:
        room = c.execute(text("INSERT INTO rooms(name) VALUES (:name) RETURNING id"), {"name": "R1"}).scalar()
        for index in range(n_trays):
            c.execute(text("INSERT INTO trays(tray_code,room_id,location_row,location_shelf,location_slot) "
                           "VALUES (:code,:room,1,1,:slot)"),
                      {"code": f"R1-T{index}", "room": room, "slot": index + 1})
        return str(c.execute(text("INSERT INTO rental_packages(name,duration_days,price_per_tray) "
                                  "VALUES ('30',30,100) RETURNING id")).scalar())


def _rent_parallel(package_id: str, wants: list[int], same_customer: str | None = None):
    from app.main import app

    barrier = threading.Barrier(len(wants))

    def one(count):
        client = TestClient(app)
        headers = make_token("CUSTOMER", same_customer or str(uuid.uuid4()))
        barrier.wait(timeout=10)
        return client.post("/rentals", json={"packageId": package_id, "trayCount": count}, headers=headers)

    with ThreadPoolExecutor(max_workers=len(wants)) as pool:
        return list(pool.map(one, wants))


def _assert_consistent(db):
    with db.connect() as c:
        assert c.execute(text("SELECT tray_id FROM rental_trays WHERE is_active GROUP BY tray_id "
                              "HAVING count(*) > 1")).all() == []
        assert c.execute(text("SELECT t.id FROM trays t WHERE (t.occupancy_status='RENTED') <> "
                              "EXISTS (SELECT 1 FROM rental_trays rt WHERE rt.tray_id=t.id AND rt.is_active)")).all() == []
        assert c.execute(text("SELECT r.id FROM rentals r WHERE r.tray_count <> "
                              "(SELECT count(*) FROM rental_trays rt WHERE rt.rental_id=r.id)")).all() == []
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == c.execute(text("SELECT count(*) FROM transactions")).scalar()


@pytest.mark.parametrize("round_", range(3))
def test_two_customers_race_for_last_tray(db, round_):
    package_id = _seed(db, 1)
    responses = _rent_parallel(package_id, [1, 1])
    assert sorted(response.status_code for response in responses) == [201, 409]
    loser = next(response for response in responses if response.status_code == 409)
    assert loser.json()["error"]["code"] in {"NOT_ENOUGH_TRAYS", "TRAY_CONFLICT"}
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == 1
        assert c.execute(text("SELECT count(*) FROM rental_trays")).scalar() == 1
        assert c.execute(text("SELECT count(*) FROM transactions")).scalar() == 1
    _assert_consistent(db)


def test_multi_tray_requests_never_partially_hold(db):
    package_id = _seed(db, 3)
    responses = _rent_parallel(package_id, [2, 2])
    assert sorted(response.status_code for response in responses) == [201, 409]
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='RENTED'")).scalar() == 2
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='AVAILABLE'")).scalar() == 1
    _assert_consistent(db)


def test_db_unique_index_blocks_double_active_rental(db, client):
    package_id = _seed(db, 1)
    assert client.post("/rentals", json={"packageId": package_id, "trayCount": 1},
                       headers=make_token("CUSTOMER")).status_code == 201
    with db.connect() as c:
        tray_id = c.execute(text("SELECT tray_id FROM rental_trays")).scalar()
        package = c.execute(text("SELECT id FROM rental_packages")).scalar()
    with pytest.raises(IntegrityError):
        with db.begin() as c:
            rental = c.execute(text("INSERT INTO rentals(customer_id,customer_name,package_id,package_name,duration_days, "
                                    "price_per_tray,tray_count,total_amount,start_date,end_date) "
                                    "VALUES (gen_random_uuid(),'x',:package,'x',30,100,1,100,current_date,current_date) "
                                    "RETURNING id"), {"package": package}).scalar()
            c.execute(text("INSERT INTO rental_trays(rental_id,tray_id) VALUES (:rental,:tray)"),
                      {"rental": rental, "tray": tray_id})


def test_unique_index_violation_returns_conflict(db, client, monkeypatch):
    from app.routers import rentals

    package_id = _seed(db, 1)
    assert client.post("/rentals", json={"packageId": package_id, "trayCount": 1},
                       headers=make_token("CUSTOMER")).status_code == 201
    with db.connect() as c:
        taken = str(c.execute(text("SELECT tray_id FROM rental_trays")).scalar())
    monkeypatch.setattr(rentals, "pick_trays", lambda conn, count: [taken])
    response = client.post("/rentals", json={"packageId": package_id, "trayCount": 1},
                           headers=make_token("CUSTOMER"))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "TRAY_CONFLICT"
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == 1
        assert c.execute(text("SELECT count(*) FROM transactions")).scalar() == 1
    _assert_consistent(db)

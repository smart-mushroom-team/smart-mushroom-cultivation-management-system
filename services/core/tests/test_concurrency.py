"""Bước 1d: thuê khay đồng thời - BR-01 (một khay chỉ thuộc tối đa một đơn hiệu lực).

Mỗi request chạy ở một thread riêng với TestClient và kết nối DB riêng; Barrier cho các thread bắt đầu cùng lúc.
Lớp bảo vệ: (1) SELECT ... FOR UPDATE SKIP LOCKED khi chọn khay, (2) unique index một-khay-một-đơn-hiệu-lực."""
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from conftest import make_token
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


@pytest.fixture()
def seed(db):
    """seed(n_trays) -> package_id; tạo 1 phòng + n khay AVAILABLE + 1 gói bằng SQL."""
    def _seed(n_trays: int, rooms: int = 1) -> str:
        with db.begin() as c:
            for r in range(rooms):
                rid = c.execute(text("INSERT INTO rooms(name) VALUES (:n) RETURNING id"), {"n": f"R{r}"}).scalar()
                for i in range(n_trays):
                    c.execute(text("INSERT INTO trays(tray_code,room_id,location_row,location_shelf,location_slot) "
                                   "VALUES (:c,:r,1,1,:s)"), {"c": f"R{r}-T{i}", "r": rid, "s": i + 1})
            return str(c.execute(text("INSERT INTO rental_packages(name,duration_days,price_per_tray) "
                                      "VALUES ('30',30,100) RETURNING id")).scalar())
    return _seed


def rent_parallel(pkg: str, wants: list[int], same_customer: str | None = None):
    """Mỗi phần tử của wants = số khay một khách muốn thuê; tất cả bắn cùng lúc. Trả về danh sách response."""
    from app.main import app
    barrier = threading.Barrier(len(wants))

    def one(n):
        client = TestClient(app)
        headers = make_token("CUSTOMER", same_customer or str(uuid.uuid4()))
        barrier.wait(timeout=10)
        return client.post("/rentals", json={"packageId": pkg, "trayCount": n}, headers=headers)

    with ThreadPoolExecutor(max_workers=len(wants)) as pool:
        return list(pool.map(one, wants))


def assert_consistent(db):
    """Bất biến BR-01 phải luôn đúng, kể cả sau khi có request thất bại."""
    with db.connect() as c:
        dup = c.execute(text("SELECT tray_id FROM rental_trays WHERE is_active GROUP BY tray_id HAVING count(*) > 1")).all()
        assert dup == [], "có khay thuộc nhiều đơn hiệu lực"
        mismatch = c.execute(text("""
            SELECT t.id FROM trays t WHERE (t.occupancy_status='RENTED') <>
                   EXISTS (SELECT 1 FROM rental_trays rt WHERE rt.tray_id=t.id AND rt.is_active)""")).all()
        assert mismatch == [], "trạng thái RENTED không khớp với rental_trays"
        orphan = c.execute(text("""SELECT r.id FROM rentals r WHERE r.tray_count <>
                                   (SELECT count(*) FROM rental_trays rt WHERE rt.rental_id=r.id)""")).all()
        assert orphan == [], "đơn có số khay không khớp tray_count"
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == c.execute(text("SELECT count(*) FROM transactions")).scalar()


def codes(responses):
    return sorted(r.status_code for r in responses)


# ---------------------------------------------------------------- khay cuối cùng
@pytest.mark.parametrize("round_", range(10))          # lặp để tăng xác suất lộ race condition
def test_two_customers_race_for_last_tray(db, seed, round_):
    pkg = seed(1)
    res = rent_parallel(pkg, [1, 1])
    assert codes(res) == [201, 409]
    loser = next(r for r in res if r.status_code == 409)
    assert loser.json()["error"]["code"] == "NOT_ENOUGH_TRAYS"
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == 1
        assert c.execute(text("SELECT count(*) FROM rental_trays")).scalar() == 1
        assert c.execute(text("SELECT count(*) FROM transactions")).scalar() == 1               # người thua không bị tính tiền
        assert c.execute(text("SELECT count(*) FROM notifications WHERE type='RENTAL_CREATED'")).scalar() == 1
    assert_consistent(db)


def test_many_customers_few_trays(db, seed):
    pkg = seed(3)
    res = rent_parallel(pkg, [1] * 12)
    assert codes(res) == [201] * 3 + [409] * 9
    with db.connect() as c:
        assert c.execute(text("SELECT count(DISTINCT tray_id) FROM rental_trays WHERE is_active")).scalar() == 3
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='AVAILABLE'")).scalar() == 0
    assert_consistent(db)


def test_same_customer_double_click(db, seed):
    pkg = seed(1)
    res = rent_parallel(pkg, [1, 1], same_customer=str(uuid.uuid4()))
    assert codes(res) == [201, 409]
    assert_consistent(db)


# ---------------------------------------------------------------- thuê nhiều khay: tất cả hoặc không gì cả
def test_multi_tray_requests_never_partially_hold(db, seed):
    pkg = seed(3)                                       # 2 khách cùng muốn 2 khay, chỉ có 3
    res = rent_parallel(pkg, [2, 2])
    ok = [r for r in res if r.status_code == 201]
    assert len(ok) == 1 and len(res) - len(ok) == 1 and next(r for r in res if r.status_code != 201).status_code == 409
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='RENTED'")).scalar() == 2
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='AVAILABLE'")).scalar() == 1   # không bị giữ nhầm
    assert_consistent(db)


def test_request_more_than_available_rolls_back(db, seed, client):
    pkg = seed(3)
    r = client.post("/rentals", json={"packageId": pkg, "trayCount": 5}, headers=make_token("CUSTOMER"))
    assert r.status_code == 409 and r.json()["error"]["code"] == "NOT_ENOUGH_TRAYS"
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='AVAILABLE'")).scalar() == 3
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == 0
    assert_consistent(db)


def test_mixed_sizes_total_never_exceeds_capacity(db, seed):
    pkg = seed(5)
    res = rent_parallel(pkg, [3, 2, 2, 1, 1, 1])        # tổng nhu cầu 10 > 5 khay
    with db.connect() as c:
        rented = c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='RENTED'")).scalar()
        total_ok = c.execute(text("SELECT coalesce(sum(tray_count),0) FROM rentals")).scalar()
    assert rented == total_ok <= 5
    assert all(r.status_code in (201, 409) for r in res) and any(r.status_code == 201 for r in res)
    assert_consistent(db)


# ---------------------------------------------------------------- thanh toán lỗi
def test_payment_failure_rolls_back_everything(db, seed, client, monkeypatch):
    from app.routers import rentals
    pkg = seed(2)
    monkeypatch.setattr(rentals, "simulate_payment", lambda amount: False)
    r = client.post("/rentals", json={"packageId": pkg, "trayCount": 1}, headers=make_token("CUSTOMER"))
    assert r.status_code == 402 and r.json()["error"]["code"] == "PAYMENT_FAILED"
    with db.connect() as c:
        for t in ("rentals", "rental_trays", "transactions", "cultivation_cycles", "notifications"):
            assert c.execute(text(f"SELECT count(*) FROM {t}")).scalar() == 0, t
        assert c.execute(text("SELECT count(*) FROM trays WHERE occupancy_status='AVAILABLE'")).scalar() == 2
    monkeypatch.setattr(rentals, "simulate_payment", lambda amount: True)
    assert client.post("/rentals", json={"packageId": pkg, "trayCount": 2}, headers=make_token("CUSTOMER")).status_code == 201


# ---------------------------------------------------------------- lớp bảo vệ cuối ở mức DB
def test_db_unique_index_blocks_double_active_rental(db, seed, client):
    pkg = seed(1)
    assert client.post("/rentals", json={"packageId": pkg, "trayCount": 1}, headers=make_token("CUSTOMER")).status_code == 201
    with db.connect() as c:
        tray = c.execute(text("SELECT tray_id FROM rental_trays")).scalar()
        pk = c.execute(text("SELECT id FROM rental_packages")).scalar()
    with pytest.raises(IntegrityError):                # kể cả khi code ứng dụng có lỗi, DB vẫn từ chối
        with db.begin() as c:
            rid = c.execute(text("""INSERT INTO rentals(customer_id,customer_name,package_id,package_name,duration_days,
                                    price_per_tray,tray_count,total_amount,start_date,end_date)
                                    VALUES (gen_random_uuid(),'x',:p,'x',30,100,1,100,current_date,current_date) RETURNING id"""),
                            {"p": pk}).scalar()
            c.execute(text("INSERT INTO rental_trays(rental_id,tray_id) VALUES (:r,:t)"), {"r": rid, "t": tray})


def test_released_tray_can_be_rented_by_new_rental_at_db_level(db, seed, client):
    pkg = seed(1)
    client.post("/rentals", json={"packageId": pkg, "trayCount": 1}, headers=make_token("CUSTOMER"))
    with db.begin() as c:                              # giải phóng khay như lifecycle.try_complete
        c.execute(text("UPDATE rental_trays SET is_active=false"))
        c.execute(text("UPDATE trays SET occupancy_status='AVAILABLE'"))
        c.execute(text("UPDATE rentals SET status='COMPLETED'"))
    assert client.post("/rentals", json={"packageId": pkg, "trayCount": 1}, headers=make_token("CUSTOMER")).status_code == 201
    assert_consistent(db)


def test_unique_index_violation_becomes_409_not_500(db, seed, client, monkeypatch):
    """Giả lập lớp khóa dòng bị lọt: pick_trays trả về khay đã bị thuê -> unique index chặn, khách nhận 409."""
    from app.routers import rentals
    pkg = seed(1)
    assert client.post("/rentals", json={"packageId": pkg, "trayCount": 1}, headers=make_token("CUSTOMER")).status_code == 201
    with db.connect() as c:
        taken = str(c.execute(text("SELECT tray_id FROM rental_trays")).scalar())
    monkeypatch.setattr(rentals, "pick_trays", lambda conn, n: [taken])
    r = client.post("/rentals", json={"packageId": pkg, "trayCount": 1}, headers=make_token("CUSTOMER"))
    assert r.status_code == 409 and r.json()["error"]["code"] == "TRAY_CONFLICT"
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == 1             # giao dịch thua đã rollback toàn bộ
        assert c.execute(text("SELECT count(*) FROM transactions")).scalar() == 1
    assert_consistent(db)

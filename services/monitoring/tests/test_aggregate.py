"""Bước 4: gộp 5 phút (FR-53). Câu SQL dùng chung của NiFi và aggregator dự phòng được kiểm trên PostgreSQL thật so với một bản tính
tay bằng Python; kèm hợp đồng giữa sự kiện Monitoring phát ra và aggregator, và API biểu đồ."""
import datetime as dt
import json
import random
import re
import uuid
from decimal import ROUND_HALF_UP, Decimal

import pytest
from sqlalchemy import text

from app import aggregator

UTC = dt.timezone.utc
T0 = dt.datetime(2030, 1, 1, 12, 0, tzinfo=UTC)          # mốc căn theo 5 phút


def send(room, ts, t=None, h=None):
    aggregator.apply(aggregator.parse(json.dumps({"roomId": room, "deviceId": str(uuid.uuid4()), "temperature": t, "humidity": h,
                                                  "recordedAt": ts.isoformat()}).encode()))


def rows(db, room=None):
    with db.connect() as c:
        q = "SELECT * FROM sensor_aggregates" + (" WHERE room_id=:r" if room else "") + " ORDER BY room_id, window_start"
        return [r._mapping for r in c.execute(text(q), {"r": room})]


def money(v):
    return Decimal(str(v)).quantize(Decimal("0.01"), ROUND_HALF_UP)


# ================================================================ câu SQL
def test_sql_has_four_jdbc_params_and_no_comment_noise():
    sql = aggregator.load_sql()
    assert sql.count("?") == 4 and "--" not in sql and sql.lstrip().upper().startswith("WITH")
    named, n = aggregator.named_sql()
    assert n == 4 and ":p4" in named and "?" not in named


def test_sql_works_as_server_side_prepared_statement_with_varchar_params(db):
    """NiFi PutSQL chạy câu SQL qua JDBC: mọi tham số đều kiểu VARCHAR (sql.args.N.type=12) và được chuẩn bị phía server ($1..$4).
    Test này mô phỏng đúng như vậy, vì psycopg2 (các test khác) dán giá trị vào câu lệnh nên không bắt được lỗi ép kiểu."""
    n = 0

    def repl(_):
        nonlocal n
        n += 1
        return f"${n}"
    pg = re.sub(r"\?", repl, aggregator.load_sql())
    room = str(uuid.uuid4())
    with db.begin() as c:
        c.exec_driver_sql("DEALLOCATE ALL")
        c.exec_driver_sql(f"PREPARE agg_jdbc(varchar, varchar, varchar, varchar) AS {pg}")
        c.exec_driver_sql(f"EXECUTE agg_jdbc('{room}', '2030-01-01T12:03:20.123456+00:00', '28.5', '')")      # thiếu độ ẩm: chuỗi rỗng
        c.exec_driver_sql(f"EXECUTE agg_jdbc('{room}', '2030-01-01T12:04:00Z', '', '81')")                     # thiếu nhiệt độ, hậu tố Z
        c.exec_driver_sql(f"EXECUTE agg_jdbc('{room}', '2030-01-01T12:05:00+00:00', '30', '70')")              # cửa sổ kế tiếp
        c.exec_driver_sql("DEALLOCATE agg_jdbc")
    r = rows(db, room)
    assert [x["window_start"] for x in r] == [T0, T0 + dt.timedelta(minutes=5)]
    assert (r[0]["sample_count"], r[0]["temp_count"], r[0]["hum_count"]) == (2, 1, 1)
    assert (r[0]["avg_temp"], r[0]["avg_hum"]) == (Decimal("28.50"), Decimal("81.00"))
    assert (r[1]["avg_temp"], r[1]["avg_hum"], r[1]["sample_count"]) == (Decimal("30.00"), Decimal("70.00"), 1)


def test_matches_reference_on_random_events(db):
    rng = random.Random(7)
    rooms = [str(uuid.uuid4()) for _ in range(3)]
    events = []
    for _ in range(400):
        ts = T0 + dt.timedelta(seconds=rng.uniform(0, 3600), microseconds=rng.randint(0, 999999))
        t = round(rng.uniform(15, 40), rng.choice([1, 2])) if rng.random() > 0.15 else None
        h = round(rng.uniform(40, 100), rng.choice([1, 2])) if rng.random() > 0.15 else None
        if t is None and h is None:
            h = 80.0
        events.append((rng.choice(rooms), ts, t, h))
    rng.shuffle(events)                                                # đến sai thứ tự
    for e in events:
        send(*e)
    ref: dict = {}
    for room, ts, t, h in events:
        w = dt.datetime.fromtimestamp(int(ts.timestamp()) // 300 * 300, UTC)
        a = ref.setdefault((room, w), {"st": Decimal(0), "ct": 0, "sh": Decimal(0), "ch": 0, "mint": [], "maxt": [], "minh": [], "maxh": [], "n": 0})
        a["n"] += 1
        if t is not None:
            a["st"] += Decimal(str(t)); a["ct"] += 1; a["mint"].append(t); a["maxt"].append(t)      # noqa: E702
        if h is not None:
            a["sh"] += Decimal(str(h)); a["ch"] += 1; a["minh"].append(h); a["maxh"].append(h)      # noqa: E702
    got = {(str(r["room_id"]), r["window_start"]): r for r in rows(db)}
    assert set(got) == set(ref) and len(got) > 30
    for k, a in ref.items():
        r = got[k]
        assert r["sample_count"] == a["n"] and r["temp_count"] == a["ct"] and r["hum_count"] == a["ch"]
        assert r["sum_temp"] == a["st"] and r["sum_hum"] == a["sh"]
        assert r["min_temp"] == (money(min(a["mint"])) if a["mint"] else None) and r["max_temp"] == (money(max(a["maxt"])) if a["maxt"] else None)
        assert r["min_hum"] == (money(min(a["minh"])) if a["minh"] else None) and r["max_hum"] == (money(max(a["maxh"])) if a["maxh"] else None)
        assert r["avg_temp"] == (money(a["st"] / a["ct"]) if a["ct"] else None)
        assert r["avg_hum"] == (money(a["sh"] / a["ch"]) if a["ch"] else None)


def test_window_boundaries_are_utc_and_use_recorded_at(db):
    room = str(uuid.uuid4())
    send(room, T0 + dt.timedelta(minutes=4, seconds=59, microseconds=999999), 20)       # vẫn thuộc 12:00
    send(room, T0 + dt.timedelta(minutes=5), 21)                                        # 12:05
    send(room, dt.datetime(2030, 1, 1, 19, 7, tzinfo=dt.timezone(dt.timedelta(hours=7))), 22)   # 19:07+07:00 = 12:07Z -> 12:05
    got = {r["window_start"]: (r["sample_count"], r["sum_temp"]) for r in rows(db, room)}
    assert got == {T0: (1, 20), T0 + dt.timedelta(minutes=5): (2, 43)}


def test_missing_values_have_separate_counts(db):
    room = str(uuid.uuid4())
    send(room, T0, t=20.0)
    send(room, T0 + dt.timedelta(seconds=10), h=80.0)
    send(room, T0 + dt.timedelta(seconds=20), t=22.0, h=90.0)
    (r,) = rows(db, room)
    assert (r["sample_count"], r["temp_count"], r["hum_count"]) == (3, 2, 2)
    assert (r["avg_temp"], r["avg_hum"]) == (21, 85)                                    # không bị chia cho 3
    assert (r["min_temp"], r["max_temp"], r["min_hum"], r["max_hum"]) == (20, 22, 80, 90)


def test_window_with_one_kind_only_has_null_for_the_other(db):
    room = str(uuid.uuid4())
    send(room, T0, h=70.5)
    (r,) = rows(db, room)
    assert r["avg_temp"] is None and r["min_temp"] is None and r["temp_count"] == 0 and r["avg_hum"] == Decimal("70.50")


def test_no_rounding_drift_after_many_events(db):
    room = str(uuid.uuid4())
    for i in range(500):
        send(room, T0 + dt.timedelta(milliseconds=i), t=25.13, h=81.07)
    (r,) = rows(db, room)
    assert (r["avg_temp"], r["avg_hum"], r["sample_count"]) == (Decimal("25.13"), Decimal("81.07"), 500)   # trung bình từ trung bình sẽ lệch


def test_half_up_rounding_of_average(db):
    room = str(uuid.uuid4())
    send(room, T0, t=20.01)
    send(room, T0, t=20.02)
    assert rows(db, room)[0]["avg_temp"] == Decimal("20.02")                            # 20.015 làm tròn lên


# ================================================================ kiểm tra tin
GOOD = {"roomId": "11111111-1111-1111-1111-111111111111", "recordedAt": "2030-01-01T12:00:00+00:00", "temperature": 25.5, "humidity": 80}


def enc(**over):
    d = {**GOOD, **over}
    return json.dumps({k: v for k, v in d.items() if v != "__drop__"}).encode()


@pytest.mark.parametrize("body", [
    b"khong phai json", b"[1]", b"null", None,
    enc(roomId="khong-phai-uuid"), enc(roomId="__drop__"), enc(recordedAt="hom qua"), enc(recordedAt="__drop__"),
    enc(temperature=None, humidity=None), enc(temperature="25", humidity=None), enc(temperature=True, humidity=None),
    enc(temperature=float("nan"), humidity=None),
])
def test_parse_rejects_bad_events(body):
    with pytest.raises(aggregator.BadEvent):
        aggregator.parse(body)


def test_parse_accepts_partial_and_naive_time():
    assert aggregator.parse(enc(temperature=None)) == (GOOD["roomId"], "2030-01-01T12:00:00+00:00", "", "80")
    assert aggregator.parse(enc(recordedAt="2030-01-01T12:00:00"))[1] == "2030-01-01T12:00:00+00:00"       # không múi giờ: coi là UTC


# ================================================================ vòng nhận tin
class Ch:
    def __init__(self):
        self.calls = []

    def basic_ack(self, tag):
        self.calls.append(("ack", tag))

    def basic_nack(self, tag, requeue):
        self.calls.append(("nack", tag, requeue))


def test_on_message_good_bad_and_db_failure(db, monkeypatch):
    room = str(uuid.uuid4())
    ch = Ch()
    assert aggregator.on_message(ch, 1, enc(roomId=room)) == "ack"
    assert aggregator.on_message(ch, 2, b"rac ruoi") == "dropped"                       # bỏ tin hỏng, không chặn hàng đợi
    sleeps = []
    monkeypatch.setattr(aggregator, "apply", lambda p: (_ for _ in ()).throw(RuntimeError("DB sập")))
    assert aggregator.on_message(ch, 3, enc(roomId=room), sleep=sleeps.append) == "retry"
    assert ch.calls == [("ack", 1), ("ack", 2), ("nack", 3, True)] and sleeps == [2]    # trả tin về hàng đợi, không mất
    assert [r["sample_count"] for r in rows(db, room)] == [1]


# ================================================================ hợp đồng với Monitoring và API biểu đồ
def test_event_published_by_monitoring_is_accepted_by_aggregator(client, operator, room, published, db):
    key = client.post("/devices", json={"name": "s", "type": "SENSOR_NODE", "roomId": room}, headers=operator).json()["apiKey"]
    now = dt.datetime.now(UTC)
    for t, h in ((25.0, 80.0), (27.0, None), (None, 90.0)):
        body = {k: v for k, v in {"temperature": t, "humidity": h, "recordedAt": now.isoformat()}.items() if v is not None}
        assert client.post("/iot/telemetry", json=body, headers={"X-Device-Key": key}).status_code == 202
    events = published.of("telemetry.events")
    assert len(events) == 3
    for ev in events:
        aggregator.apply(aggregator.parse(json.dumps(ev).encode()))
    assert sum(r["sample_count"] for r in rows(db, room)) == 3
    chart = client.get(f"/rooms/{room}/chart?hours=1", headers=operator).json()
    assert sum(p["n"] for p in chart) == 3
    assert chart[-1]["temp"] == 26 and chart[-1]["hum"] == 85 and chart[-1]["tempMax"] == 27 and chart[-1]["humMin"] == 80


def test_chart_returns_null_for_missing_kind_and_respects_hours(client, operator, room):
    now = dt.datetime.now(UTC)
    send(room, now, h=77.0)                                                              # cửa sổ hiện tại: chỉ có độ ẩm
    send(room, now - dt.timedelta(hours=5), t=30.0, h=60.0)
    last = client.get(f"/rooms/{room}/chart?hours=1", headers=operator).json()
    assert len(last) == 1 and last[0]["temp"] is None and last[0]["tempMin"] is None and last[0]["hum"] == 77
    both = client.get(f"/rooms/{room}/chart?hours=6", headers=operator).json()
    assert [p["n"] for p in both] == [1, 1] and both[0]["t"] < both[1]["t"]               # tăng dần theo thời gian
    assert client.get(f"/rooms/{room}/chart?hours=0", headers=operator).status_code == 200   # giá trị lạ không làm nổ truy vấn

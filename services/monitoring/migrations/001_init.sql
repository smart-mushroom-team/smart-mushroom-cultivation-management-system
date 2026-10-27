-- monitoring_db (SRS 8.2, v2.4). room_id là uuid tham chiếu logic sang Core (không có FK liên DB, BR-16).

CREATE TABLE devices (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    type         text NOT NULL CHECK (type IN ('SENSOR_NODE', 'CAMERA')),
    room_id      uuid NOT NULL,
    api_key_hash text NOT NULL,                     -- SHA-256 của khóa; khóa gốc chỉ hiện một lần khi tạo/đổi (FR-31)
    status       text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    is_simulated boolean NOT NULL DEFAULT false,
    interval_sec int NOT NULL DEFAULT 30 CHECK (interval_sec > 0),
    last_seen_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
-- Mỗi phòng tối đa một thiết bị ACTIVE cho mỗi loại
CREATE UNIQUE INDEX devices_one_active_per_room_type ON devices (room_id, type) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX devices_api_key_idx ON devices (api_key_hash);

CREATE TABLE sensor_readings (                      -- dữ liệu thô, giữ 7 ngày (FR-36)
    id          bigserial PRIMARY KEY,
    device_id   uuid NOT NULL REFERENCES devices(id),
    room_id     uuid NOT NULL,
    temperature numeric(5,2),
    humidity    numeric(5,2),
    recorded_at timestamptz NOT NULL
);
CREATE INDEX readings_room_time_idx ON sensor_readings (room_id, recorded_at DESC);

CREATE TABLE room_thresholds (                      -- FR-38; bộ đếm N lần liên tiếp (mặc định N=3)
    room_id         uuid PRIMARY KEY,
    temp_min        numeric(5,2) NOT NULL DEFAULT 20,
    temp_max        numeric(5,2) NOT NULL DEFAULT 30,
    hum_min         numeric(5,2) NOT NULL DEFAULT 70,
    hum_max         numeric(5,2) NOT NULL DEFAULT 95,
    consecutive_n   int NOT NULL DEFAULT 3 CHECK (consecutive_n >= 1),
    temp_breach_cnt int NOT NULL DEFAULT 0,
    hum_breach_cnt  int NOT NULL DEFAULT 0,
    temp_alerting   boolean NOT NULL DEFAULT false,
    hum_alerting    boolean NOT NULL DEFAULT false,
    CHECK (temp_min < temp_max AND hum_min < hum_max)
);

-- Bảng do NiFi ghi (5 phút/bản ghi); biểu đồ lịch sử đọc từ đây (FR-35)
CREATE TABLE sensor_aggregates (
    id           bigserial PRIMARY KEY,
    room_id      uuid NOT NULL,
    window_start timestamptz NOT NULL,
    avg_temp     numeric(5,2),
    avg_hum      numeric(5,2),
    min_temp     numeric(5,2),
    max_temp     numeric(5,2),
    sample_count int NOT NULL,
    UNIQUE (room_id, window_start)                  -- NiFi ghi lặp thì upsert, không trùng
);

GRANT SELECT, INSERT, UPDATE ON sensor_aggregates TO nifi_user;
GRANT USAGE, SELECT ON SEQUENCE sensor_aggregates_id_seq TO nifi_user;

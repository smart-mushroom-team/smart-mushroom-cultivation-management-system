-- core_db (SRS 8.1, v2.4). Đơn ACTIVE ngay khi tạo; khay chỉ AVAILABLE/RENTED.

CREATE TABLE rooms (
    id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name   text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE trays (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tray_code        text NOT NULL UNIQUE,
    room_id          uuid NOT NULL REFERENCES rooms(id),
    location_row     int  NOT NULL,
    location_shelf   int  NOT NULL,
    location_slot    int  NOT NULL,
    occupancy_status text NOT NULL DEFAULT 'AVAILABLE' CHECK (occupancy_status IN ('AVAILABLE', 'RENTED'))
);
CREATE INDEX trays_available_idx ON trays (room_id) WHERE occupancy_status = 'AVAILABLE';

CREATE TABLE rental_packages (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name           text NOT NULL,
    duration_days  int  NOT NULL CHECK (duration_days > 0),
    price_per_tray numeric(12,2) NOT NULL CHECK (price_per_tray >= 0),
    is_active      boolean NOT NULL DEFAULT true
);

-- Bản chụp tên gói, thời hạn, giá tại thời điểm đặt (FR-10, FR-12)
CREATE TABLE rentals (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id    uuid NOT NULL,            -- từ JWT; không tham chiếu sang Identity (BR-16)
    customer_name  text NOT NULL,
    package_id     uuid NOT NULL REFERENCES rental_packages(id),
    package_name   text NOT NULL,
    duration_days  int  NOT NULL,
    price_per_tray numeric(12,2) NOT NULL,
    tray_count     int  NOT NULL CHECK (tray_count > 0),
    total_amount   numeric(12,2) NOT NULL,
    status         text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'COMPLETED')),
    start_date     date NOT NULL,
    end_date       date NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (total_amount = price_per_tray * tray_count),
    CHECK (end_date >= start_date)
);
CREATE INDEX rentals_customer_idx ON rentals (customer_id);
CREATE INDEX rentals_status_end_idx ON rentals (status, end_date);

CREATE TABLE rental_trays (
    rental_id uuid NOT NULL REFERENCES rentals(id),
    tray_id   uuid NOT NULL REFERENCES trays(id),
    is_active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (rental_id, tray_id)
);
-- BR-01: lớp bảo vệ cuối - một khay chỉ thuộc tối đa một đơn đang hiệu lực
CREATE UNIQUE INDEX rental_trays_one_active_per_tray ON rental_trays (tray_id) WHERE is_active;

CREATE TABLE transactions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id  uuid NOT NULL REFERENCES rentals(id),
    amount     numeric(12,2) NOT NULL,
    status     text NOT NULL DEFAULT 'PAID' CHECK (status = 'PAID'),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cultivation_cycles (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id             uuid NOT NULL,
    tray_id               uuid NOT NULL,
    stage                 text NOT NULL DEFAULT 'SEEDING' CHECK (stage IN ('SEEDING', 'INCUBATING', 'FRUITING', 'READY')),
    status                text NOT NULL DEFAULT 'GROWING' CHECK (status IN ('GROWING', 'HARVESTED', 'DISCARDED')),
    variety               text,
    start_date            date NOT NULL,
    expected_harvest_date date,
    harvested_at          date,
    weight_kg             numeric(8,2),
    discard_reason        text,
    note                  text,
    FOREIGN KEY (rental_id, tray_id) REFERENCES rental_trays (rental_id, tray_id),
    CHECK (status <> 'DISCARDED' OR coalesce(discard_reason, '') <> '')
);
CREATE INDEX cycles_tray_idx ON cultivation_cycles (tray_id, status);

CREATE TABLE cycle_progress_logs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id   uuid NOT NULL REFERENCES cultivation_cycles(id),
    from_stage text,
    to_stage   text,
    note       text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Thông báo cho một người (recipient_user_id) hoặc cho vai trò STAFF = Operator + Admin (FR-42)
CREATE TABLE notifications (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id uuid,
    recipient_role    text CHECK (recipient_role = 'STAFF'),
    type              text NOT NULL,
    title             text NOT NULL,
    content           text NOT NULL DEFAULT '',
    data              jsonb NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key        text NOT NULL UNIQUE,         -- BR-14, BR-19: xử lý lặp không tạo bản ghi trùng
    created_at        timestamptz NOT NULL DEFAULT now(),
    CHECK ((recipient_user_id IS NULL) <> (recipient_role IS NULL))
);
CREATE INDEX notifications_user_idx ON notifications (recipient_user_id, created_at DESC);

CREATE TABLE notification_reads (
    notification_id uuid NOT NULL REFERENCES notifications(id),
    user_id         uuid NOT NULL,
    read_at         timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE device_tokens (            -- FCM token (FR-43, BR-18)
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  uuid NOT NULL,
    token    text NOT NULL UNIQUE,
    platform text NOT NULL DEFAULT 'android'
);

CREATE TABLE system_settings (          -- ví dụ demo_date: ngày giả lập của chế độ demo (FR-26)
    key   text PRIMARY KEY,
    value text NOT NULL
);

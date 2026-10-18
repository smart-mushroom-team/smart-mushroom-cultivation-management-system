-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('CAMERA', 'SENSOR');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ConnectionState" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "MetricState" AS ENUM ('NORMAL', 'ABNORMAL');

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "type" "DeviceType" NOT NULL,
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "interval_sec" INTEGER NOT NULL,
    "is_simulated" BOOLEAN NOT NULL DEFAULT false,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "connection_state" "ConnectionState" NOT NULL DEFAULT 'OFFLINE',
    "last_seen" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_latest" (
    "device_id" UUID NOT NULL,
    "image" BYTEA NOT NULL,
    "captured_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "camera_latest_pkey" PRIMARY KEY ("device_id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" BIGSERIAL NOT NULL,
    "device_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_thresholds" (
    "room_id" UUID NOT NULL,
    "temp_min" DOUBLE PRECISION,
    "temp_max" DOUBLE PRECISION,
    "hum_min" DOUBLE PRECISION,
    "hum_max" DOUBLE PRECISION,
    "consecutive_count" INTEGER NOT NULL DEFAULT 3,
    "temp_state" "MetricState" NOT NULL DEFAULT 'NORMAL',
    "temp_out_of_count" INTEGER NOT NULL DEFAULT 0,
    "temp_in_count" INTEGER NOT NULL DEFAULT 0,
    "hum_state" "MetricState" NOT NULL DEFAULT 'NORMAL',
    "hum_out_of_count" INTEGER NOT NULL DEFAULT 0,
    "hum_in_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_thresholds_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "pending_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_api_key_hash_key" ON "devices"("api_key_hash");

-- CreateIndex
CREATE INDEX "devices_room_id_type_idx" ON "devices"("room_id","type");

-- CreateIndex
CREATE INDEX "devices_status_connection_state_idx" ON "devices"("status","connection_state");

-- CreateIndex
CREATE INDEX "sensor_readings_room_id_recorded_at_idx" ON "sensor_readings"("room_id","recorded_at");

-- CreateIndex
CREATE INDEX "sensor_readings_recorded_at_idx" ON "sensor_readings"("recorded_at");

-- CreateIndex
CREATE INDEX "sensor_readings_device_id_idx" ON "sensor_readings"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_alerts_dedupe_key_key" ON "pending_alerts"("dedupe_key");

-- CreateIndex
CREATE INDEX "pending_alerts_sent_at_idx" ON "pending_alerts"("sent_at");

-- AddForeignKey
ALTER TABLE "camera_latest" ADD CONSTRAINT "camera_latest_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- CUSTOM SQL — KHÔNG do Prisma sinh. Prisma bỏ qua CHECK / partial index / trigger khi so sánh
-- schema, nên phần này an toàn. Giải thích từng ràng buộc: docs/DATABASE.md.
-- ============================================================================

-- ---------- Hàm dùng chung ----------
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BR-15: không xóa thiết bị, chỉ vô hiệu hóa
CREATE FUNCTION forbid_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Không được xóa bản ghi trong bảng % (BR-15): hãy vô hiệu hóa thay vì xóa', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- Thiết bị không được đổi phòng/loại sau khi tạo (BR-09)
CREATE FUNCTION enforce_device_rules() RETURNS trigger AS $$
BEGIN
  IF NEW."room_id" <> OLD."room_id" OR NEW."type" <> OLD."type" THEN
    RAISE EXCEPTION 'Không được đổi phòng hoặc loại của thiết bị (BR-09)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- devices ----------
-- BR-09: mỗi phòng tối đa MỘT thiết bị ACTIVE cho mỗi loại
CREATE UNIQUE INDEX "uq_devices_active_room_type" ON "devices"("room_id", "type") WHERE "status" = 'ACTIVE';

ALTER TABLE "devices"
  ADD CONSTRAINT "chk_devices_name_not_blank" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "chk_devices_interval" CHECK ("interval_sec" BETWEEN 1 AND 3600),
  -- FR-28: thiết bị INACTIVE luôn ở trạng thái OFFLINE
  ADD CONSTRAINT "chk_devices_inactive_offline" CHECK ("status" = 'ACTIVE' OR "connection_state" = 'OFFLINE');

CREATE TRIGGER "trg_devices_rules" BEFORE UPDATE ON "devices" FOR EACH ROW EXECUTE FUNCTION enforce_device_rules();
CREATE TRIGGER "trg_devices_updated_at" BEFORE UPDATE ON "devices" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_devices_forbid_delete" BEFORE DELETE ON "devices" FOR EACH ROW EXECUTE FUNCTION forbid_delete();

-- ---------- camera_latest ----------
-- BR-10: ảnh JPEG tối đa 2 MB (2097152 byte)
ALTER TABLE "camera_latest"
  ADD CONSTRAINT "chk_camera_latest_image_size" CHECK (octet_length("image") BETWEEN 1 AND 2097152);
CREATE TRIGGER "trg_camera_latest_updated_at" BEFORE UPDATE ON "camera_latest" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- sensor_readings ----------
-- BR-10: khoảng làm việc của DHT22
ALTER TABLE "sensor_readings"
  ADD CONSTRAINT "chk_readings_temperature" CHECK ("temperature" BETWEEN -40 AND 80),
  ADD CONSTRAINT "chk_readings_humidity" CHECK ("humidity" BETWEEN 0 AND 100);

-- ---------- room_thresholds ----------
ALTER TABLE "room_thresholds"
  -- Mỗi chỉ số: đặt đủ min và max (min < max) hoặc để trống cả hai
  ADD CONSTRAINT "chk_thresholds_temp" CHECK (
    ("temp_min" IS NULL AND "temp_max" IS NULL)
    OR ("temp_min" IS NOT NULL AND "temp_max" IS NOT NULL
        AND "temp_min" < "temp_max" AND "temp_min" >= -40 AND "temp_max" <= 80)
  ),
  ADD CONSTRAINT "chk_thresholds_hum" CHECK (
    ("hum_min" IS NULL AND "hum_max" IS NULL)
    OR ("hum_min" IS NOT NULL AND "hum_max" IS NOT NULL
        AND "hum_min" < "hum_max" AND "hum_min" >= 0 AND "hum_max" <= 100)
  ),
  ADD CONSTRAINT "chk_thresholds_n" CHECK ("consecutive_count" BETWEEN 1 AND 20),
  ADD CONSTRAINT "chk_thresholds_counters" CHECK (
    "temp_out_of_count" >= 0 AND "temp_in_count" >= 0 AND "hum_out_of_count" >= 0 AND "hum_in_count" >= 0
  );
CREATE TRIGGER "trg_room_thresholds_updated_at" BEFORE UPDATE ON "room_thresholds" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- pending_alerts ----------
ALTER TABLE "pending_alerts"
  ADD CONSTRAINT "chk_pending_alerts_attempts" CHECK ("attempts" >= 0);

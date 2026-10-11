-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'CLEANING');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('PAID', 'ACTIVE', 'EXPIRED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CycleStage" AS ENUM ('SEEDING', 'INCUBATING', 'FRUITING', 'READY');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('GROWING', 'HARVESTED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "Handover" AS ENUM ('ON_SITE', 'DELIVERY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RENTAL_CONFIRMED', 'RENTAL_REJECTED', 'TRAY_ACTIVATED', 'STAGE_CHANGED', 'CYCLE_HARVESTED', 'CYCLE_DISCARDED', 'RENTAL_EXPIRING', 'DEVICE_OFFLINE', 'THRESHOLD_BREACH', 'RENTAL_EXPIRED_WITH_ACTIVE_CYCLE');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tray_code" TEXT NOT NULL,
    "room_id" UUID NOT NULL,
    "location_row" INTEGER NOT NULL,
    "location_shelf" INTEGER NOT NULL,
    "location_slot" INTEGER NOT NULL,
    "occupancy_status" "OccupancyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price_per_tray" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rental_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "package_id" UUID NOT NULL,
    "package_name" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price_per_tray" INTEGER NOT NULL,
    "tray_count" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'PAID',
    "start_date" DATE,
    "end_date" DATE,
    "processed_by" UUID,
    "processed_at" TIMESTAMPTZ(3),
    "reject_reason" TEXT,
    "reminder_sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_trays" (
    "rental_id" UUID NOT NULL,
    "tray_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rental_trays_pkey" PRIMARY KEY ("rental_id","tray_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rental_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultivation_cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rental_id" UUID NOT NULL,
    "tray_id" UUID NOT NULL,
    "stage" "CycleStage" NOT NULL DEFAULT 'SEEDING',
    "status" "CycleStatus" NOT NULL DEFAULT 'GROWING',
    "variety" TEXT,
    "start_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_harvest_date" DATE,
    "harvested_at" DATE,
    "weight_kg" DECIMAL(8,2),
    "handover" "Handover",
    "discard_reason" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cultivation_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_progress_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cycle_id" UUID NOT NULL,
    "from_stage" "CycleStage",
    "to_stage" "CycleStage" NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cycle_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_user_id" UUID,
    "recipient_role" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_reads" (
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notification_id","user_id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "trays_tray_code_key" ON "trays"("tray_code");

-- CreateIndex
CREATE INDEX "trays_room_id_occupancy_status_idx" ON "trays"("room_id","occupancy_status");

-- CreateIndex
CREATE UNIQUE INDEX "trays_room_id_location_row_location_shelf_location_slot_key" ON "trays"("room_id","location_row","location_shelf","location_slot");

-- CreateIndex
CREATE INDEX "rentals_customer_id_created_at_idx" ON "rentals"("customer_id","created_at");

-- CreateIndex
CREATE INDEX "rentals_status_created_at_idx" ON "rentals"("status","created_at");

-- CreateIndex
CREATE INDEX "rentals_status_end_date_idx" ON "rentals"("status","end_date");

-- CreateIndex
CREATE INDEX "rentals_package_id_idx" ON "rentals"("package_id");

-- CreateIndex
CREATE INDEX "rental_trays_tray_id_idx" ON "rental_trays"("tray_id");

-- CreateIndex
CREATE INDEX "transactions_rental_id_idx" ON "transactions"("rental_id");

-- CreateIndex
CREATE INDEX "cultivation_cycles_rental_id_idx" ON "cultivation_cycles"("rental_id");

-- CreateIndex
CREATE INDEX "cultivation_cycles_tray_id_status_idx" ON "cultivation_cycles"("tray_id","status");

-- CreateIndex
CREATE INDEX "cycle_progress_logs_cycle_id_created_at_idx" ON "cycle_progress_logs"("cycle_id","created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_created_at_idx" ON "notifications"("recipient_user_id","created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_role_created_at_idx" ON "notifications"("recipient_role","created_at");

-- CreateIndex
CREATE INDEX "notification_reads_user_id_idx" ON "notification_reads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "trays" ADD CONSTRAINT "trays_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "rental_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_trays" ADD CONSTRAINT "rental_trays_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_trays" ADD CONSTRAINT "rental_trays_tray_id_fkey" FOREIGN KEY ("tray_id") REFERENCES "trays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultivation_cycles" ADD CONSTRAINT "cultivation_cycles_rental_id_tray_id_fkey" FOREIGN KEY ("rental_id","tray_id") REFERENCES "rental_trays"("rental_id","tray_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_progress_logs" ADD CONSTRAINT "cycle_progress_logs_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cultivation_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- BR-15: không xóa dữ liệu nghiệp vụ, chỉ đổi trạng thái
CREATE FUNCTION forbid_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Không được xóa bản ghi trong bảng % (BR-15)', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- ---------- Ràng buộc "chỉ một" (partial unique index) ----------
-- BR-01: mỗi khay thuộc tối đa MỘT đơn đang hiệu lực => chặn bán lố khay ở tầng DB
CREATE UNIQUE INDEX "uq_rental_trays_active_tray" ON "rental_trays"("tray_id") WHERE "is_active";
-- BR-06: mỗi khay tối đa MỘT đợt nuôi đang GROWING
CREATE UNIQUE INDEX "uq_cycles_growing_tray" ON "cultivation_cycles"("tray_id") WHERE "status" = 'GROWING';
-- Tìm khay trống nhanh khi đặt thuê (UC-02, SELECT ... FOR UPDATE SKIP LOCKED)
CREATE INDEX "idx_trays_available" ON "trays"("room_id", "tray_code") WHERE "occupancy_status" = 'AVAILABLE';

-- ---------- rooms / trays / rental_packages ----------
ALTER TABLE "rooms"
  ADD CONSTRAINT "chk_rooms_name_not_blank" CHECK (length(btrim("name")) > 0);

ALTER TABLE "trays"
  ADD CONSTRAINT "chk_trays_code_not_blank" CHECK (length(btrim("tray_code")) > 0),
  ADD CONSTRAINT "chk_trays_location_positive"
    CHECK ("location_row" > 0 AND "location_shelf" > 0 AND "location_slot" > 0);

ALTER TABLE "rental_packages"
  ADD CONSTRAINT "chk_packages_name_not_blank" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "chk_packages_duration_positive" CHECK ("duration_days" > 0),
  ADD CONSTRAINT "chk_packages_price_non_negative" CHECK ("price_per_tray" >= 0);

-- ---------- rentals ----------
ALTER TABLE "rentals"
  -- Số tiền nhất quán: tổng = đơn giá x số khay
  ADD CONSTRAINT "chk_rentals_amounts" CHECK (
    "tray_count" > 0 AND "duration_days" > 0 AND "price_per_tray" >= 0
    AND "total_amount" = "price_per_tray" * "tray_count"
  ),
  -- BR-05: start/end cùng có hoặc cùng không; end >= start
  ADD CONSTRAINT "chk_rentals_dates" CHECK (
    ("start_date" IS NULL) = ("end_date" IS NULL)
    AND ("end_date" IS NULL OR "end_date" >= "start_date")
  ),
  -- Đơn đã xác nhận (ACTIVE/EXPIRED/COMPLETED) bắt buộc có ngày thuê
  ADD CONSTRAINT "chk_rentals_confirmed_dates" CHECK (
    "status" IN ('PAID', 'REJECTED') OR "start_date" IS NOT NULL
  ),
  -- FR-14: từ chối phải có lý do
  ADD CONSTRAINT "chk_rentals_reject_reason" CHECK (
    "status" <> 'REJECTED' OR ("reject_reason" IS NOT NULL AND length(btrim("reject_reason")) > 0)
  ),
  -- Đơn đã được xử lý thì phải biết ai xử lý và khi nào
  ADD CONSTRAINT "chk_rentals_processed" CHECK (
    "status" = 'PAID' OR ("processed_by" IS NOT NULL AND "processed_at" IS NOT NULL)
  );

-- BR-03: vòng đời đơn thuê + dữ liệu tài chính bất biến sau khi tạo
CREATE FUNCTION enforce_rental_rules() RETURNS trigger AS $$
BEGIN
  IF NEW."customer_id" <> OLD."customer_id"
     OR NEW."package_id" <> OLD."package_id"
     OR NEW."package_name" <> OLD."package_name"
     OR NEW."duration_days" <> OLD."duration_days"
     OR NEW."price_per_tray" <> OLD."price_per_tray"
     OR NEW."tray_count" <> OLD."tray_count"
     OR NEW."total_amount" <> OLD."total_amount" THEN
    RAISE EXCEPTION 'Không được sửa thông tin chủ đơn, gói, giá hoặc số khay của đơn thuê'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."status" <> OLD."status"
     AND (OLD."status"::text || '>' || NEW."status"::text) NOT IN
         ('PAID>ACTIVE', 'PAID>REJECTED', 'ACTIVE>EXPIRED', 'EXPIRED>COMPLETED') THEN
    RAISE EXCEPTION 'Chuyển trạng thái đơn thuê không hợp lệ: % -> % (BR-03)', OLD."status", NEW."status"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_rentals_rules" BEFORE UPDATE ON "rentals"
  FOR EACH ROW EXECUTE FUNCTION enforce_rental_rules();

-- ---------- transactions ----------
ALTER TABLE "transactions"
  ADD CONSTRAINT "chk_transactions_amount" CHECK ("amount" >= 0);

-- ---------- cultivation_cycles ----------
ALTER TABLE "cultivation_cycles"
  -- BR-04: chỉ thu hoạch ở giai đoạn FRUITING/READY và phải ghi đủ sản lượng, hình thức bàn giao
  ADD CONSTRAINT "chk_cycles_harvest" CHECK (
    "status" <> 'HARVESTED' OR (
      "stage" IN ('FRUITING', 'READY')
      AND "harvested_at" IS NOT NULL
      AND "weight_kg" IS NOT NULL AND "weight_kg" > 0
      AND "handover" IS NOT NULL
    )
  ),
  -- Đợt chưa thu hoạch thì không có dữ liệu thu hoạch
  ADD CONSTRAINT "chk_cycles_no_harvest_data" CHECK (
    "status" = 'HARVESTED'
    OR ("harvested_at" IS NULL AND "weight_kg" IS NULL AND "handover" IS NULL)
  ),
  -- FR-20: loại bỏ phải có lý do
  ADD CONSTRAINT "chk_cycles_discard_reason" CHECK (
    "status" <> 'DISCARDED' OR ("discard_reason" IS NOT NULL AND length(btrim("discard_reason")) > 0)
  ),
  ADD CONSTRAINT "chk_cycles_expected_date" CHECK (
    "expected_harvest_date" IS NULL OR "expected_harvest_date" >= "start_date"
  );

-- BR-07: giai đoạn chỉ tiến lên đúng một bước; đợt đã kết thúc là bất biến
CREATE FUNCTION enforce_cycle_rules() RETURNS trigger AS $$
BEGIN
  IF NEW."rental_id" <> OLD."rental_id" OR NEW."tray_id" <> OLD."tray_id" THEN
    RAISE EXCEPTION 'Không được đổi đơn hoặc khay của đợt nuôi' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD."status" <> 'GROWING' THEN
    IF NEW."status" <> OLD."status" OR NEW."stage" <> OLD."stage" THEN
      RAISE EXCEPTION 'Đợt nuôi đã kết thúc (%): không được đổi trạng thái hoặc giai đoạn', OLD."status"
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."stage" <> OLD."stage"
     AND (OLD."stage"::text || '>' || NEW."stage"::text) NOT IN
         ('SEEDING>INCUBATING', 'INCUBATING>FRUITING', 'FRUITING>READY') THEN
    RAISE EXCEPTION 'Giai đoạn chỉ được tiến lên đúng một bước: % -> % (BR-07)', OLD."stage", NEW."stage"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_cycles_rules" BEFORE UPDATE ON "cultivation_cycles"
  FOR EACH ROW EXECUTE FUNCTION enforce_cycle_rules();

-- ---------- cycle_progress_logs ----------
ALTER TABLE "cycle_progress_logs"
  -- Lưu ý NULL: nhánh from_stage NOT NULL được tách riêng, nếu không biểu thức ra NULL và CHECK sẽ cho qua
  ADD CONSTRAINT "chk_progress_logs_transition" CHECK (
    ("from_stage" IS NULL AND "to_stage" = 'SEEDING')
    OR (
      "from_stage" IS NOT NULL AND (
        "from_stage" = "to_stage" -- chỉ cập nhật ghi chú, không đổi giai đoạn
        OR ("from_stage" = 'SEEDING' AND "to_stage" = 'INCUBATING')
        OR ("from_stage" = 'INCUBATING' AND "to_stage" = 'FRUITING')
        OR ("from_stage" = 'FRUITING' AND "to_stage" = 'READY')
      )
    )
  );

-- ---------- notifications / device_tokens ----------
ALTER TABLE "notifications"
  -- Gửi cho đúng MỘT đối tượng: một người HOẶC một vai trò
  ADD CONSTRAINT "chk_notifications_recipient"
    CHECK (("recipient_user_id" IS NOT NULL) <> ("recipient_role" IS NOT NULL)),
  ADD CONSTRAINT "chk_notifications_recipient_role" CHECK ("recipient_role" IS NULL OR "recipient_role" = 'STAFF');

ALTER TABLE "device_tokens"
  ADD CONSTRAINT "chk_device_tokens_not_blank" CHECK (length(btrim("token")) > 0);

-- ---------- Trigger updated_at ----------
CREATE TRIGGER "trg_rooms_updated_at" BEFORE UPDATE ON "rooms" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_trays_updated_at" BEFORE UPDATE ON "trays" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_packages_updated_at" BEFORE UPDATE ON "rental_packages" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_rentals_updated_at" BEFORE UPDATE ON "rentals" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_cycles_updated_at" BEFORE UPDATE ON "cultivation_cycles" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_device_tokens_updated_at" BEFORE UPDATE ON "device_tokens" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_system_settings_updated_at" BEFORE UPDATE ON "system_settings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- BR-15: chặn xóa dữ liệu nghiệp vụ ----------
CREATE TRIGGER "trg_rooms_forbid_delete" BEFORE DELETE ON "rooms" FOR EACH ROW EXECUTE FUNCTION forbid_delete();
CREATE TRIGGER "trg_packages_forbid_delete" BEFORE DELETE ON "rental_packages" FOR EACH ROW EXECUTE FUNCTION forbid_delete();
CREATE TRIGGER "trg_rentals_forbid_delete" BEFORE DELETE ON "rentals" FOR EACH ROW EXECUTE FUNCTION forbid_delete();
CREATE TRIGGER "trg_rental_trays_forbid_delete" BEFORE DELETE ON "rental_trays" FOR EACH ROW EXECUTE FUNCTION forbid_delete();
CREATE TRIGGER "trg_transactions_forbid_delete" BEFORE DELETE ON "transactions" FOR EACH ROW EXECUTE FUNCTION forbid_delete();
CREATE TRIGGER "trg_cycles_forbid_delete" BEFORE DELETE ON "cultivation_cycles" FOR EACH ROW EXECUTE FUNCTION forbid_delete();
CREATE TRIGGER "trg_progress_logs_forbid_delete" BEFORE DELETE ON "cycle_progress_logs" FOR EACH ROW EXECUTE FUNCTION forbid_delete();
-- Khay: chỉ xóa được khi chưa từng thuộc đơn nào (FK RESTRICT từ rental_trays đã đảm bảo, FR-08)

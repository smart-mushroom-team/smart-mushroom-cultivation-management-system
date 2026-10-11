-- Sửa số hiệu quy tắc nghiệp vụ trong thông báo lỗi của trigger cho khớp SRS:
--   vòng đời ĐƠN THUÊ là BR-04 (không phải BR-03: BR-03 là trạng thái KHAY),
--   giai đoạn đợt nuôi chỉ tiến từng bước là BR-06 (không phải BR-07: BR-07 là hết hạn và hoàn tất).
-- Logic KHÔNG đổi, chỉ đổi nội dung thông báo. Các comment "BR-03 / BR-04 / BR-07" trong migration
-- 20261011090000_init bị gán nhầm số; bảng đối chiếu đúng nằm ở docs/DATABASE.md mục 4.
-- (Không sửa migration init vì đã được áp dụng; luôn thêm migration mới.)

CREATE OR REPLACE FUNCTION enforce_rental_rules() RETURNS trigger AS $$
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
    RAISE EXCEPTION 'Chuyển trạng thái đơn thuê không hợp lệ: % -> % (BR-04)', OLD."status", NEW."status"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_cycle_rules() RETURNS trigger AS $$
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
    RAISE EXCEPTION 'Giai đoạn chỉ được tiến lên đúng một bước: % -> % (BR-06)', OLD."stage", NEW."stage"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

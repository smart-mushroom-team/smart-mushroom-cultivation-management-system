-- Bước 5j+: danh mục giống nấm, và trạng thái duyệt giống trên từng đợt nuôi.
-- Khách chọn giống từ danh mục (APPROVED ngay) hoặc tự nhập tên khác (PENDING, chờ Operator duyệt).
CREATE TABLE mushroom_varieties (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL DEFAULT '',
    growth_days integer NOT NULL CHECK (growth_days > 0),     -- từ cấy giống đến thu hoạch, số liệu tham khảo
    temp_min    numeric(4,1) NOT NULL,
    temp_max    numeric(4,1) NOT NULL,
    hum_min     numeric(4,1) NOT NULL CHECK (hum_min BETWEEN 0 AND 100),
    hum_max     numeric(4,1) NOT NULL CHECK (hum_max BETWEEN 0 AND 100),
    is_active   boolean NOT NULL DEFAULT true,
    CHECK (temp_min <= temp_max AND hum_min <= hum_max)
);
CREATE UNIQUE INDEX mushroom_varieties_name_uq ON mushroom_varieties (lower(btrim(name)));

ALTER TABLE cultivation_cycles
    ADD COLUMN variety_id uuid REFERENCES mushroom_varieties(id),
    ADD COLUMN variety_status text NOT NULL DEFAULT 'NONE' CHECK (variety_status IN ('NONE', 'APPROVED', 'PENDING', 'REJECTED')),
    ADD COLUMN variety_reject_reason text;
-- Giống Operator đã nhập tay trước đây coi như đã duyệt.
UPDATE cultivation_cycles SET variety_status = 'APPROVED' WHERE coalesce(btrim(variety), '') <> '';
CREATE INDEX cycles_variety_pending_idx ON cultivation_cycles (variety_status) WHERE variety_status = 'PENDING';

-- Số liệu tham khảo; Operator sửa được trên trang Danh mục.
INSERT INTO mushroom_varieties(name, description, growth_days, temp_min, temp_max, hum_min, hum_max) VALUES
 ('Nấm bào ngư', 'Dễ trồng, mọc nhanh, hợp người mới. Thu hoạch nhiều đợt từ cùng một khay.', 35, 20, 28, 80, 90),
 ('Nấm rơm', 'Ưa nóng, chu kỳ ngắn nhất. Cần giữ ẩm tốt và tránh gió lùa.', 18, 30, 35, 80, 90),
 ('Nấm đùi gà', 'Thịt dày, giòn, giá bán cao. Cần mát hơn các giống khác.', 50, 15, 22, 85, 95),
 ('Mộc nhĩ', 'Mọc thành tai mỏng, thu hoạch khi tai mở đều. Cần độ ẩm cao.', 60, 22, 30, 85, 95),
 ('Nấm linh chi', 'Dược liệu, sinh trưởng chậm. Cần ổn định nhiệt độ và thông thoáng.', 100, 25, 30, 85, 95);

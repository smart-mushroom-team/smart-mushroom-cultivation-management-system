-- Bước 4: bảng tổng hợp 5 phút được cập nhật TĂNG DẦN theo từng sự kiện (NiFi hoặc aggregator dự phòng).
-- Lưu tổng và số lần đo RIÊNG cho nhiệt độ và độ ẩm (một lần đo có thể thiếu một giá trị); avg_* được tính từ đó
-- (cột sinh tự động) nên không bị tích lũy sai số làm tròn như khi cập nhật trung bình từ trung bình.
ALTER TABLE sensor_aggregates
    ADD COLUMN sum_temp   numeric NOT NULL DEFAULT 0,
    ADD COLUMN temp_count int     NOT NULL DEFAULT 0,
    ADD COLUMN sum_hum    numeric NOT NULL DEFAULT 0,
    ADD COLUMN hum_count  int     NOT NULL DEFAULT 0,
    ADD COLUMN min_hum    numeric(5,2),
    ADD COLUMN max_hum    numeric(5,2);

-- giữ dữ liệu cũ (nếu có) khi đổi cách lưu trung bình
UPDATE sensor_aggregates SET sum_temp = COALESCE(avg_temp, 0) * sample_count, temp_count = CASE WHEN avg_temp IS NULL THEN 0 ELSE sample_count END,
                             sum_hum  = COALESCE(avg_hum, 0)  * sample_count, hum_count  = CASE WHEN avg_hum  IS NULL THEN 0 ELSE sample_count END,
                             min_hum = avg_hum, max_hum = avg_hum;

ALTER TABLE sensor_aggregates
    DROP COLUMN avg_temp,
    DROP COLUMN avg_hum,
    ADD COLUMN avg_temp numeric(5,2) GENERATED ALWAYS AS (round(sum_temp / NULLIF(temp_count, 0), 2)) STORED,
    ADD COLUMN avg_hum  numeric(5,2) GENERATED ALWAYS AS (round(sum_hum  / NULLIF(hum_count, 0), 2)) STORED;

-- NiFi (tài khoản nifi_user) cần nhìn thấy schema để ghi bảng này; lặp lại cho chắc dù PostgreSQL mặc định đã cho phép
GRANT USAGE ON SCHEMA public TO nifi_user;

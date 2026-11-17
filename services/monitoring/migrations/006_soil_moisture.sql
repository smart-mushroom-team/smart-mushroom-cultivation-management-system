-- Độ ẩm giá thể/đất (đơn vị: phần trăm, 0 đến 100) do cảm biến độ ẩm đất của ESP32 gửi lên.
-- NULL khi thiết bị không gắn cảm biến này: dữ liệu cũ và thiết bị cũ vẫn hợp lệ.
-- Lưu ý: file migration không được chứa ký tự phần trăm, vì psycopg2 hiểu nhầm là tham số.
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS soil_moisture numeric(5,2);
ALTER TABLE sensor_readings DROP CONSTRAINT IF EXISTS sensor_readings_soil_range;
ALTER TABLE sensor_readings ADD CONSTRAINT sensor_readings_soil_range
    CHECK (soil_moisture IS NULL OR (soil_moisture >= 0 AND soil_moisture <= 100));

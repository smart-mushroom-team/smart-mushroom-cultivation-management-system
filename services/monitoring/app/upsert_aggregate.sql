-- MỘT câu SQL duy nhất cho việc gộp 5 phút (FR-53). NiFi (PutSQL) và aggregator dự phòng cùng dùng nó.
-- Tham số theo thứ tự (dấu hỏi chấm kiểu JDBC): 1 roomId (uuid), 2 recordedAt (ISO 8601), 3 temperature, 4 humidity (chuỗi rỗng/NULL = thiếu).
-- Cửa sổ 5 phút căn theo UTC từ mốc epoch (00:00, 00:05, ...), tính theo recordedAt của lần đo (không phải giờ nhận), nên tin đến trễ
-- hoặc sai thứ tự vẫn vào đúng cửa sổ. Mỗi lần chạy cộng thêm đúng MỘT lần đo vào cửa sổ.
WITH e AS (
    SELECT CAST(? AS uuid) AS room_id,
           to_timestamp(floor(extract(epoch FROM CAST(? AS timestamptz)) / 300) * 300) AS window_start,
           CAST(NULLIF(?, '') AS numeric) AS t,
           CAST(NULLIF(?, '') AS numeric) AS h
)
INSERT INTO sensor_aggregates AS a (room_id, window_start, sum_temp, temp_count, min_temp, max_temp,
                                    sum_hum, hum_count, min_hum, max_hum, sample_count)
SELECT room_id, window_start,
       COALESCE(t, 0), CASE WHEN t IS NULL THEN 0 ELSE 1 END, t, t,
       COALESCE(h, 0), CASE WHEN h IS NULL THEN 0 ELSE 1 END, h, h, 1
FROM e
ON CONFLICT (room_id, window_start) DO UPDATE SET
    sum_temp     = a.sum_temp + EXCLUDED.sum_temp,
    temp_count   = a.temp_count + EXCLUDED.temp_count,
    min_temp     = LEAST(a.min_temp, EXCLUDED.min_temp),
    max_temp     = GREATEST(a.max_temp, EXCLUDED.max_temp),
    sum_hum      = a.sum_hum + EXCLUDED.sum_hum,
    hum_count    = a.hum_count + EXCLUDED.hum_count,
    min_hum      = LEAST(a.min_hum, EXCLUDED.min_hum),
    max_hum      = GREATEST(a.max_hum, EXCLUDED.max_hum),
    sample_count = a.sample_count + 1

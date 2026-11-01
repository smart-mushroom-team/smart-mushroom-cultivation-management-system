-- FR-37: nhớ thiết bị đã được báo offline chưa, để mỗi lần mất kết nối chỉ báo MỘT lần (và báo lại khi có kết nối trở lại).
ALTER TABLE devices ADD COLUMN offline_alerted_at timestamptz;

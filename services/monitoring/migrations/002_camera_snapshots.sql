-- Lịch sử ảnh camera: file JPEG nằm trên đĩa (Docker volume), PostgreSQL chỉ giữ metadata (không lưu ảnh nhị phân trong DB).
CREATE TABLE camera_snapshots (
    id          uuid PRIMARY KEY,
    device_id   uuid NOT NULL REFERENCES devices(id),
    room_id     uuid NOT NULL,                       -- tham chiếu logic sang Core (BR-16)
    image_path  text NOT NULL UNIQUE,                -- tương đối so với SNAPSHOT_DIR: <room_id>/<id>.jpg
    size_bytes  int  NOT NULL CHECK (size_bytes > 0),
    captured_at timestamptz NOT NULL,                -- lúc camera chụp (header X-Captured-At, mặc định = lúc nhận)
    created_at  timestamptz NOT NULL DEFAULT now()   -- lúc backend nhận ảnh
);
CREATE INDEX camera_snapshots_room_time_idx ON camera_snapshots (room_id, captured_at DESC);

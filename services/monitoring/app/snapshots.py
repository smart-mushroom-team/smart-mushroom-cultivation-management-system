"""Lưu ảnh camera: chỉ giữ ẢNH MỚI NHẤT của mỗi phòng (ghi đè), trong volume Docker. FR-28, FR-33."""
import datetime as dt
import os
import pathlib
import uuid

from common.config import env
from common.errors import AppError

MAX_BYTES = 1_500_000          # < giới hạn 2 MB của Gateway (còn chỗ cho phần bao multipart)
JPEG_MAGIC = b"\xff\xd8\xff"


def base_dir() -> pathlib.Path:
    return pathlib.Path(env("SNAPSHOT_DIR", "/data/snapshots"))


def valid_room_id(room_id: str) -> str:
    """room_id đi vào tên tệp, nên PHẢI là UUID chuẩn (chặn path traversal như ../../etc/passwd)."""
    try:
        return str(uuid.UUID(room_id))
    except ValueError:
        raise AppError(404, "ROOM_NOT_FOUND", "Phòng không tồn tại")


def path_for(room_id: str) -> pathlib.Path:
    return base_dir() / f"{valid_room_id(room_id)}.jpg"


def save(room_id: str, data: bytes) -> None:
    """Ghi nguyên tử (tệp tạm rồi os.replace) để người xem không bao giờ đọc phải ảnh ghi dở."""
    target = path_for(room_id)
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(f".{uuid.uuid4().hex}.tmp")
    try:
        tmp.write_bytes(data)
        os.replace(tmp, target)
    finally:
        tmp.unlink(missing_ok=True)


def captured_at(room_id: str) -> dt.datetime | None:
    p = path_for(room_id)
    return dt.datetime.fromtimestamp(p.stat().st_mtime, tz=dt.timezone.utc) if p.exists() else None

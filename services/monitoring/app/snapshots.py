"""Lưu lịch sử ảnh camera. JPEG nằm trên đĩa (Docker volume), metadata ở bảng camera_snapshots. FR-28, FR-33."""
import logging
import os
import pathlib
import time
import uuid

from sqlalchemy import text

from common.config import env
from common.db import engine
from common.errors import AppError

log = logging.getLogger("snapshots")
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


def retention_hours() -> float:
    return float(env("SNAPSHOT_RETENTION_HOURS", "24"))


def valid_uuid(value: str, what: str = "Phòng") -> str:
    """Id đi vào tên tệp nên PHẢI là UUID chuẩn (chặn path traversal như ../../etc/passwd)."""
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise AppError(404, "NOT_FOUND", f"{what} không tồn tại")


def valid_room_id(room_id: str) -> str:
    return valid_uuid(room_id, "Phòng")


def abs_path(rel: str) -> pathlib.Path:
    p = (base_dir() / rel).resolve()
    if base_dir().resolve() not in p.parents:               # đường dẫn trong DB không bao giờ được thoát khỏi thư mục ảnh
        raise AppError(404, "NO_SNAPSHOT", "Ảnh không tồn tại")
    return p


def store(device_id: str, room_id: str, data: bytes, captured_at) -> str:
    """Ghi file nguyên tử rồi mới ghi metadata; ghi metadata lỗi thì xóa file để không mồ côi."""
    room_id = valid_room_id(room_id)
    sid = str(uuid.uuid4())
    rel = f"{room_id}/{sid}.jpg"
    target = base_dir() / rel
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
        os.replace(tmp, target)                              # người xem không bao giờ đọc phải ảnh ghi dở
        with engine().begin() as c:
            c.execute(text("""INSERT INTO camera_snapshots(id,device_id,room_id,image_path,size_bytes,captured_at)
                              VALUES (:i,:d,:r,:p,:s,:t)"""),
                      {"i": sid, "d": device_id, "r": room_id, "p": rel, "s": len(data), "t": captured_at})
    except Exception:
        target.unlink(missing_ok=True)
        raise
    finally:
        tmp.unlink(missing_ok=True)
    return sid


def purge_old() -> dict:
    """Xóa ảnh quá hạn giữ (metadata trước, rồi file) và file mồ côi (có file, không có dòng DB, cũ hơn 1 giờ)."""
    with engine().begin() as c:
        gone = [r[0] for r in c.execute(text(
            "DELETE FROM camera_snapshots WHERE captured_at < now() - make_interval(secs => :s) RETURNING image_path"),
            {"s": retention_hours() * 3600})]
    removed = 0
    for rel in gone:
        try:
            abs_path(rel).unlink(missing_ok=True)
            removed += 1
        except Exception:                                    # noqa: BLE001
            log.exception("Không xóa được %s", rel)
    orphans = 0
    root = base_dir()
    if root.exists():
        with engine().connect() as c:
            known = {r[0] for r in c.execute(text("SELECT image_path FROM camera_snapshots"))}
        for f in root.glob("*/*"):
            rel = f.relative_to(root).as_posix()
            if rel not in known and time.time() - f.stat().st_mtime > 3600:
                f.unlink(missing_ok=True)
                orphans += 1
        for d in root.iterdir():                             # bỏ thư mục phòng đã rỗng
            if d.is_dir() and not any(d.iterdir()):
                d.rmdir()
    return {"deleted": len(gone), "files_removed": removed, "orphans_removed": orphans}
        os.replace(tmp, target)
    finally:
        tmp.unlink(missing_ok=True)


def captured_at(room_id: str) -> dt.datetime | None:
    p = path_for(room_id)
    return dt.datetime.fromtimestamp(p.stat().st_mtime, tz=dt.timezone.utc) if p.exists() else None

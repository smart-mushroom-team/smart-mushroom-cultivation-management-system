"""Redis chỉ giữ bản chụp mới nhất + lastSeen (SRS 6.x). Mất Redis: đọc từ DB, không mất dữ liệu nghiệp vụ."""
import json

import redis

from common.config import env

_r: redis.Redis | None = None


def r() -> redis.Redis:
    global _r
    if _r is None:
        _r = redis.Redis.from_url(env("REDIS_URL", "redis://redis:6379/0"), decode_responses=True, socket_timeout=2)
    return _r


def set_snapshot(room_id: str, data: dict) -> None:
    try:
        r().set(f"snapshot:{room_id}", json.dumps(data))
    except redis.RedisError:
        pass


def get_snapshot(room_id: str) -> dict | None:
    try:
        v = r().get(f"snapshot:{room_id}")
        return json.loads(v) if v else None
    except redis.RedisError:
        return None


def touch(device_id: str, ts: str) -> None:
    try:
        r().set(f"lastseen:{device_id}", ts)
    except redis.RedisError:
        pass

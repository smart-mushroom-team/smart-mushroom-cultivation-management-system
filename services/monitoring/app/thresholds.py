"""FR-38/FR-39: vượt ngưỡng N lần liên tiếp mới cảnh báo; một lần cảnh báo cho tới khi trở lại bình thường."""
import datetime as dt

from sqlalchemy import text

from common.events import ALERTS_QUEUE
from common.rabbit import publish


def _check(c, room_id, kind, value, lo, hi, n, cnt, alerting):
    """Trả (cnt mới, alerting mới, có cần phát sự kiện)."""
    if value is None:
        return cnt, alerting, False
    breach = value < lo or value > hi
    if breach:
        cnt += 1
        if cnt >= n and not alerting:
            return cnt, True, True
        return cnt, alerting, False
    return 0, False, False


def evaluate(conn, room_id: str, device_id: str, temp, hum, ts: dt.datetime) -> None:
    row = conn.execute(text("SELECT * FROM room_thresholds WHERE room_id=:r FOR UPDATE"), {"r": room_id}).first()
    if row is None:
        return
    t_cnt, t_al, t_fire = _check(conn, room_id, "TEMP", temp, row.temp_min, row.temp_max, row.consecutive_n,
                                 row.temp_breach_cnt, row.temp_alerting)
    h_cnt, h_al, h_fire = _check(conn, room_id, "HUM", hum, row.hum_min, row.hum_max, row.consecutive_n,
                                 row.hum_breach_cnt, row.hum_alerting)
    conn.execute(text("""UPDATE room_thresholds SET temp_breach_cnt=:a, temp_alerting=:b, hum_breach_cnt=:c, hum_alerting=:d
                         WHERE room_id=:r"""), {"a": t_cnt, "b": t_al, "c": h_cnt, "d": h_al, "r": room_id})
    for fire, kind, val in ((t_fire, "TEMP", temp), (h_fire, "HUMIDITY", hum)):
        if fire:
            # dedupeKey gồm mốc thời gian: Core xử lý lặp một sự kiện thì không tạo thêm thông báo (BR-19)
            publish(ALERTS_QUEUE, {"type": f"{kind}_OUT_OF_RANGE", "title": f"Cảnh báo {kind.lower()} vượt ngưỡng",
                                   "content": f"Giá trị {val} ngoài ngưỡng {row.consecutive_n} lần liên tiếp",
                                   "roomId": room_id, "deviceId": device_id,
                                   "dedupeKey": f"{kind}:{room_id}:{ts.isoformat()}"})

"""FR-38/FR-39: vượt ngưỡng N lần liên tiếp mới cảnh báo; một lần cảnh báo cho tới khi trở lại bình thường.

Quy tắc:
  * Giá trị bằng đúng min/max KHÔNG tính là vượt. Nhỏ hơn min hoặc lớn hơn max là vượt.
  * Một lần đo bình thường làm bộ đếm về 0 và kết thúc đợt cảnh báo.
  * Lần đo thiếu giá trị đó (ví dụ chỉ có độ ẩm) không làm đổi bộ đếm của giá trị còn thiếu.
  * evaluate() KHÔNG gửi RabbitMQ: trả danh sách sự kiện để gọi publish_alerts() SAU khi giao dịch đã commit
    (không giữ khóa dòng trong lúc chờ RabbitMQ, và không báo cho dữ liệu chưa được lưu).
"""
import datetime as dt
import logging

from sqlalchemy import text

from common.db import engine
from common.events import ALERTS_QUEUE
from common.rabbit import publish

log = logging.getLogger("thresholds")
LABEL = {"TEMP": ("nhiệt độ", "°C"), "HUMIDITY": ("độ ẩm", "%")}


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


def evaluate(conn, room_id: str, device_id: str, temp, hum, ts: dt.datetime) -> list[dict]:
    row = conn.execute(text("SELECT * FROM room_thresholds WHERE room_id=:r FOR UPDATE"), {"r": room_id}).first()
    if row is None:
        return []
    t_cnt, t_al, t_fire = _check(conn, room_id, "TEMP", temp, row.temp_min, row.temp_max, row.consecutive_n,
                                 row.temp_breach_cnt, row.temp_alerting)
    h_cnt, h_al, h_fire = _check(conn, room_id, "HUM", hum, row.hum_min, row.hum_max, row.consecutive_n,
                                 row.hum_breach_cnt, row.hum_alerting)
    conn.execute(text("""UPDATE room_thresholds SET temp_breach_cnt=:a, temp_alerting=:b, hum_breach_cnt=:c, hum_alerting=:d
                         WHERE room_id=:r"""), {"a": t_cnt, "b": t_al, "c": h_cnt, "d": h_al, "r": room_id})
    events = []
    for fire, kind, val, lo, hi in ((t_fire, "TEMP", temp, row.temp_min, row.temp_max),
                                    (h_fire, "HUMIDITY", hum, row.hum_min, row.hum_max)):
        if fire:
            name, unit = LABEL[kind]
            events.append({"type": f"{kind}_OUT_OF_RANGE", "title": f"Cảnh báo {name} vượt ngưỡng",
                           "content": f"{name.capitalize()} {float(val):g}{unit} ngoài khoảng {float(lo):g}-{float(hi):g}{unit} "
                                      f"({row.consecutive_n} lần đo liên tiếp)",
                           "roomId": room_id, "deviceId": device_id,
                           # mốc thời gian của lần đo gây cảnh báo nằm trong khóa: Core xử lý lặp một sự kiện không tạo thêm (BR-19)
                           "dedupeKey": f"{kind}:{room_id}:{ts.isoformat()}", "_kind": kind})
    return events


def publish_alerts(events: list[dict]) -> None:
    """Gửi sau commit. Gửi lỗi (RabbitMQ sập) thì gỡ cờ 'đang cảnh báo' để lần đo vượt ngưỡng kế tiếp phát lại,
    thay vì mất cảnh báo cho tới khi giá trị trở lại bình thường."""
    for ev in events:
        kind, room_id = ev.pop("_kind"), ev["roomId"]
        if publish(ALERTS_QUEUE, ev):
            continue
        col = "temp_alerting" if kind == "TEMP" else "hum_alerting"
        log.error("Không gửi được cảnh báo %s của phòng %s, sẽ thử lại ở lần đo vượt ngưỡng kế tiếp", ev["type"], room_id)
        with engine().begin() as c:
            c.execute(text(f"UPDATE room_thresholds SET {col}=false WHERE room_id=:r"), {"r": room_id})

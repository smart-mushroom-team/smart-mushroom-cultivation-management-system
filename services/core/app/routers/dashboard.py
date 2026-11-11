"""Tab Tổng quan của web: số liệu tổng hợp cho Operator/Admin trong một lần gọi.

Operator thấy việc cần xử lý. Doanh thu và hoàn tiền chỉ Admin thấy: server không trả khối đó cho Operator
(không chỉ ẩn ở giao diện)."""
import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import text

from common.db import engine
from common.security import CurrentUser, require_roles

from .. import clock

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

EXPIRING_DAYS = 3        # đơn hết hạn trong vòng bấy nhiêu ngày thì đưa vào "sắp hết hạn"
EXPIRING_LIMIT = 10
CHART_DAYS = 30
# Một yêu cầu kết thúc sớm đã được Admin duyệt thì phần hoàn tiền bị trừ khỏi doanh thu (kể cả khi chưa chuyển khoản).
REFUND_COUNTED = ("APPROVED", "REFUNDED", "COMPLETED")


def _f(v) -> float:
    return float(v) if isinstance(v, Decimal) else float(v or 0)


def _month_start(d: dt.date) -> dt.date:
    return d.replace(day=1)


def revenue_block(c, today: dt.date) -> dict:
    """Doanh thu theo ngày tạo đơn (giờ Việt Nam); hoàn tiền trừ vào ngày Admin duyệt yêu cầu.

    `today` là ngày thật theo giờ Việt Nam: doanh thu gắn với thời điểm tạo đơn thật, không theo ngày giả lập của chế độ demo."""
    this_start = _month_start(today)
    last_start = _month_start(this_start - dt.timedelta(days=1))
    chart_start = today - dt.timedelta(days=CHART_DAYS - 1)
    since = min(last_start, chart_start)
    since_ts = dt.datetime.combine(since, dt.time.min, tzinfo=clock.TZ)
    tz = "Asia/Ho_Chi_Minh"
    gross = {r.d: (_f(r.amount), int(r.n)) for r in c.execute(text(
        "SELECT (created_at AT TIME ZONE :tz)::date AS d, sum(total_amount) AS amount, count(*) AS n "
        "FROM rentals WHERE created_at >= :since GROUP BY 1"), {"tz": tz, "since": since_ts})}
    refunds = {r.d: _f(r.amount) for r in c.execute(text(
        "SELECT (reviewed_at AT TIME ZONE :tz)::date AS d, sum(refund_amount) AS amount "
        "FROM rental_termination_requests WHERE status = ANY(:st) AND reviewed_at >= :since GROUP BY 1"),
        {"tz": tz, "since": since_ts, "st": list(REFUND_COUNTED)})}

    def total(start: dt.date, end: dt.date) -> dict:
        g = sum(a for d, (a, _) in gross.items() if start <= d <= end)
        n = sum(k for d, (_, k) in gross.items() if start <= d <= end)
        r = sum(a for d, a in refunds.items() if start <= d <= end)
        return {"gross": g, "refunds": r, "net": g - r, "orders": n}

    daily = []
    for i in range(CHART_DAYS):
        d = chart_start + dt.timedelta(days=i)
        daily.append({"date": d.isoformat(), "gross": gross.get(d, (0.0, 0))[0], "refunds": refunds.get(d, 0.0)})
    return {"thisMonth": total(this_start, today), "lastMonth": total(last_start, this_start - dt.timedelta(days=1)), "daily": daily,
            "monthStart": this_start.isoformat()}


@router.get("", summary="Tổng quan: việc cần xử lý, đơn sắp hết hạn; Admin có thêm doanh thu và yêu cầu kết thúc sớm")
def dashboard(user: CurrentUser = Depends(require_roles("OPERATOR"))):
    today = clock.today()
    real_today = dt.datetime.now(clock.TZ).date()
    is_admin = user.role == "ADMIN"
    with engine().connect() as c:
        active = c.execute(text("SELECT count(*) FROM rentals WHERE status='ACTIVE'")).scalar()
        pv = c.execute(text("SELECT count(*) AS cycles, count(DISTINCT rental_id) AS rentals FROM cultivation_cycles "
                            "WHERE variety_status='PENDING' AND status='GROWING'")).first()
        expiring = [
            {"id": str(r.id), "customerName": r.customer_name, "packageName": r.package_name, "trayCount": r.tray_count,
             "endDate": r.end_date.isoformat(), "daysLeft": (r.end_date - today).days}
            for r in c.execute(text("SELECT id,customer_name,package_name,tray_count,end_date FROM rentals "
                                    "WHERE status='ACTIVE' AND end_date BETWEEN :a AND :b ORDER BY end_date, created_at LIMIT :n"),
                               {"a": today, "b": today + dt.timedelta(days=EXPIRING_DAYS), "n": EXPIRING_LIMIT})]
        expiring_total = c.execute(text("SELECT count(*) FROM rentals WHERE status='ACTIVE' AND end_date BETWEEN :a AND :b"),
                                   {"a": today, "b": today + dt.timedelta(days=EXPIRING_DAYS)}).scalar()
        expired_growing = c.execute(text("SELECT count(*) FROM rentals r WHERE r.status='EXPIRED' AND EXISTS "
                                         "(SELECT 1 FROM cultivation_cycles cc WHERE cc.rental_id=r.id AND cc.status='GROWING')")).scalar()
        awaiting = c.execute(text("SELECT count(*) FROM rental_termination_requests WHERE status='REFUNDED'")).scalar()
        out = {
            "today": today.isoformat(),
            "activeRentals": int(active),
            "pendingVarieties": {"cycles": int(pv.cycles), "rentals": int(pv.rentals)},
            "expiring": {"days": EXPIRING_DAYS, "total": int(expiring_total), "items": expiring},
            "expiredGrowing": int(expired_growing),
            "awaitingClearance": int(awaiting),
            "terminations": None,
            "revenue": None,
        }
        if is_admin:
            t = c.execute(text("SELECT count(*) FILTER (WHERE status='PENDING_REVIEW') AS review, "
                               "count(*) FILTER (WHERE status='APPROVED') AS transfer FROM rental_termination_requests")).first()
            out["terminations"] = {"pendingReview": int(t.review), "awaitingTransfer": int(t.transfer)}
            out["revenue"] = revenue_block(c, real_today)
    return out

"""Vòng đời đơn thuê: hết hạn -> hoàn tất (FR-22 – FR-24, BR-05, BR-07, BR-14). Mọi hàm idempotent."""
import logging

from sqlalchemy import text

from common.db import engine

from . import notify

log = logging.getLogger("lifecycle")


def try_complete(conn, rental_id: str) -> bool:
    """FR-24: EXPIRED + không còn đợt GROWING -> COMPLETED, khay về AVAILABLE. Không bao giờ COMPLETED khi còn GROWING."""
    done = conn.execute(text("""
        UPDATE rentals r SET status='COMPLETED'
        WHERE r.id=:id AND r.status='EXPIRED'
          AND NOT EXISTS (SELECT 1 FROM cultivation_cycles c WHERE c.rental_id=r.id AND c.status='GROWING')"""),
        {"id": rental_id}).rowcount == 1
    if done:
        conn.execute(text("""UPDATE trays SET occupancy_status='AVAILABLE'
                             WHERE id IN (SELECT tray_id FROM rental_trays WHERE rental_id=:id)"""), {"id": rental_id})
        conn.execute(text("UPDATE rental_trays SET is_active=false WHERE rental_id=:id"), {"id": rental_id})
    return done


def run_expiry(today) -> dict:
    """Job 00:00 UTC+7 (FR-22). Xử lý bù: mọi đơn ACTIVE có end_date < hôm nay. Lỗi một đơn không chặn các đơn khác."""
    stats = {"expired": 0, "completed": 0, "errors": 0}
    with engine().connect() as c:
        ids = [str(r[0]) for r in c.execute(text("SELECT id FROM rentals WHERE status='ACTIVE' AND end_date < :d"), {"d": today})]
        pending = [str(r[0]) for r in c.execute(text("SELECT id FROM rentals WHERE status='EXPIRED'"))]
    for rid in ids:
        try:
            with engine().begin() as c:
                n = c.execute(text("UPDATE rentals SET status='EXPIRED' WHERE id=:i AND status='ACTIVE'"), {"i": rid}).rowcount
                stats["expired"] += n
        except Exception:                                           # noqa: BLE001
            log.exception("Lỗi khi hết hạn đơn %s", rid)
            stats["errors"] += 1
    for rid in set(ids) | set(pending):
        try:
            with engine().begin() as c:
                if try_complete(c, rid):
                    stats["completed"] += 1
                elif c.execute(text("SELECT status FROM rentals WHERE id=:i"), {"i": rid}).scalar() == "EXPIRED":
                    # FR-23: còn đợt GROWING -> thông báo Operator đúng một lần (dedupeKey)
                    notify.create(c, type="RENTAL_EXPIRED_GROWING", title="Đơn hết hạn còn đợt nuôi dang dở",
                                  content="Cần thu hoạch hoặc loại bỏ", dedupe_key=f"EXPIRED_GROWING:{rid}",
                                  staff=True, data={"rentalId": rid})
        except Exception:                                           # noqa: BLE001
            log.exception("Lỗi khi hoàn tất đơn %s", rid)
            stats["errors"] += 1
    log.info("Expiry job: %s", stats)
    return stats

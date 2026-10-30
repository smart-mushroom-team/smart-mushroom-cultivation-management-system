"""FR-17 – FR-20: Khay của tôi, đợt nuôi (cultivation cycle), cập nhật tiến độ, thu hoạch, loại bỏ.

Quy tắc (BR-06):
  * stage chỉ tiến từng bước SEEDING -> INCUBATING -> FRUITING -> READY (không nhảy cóc, không lùi).
  * Thu hoạch chỉ khi stage là FRUITING hoặc READY: ghi harvested_at, weight_kg, note; status = HARVESTED.
  * Loại bỏ (DISCARDED) ở mọi giai đoạn, bắt buộc có lý do.
  * Chỉ đợt đang GROWING mới sửa được. Đơn EXPIRED vẫn được cập nhật/thu hoạch/loại bỏ (để đóng đơn).
  * Sau thu hoạch/loại bỏ: lifecycle.try_complete trong CÙNG giao dịch (FR-24).
  * Mỗi thay đổi lưu thông báo cho khách (dedupeKey) trong giao dịch; push FCM chỉ gửi sau khi commit (BR-18).
"""
import datetime as dt

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, current_user, require_roles

from .. import clock, lifecycle, notify

router = APIRouter(tags=["cultivation"])

STAGES = ["SEEDING", "INCUBATING", "FRUITING", "READY"]
STAGE_VI = {"SEEDING": "Cấy giống", "INCUBATING": "Ủ tơ", "FRUITING": "Ra quả thể", "READY": "Sẵn sàng thu hoạch"}


class CyclePatch(BaseModel):
    stage: str | None = Field(default=None, pattern="^(SEEDING|INCUBATING|FRUITING|READY)$")
    variety: str | None = Field(default=None, max_length=100)
    expectedHarvestDate: dt.date | None = None
    note: str | None = Field(default=None, max_length=1000)


class HarvestIn(BaseModel):
    weightKg: float = Field(gt=0, le=1000)
    note: str | None = Field(default=None, max_length=1000)


class DiscardIn(BaseModel):
    reason: str = Field(max_length=1000)

    @field_validator("reason")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Lý do loại bỏ là bắt buộc")
        return v.strip()


_SELECT = """
    SELECT cc.id, cc.rental_id, cc.tray_id, cc.stage, cc.status, cc.variety, cc.start_date, cc.expected_harvest_date,
           cc.harvested_at, cc.weight_kg, cc.discard_reason, cc.note,
           t.tray_code, t.room_id, t.location_row, t.location_shelf, t.location_slot,
           r.customer_id, r.customer_name, r.status AS rental_status, r.end_date AS rental_end_date
    FROM cultivation_cycles cc
         JOIN trays t ON t.id = cc.tray_id
         JOIN rentals r ON r.id = cc.rental_id"""


def _row(r) -> dict:
    d = {}
    for k, v in r._mapping.items():
        if isinstance(v, (dt.date, dt.datetime)):
            v = v.isoformat()
        elif k == "weight_kg" and v is not None:
            v = float(v)
        elif k in ("id", "rental_id", "tray_id", "room_id", "customer_id"):
            v = str(v)
        d[k] = v
    return d


def _locked_cycle(c, cycle_id: str):
    """Khóa dòng đợt nuôi: hai Operator thao tác cùng lúc sẽ tuần tự, không ghi đè nhau."""
    row = c.execute(text("""SELECT cc.*, r.customer_id FROM cultivation_cycles cc JOIN rentals r ON r.id=cc.rental_id
                            WHERE cc.id=:i FOR UPDATE OF cc"""), {"i": cycle_id}).first()
    if not row:
        raise AppError(404, "CYCLE_NOT_FOUND", "Đợt nuôi không tồn tại")
    if row.status != "GROWING":
        raise AppError(409, "CYCLE_NOT_GROWING", "Đợt nuôi đã kết thúc (thu hoạch hoặc loại bỏ)")
    return row


def _tray_code(c, tray_id) -> str:
    return c.execute(text("SELECT tray_code FROM trays WHERE id=:i"), {"i": tray_id}).scalar()


def _finish(c, cycle, event: str, title: str, content: str) -> list[tuple[str, str, str]]:
    """Chung cho thu hoạch/loại bỏ: thông báo khách + thử hoàn tất đơn. Trả về danh sách push cần gửi sau commit."""
    uid = str(cycle.customer_id)
    pushes = [(uid, title, content)]
    notify.create(c, type=f"CYCLE_{event}", title=title, content=content, dedupe_key=f"CYCLE:{cycle.id}:{event}",
                  user_id=uid, data={"cycleId": str(cycle.id), "rentalId": str(cycle.rental_id)})
    if lifecycle.try_complete(c, str(cycle.rental_id)):
        t, b = "Đơn thuê đã hoàn tất", "Tất cả khay của đơn đã được xử lý, khay đã được trả lại"
        notify.create(c, type="RENTAL_COMPLETED", title=t, content=b, dedupe_key=f"RENTAL_COMPLETED:{cycle.rental_id}",
                      user_id=uid, data={"rentalId": str(cycle.rental_id)})
        pushes.append((uid, t, b))
    return pushes


def _push_all(pushes) -> None:
    for uid, title, body in pushes:
        notify.push_to_user(uid, title, body)


# ---------------------------------------------------------------- Customer
@router.get("/my-trays", summary="FR-17: Khay của tôi (đơn ACTIVE hoặc EXPIRED còn đợt nuôi)")
def my_trays(user: CurrentUser = Depends(require_roles("CUSTOMER"))):
    with engine().connect() as c:
        rows = c.execute(text(_SELECT + """
            WHERE r.customer_id=:u AND r.status IN ('ACTIVE','EXPIRED') AND cc.status='GROWING'
            ORDER BY t.tray_code"""), {"u": user.id})
        return [_row(r) for r in rows]


# ---------------------------------------------------------------- Operator
@router.get("/cycles", summary="FR-18: Operator xem khay đang thuê kèm khách và hạn thuê")
def list_cycles(status: str = "GROWING", roomId: str | None = None, _=Depends(require_roles("OPERATOR"))):
    if status not in ("GROWING", "HARVESTED", "DISCARDED", "ALL"):
        raise AppError(422, "INVALID_STATUS", "status phải là GROWING, HARVESTED, DISCARDED hoặc ALL")
    q = _SELECT + " WHERE (:s='ALL' OR cc.status=:s) AND (CAST(:room AS uuid) IS NULL OR t.room_id=CAST(:room AS uuid)) " \
                  "ORDER BY r.end_date, t.tray_code"
    with engine().connect() as c:
        return [_row(r) for r in c.execute(text(q), {"s": status, "room": roomId})]


@router.get("/cycles/{cycle_id}", summary="Chi tiết đợt nuôi + nhật ký tiến độ (Operator hoặc chính chủ khay, BR-02)")
def get_cycle(cycle_id: str, user: CurrentUser = Depends(current_user)):
    with engine().connect() as c:
        row = c.execute(text(_SELECT + " WHERE cc.id=:i"), {"i": cycle_id}).first()
        if not row or (user.role == "CUSTOMER" and str(row.customer_id) != user.id):
            raise AppError(404, "CYCLE_NOT_FOUND", "Đợt nuôi không tồn tại")      # không lộ sự tồn tại của khay người khác
        logs = c.execute(text("SELECT from_stage,to_stage,note,created_at FROM cycle_progress_logs "
                              "WHERE cycle_id=:i ORDER BY created_at, id"), {"i": cycle_id})
        return {**_row(row), "logs": [{"from_stage": g.from_stage, "to_stage": g.to_stage, "note": g.note,
                                       "created_at": g.created_at.isoformat()} for g in logs]}


@router.patch("/cycles/{cycle_id}", summary="FR-18: cập nhật tiến độ / giống / ngày thu hoạch dự kiến / ghi chú")
def update_cycle(cycle_id: str, body: CyclePatch, user: CurrentUser = Depends(require_roles("OPERATOR"))):
    pushes: list = []
    with engine().begin() as c:
        cy = _locked_cycle(c, cycle_id)
        if body.expectedHarvestDate and body.expectedHarvestDate < cy.start_date:
            raise AppError(422, "INVALID_DATE", "Ngày thu hoạch dự kiến không thể trước ngày bắt đầu")
        if body.stage is not None:
            cur, nxt = STAGES.index(cy.stage), STAGES.index(body.stage)
            if nxt != cur + 1:
                nxt_name = STAGES[cur + 1] if cur + 1 < len(STAGES) else "(không còn bước tiếp theo)"
                raise AppError(409, "INVALID_STAGE_TRANSITION", f"Chỉ được chuyển từ {cy.stage} sang {nxt_name}")
            c.execute(text("INSERT INTO cycle_progress_logs(cycle_id,from_stage,to_stage,note,created_by) VALUES (:c,:f,:t,:n,:u)"),
                      {"c": cycle_id, "f": cy.stage, "t": body.stage, "n": body.note, "u": user.id})
            tray = _tray_code(c, cy.tray_id)
            title, content = f"Khay {tray}: {STAGE_VI[body.stage]}", f"Khay {tray} đã chuyển sang giai đoạn {STAGE_VI[body.stage]}"
            notify.create(c, type="CYCLE_STAGE", title=title, content=content, dedupe_key=f"CYCLE:{cycle_id}:STAGE:{body.stage}",
                          user_id=str(cy.customer_id), data={"cycleId": cycle_id, "stage": body.stage})
            pushes.append((str(cy.customer_id), title, content))
        c.execute(text("""UPDATE cultivation_cycles SET stage=COALESCE(:s,stage), variety=COALESCE(:v,variety),
                          expected_harvest_date=COALESCE(:e,expected_harvest_date), note=COALESCE(:n,note) WHERE id=:i"""),
                  {"s": body.stage, "v": body.variety, "e": body.expectedHarvestDate, "n": body.note, "i": cycle_id})
        out = _row(c.execute(text(_SELECT + " WHERE cc.id=:i"), {"i": cycle_id}).first())
    _push_all(pushes)
    return out


@router.post("/cycles/{cycle_id}/harvest", summary="FR-19: thu hoạch (chỉ khi FRUITING hoặc READY)")
def harvest(cycle_id: str, body: HarvestIn, user: CurrentUser = Depends(require_roles("OPERATOR"))):
    with engine().begin() as c:
        cy = _locked_cycle(c, cycle_id)
        if cy.stage not in ("FRUITING", "READY"):
            raise AppError(409, "CYCLE_NOT_READY", "Chỉ thu hoạch được khi đã ra quả thể (FRUITING) hoặc sẵn sàng (READY)")
        c.execute(text("""UPDATE cultivation_cycles SET status='HARVESTED', harvested_at=:d, weight_kg=:w,
                          note=COALESCE(:n,note) WHERE id=:i"""),
                  {"d": clock.today(), "w": body.weightKg, "n": body.note, "i": cycle_id})
        c.execute(text("INSERT INTO cycle_progress_logs(cycle_id,from_stage,to_stage,note,created_by) VALUES (:c,:f,'HARVESTED',:n,:u)"),
                  {"c": cycle_id, "f": cy.stage, "n": body.note, "u": user.id})
        tray = _tray_code(c, cy.tray_id)
        pushes = _finish(c, cy, "HARVESTED", f"Khay {tray}: đã thu hoạch", f"Khay {tray} thu hoạch được {body.weightKg:g} kg")
        out = _row(c.execute(text(_SELECT + " WHERE cc.id=:i"), {"i": cycle_id}).first())
    _push_all(pushes)
    return out


@router.post("/cycles/{cycle_id}/discard", summary="FR-20: loại bỏ đợt nuôi (bắt buộc có lý do)")
def discard(cycle_id: str, body: DiscardIn, user: CurrentUser = Depends(require_roles("OPERATOR"))):
    with engine().begin() as c:
        cy = _locked_cycle(c, cycle_id)
        c.execute(text("UPDATE cultivation_cycles SET status='DISCARDED', discard_reason=:r WHERE id=:i"),
                  {"r": body.reason, "i": cycle_id})
        c.execute(text("INSERT INTO cycle_progress_logs(cycle_id,from_stage,to_stage,note,created_by) VALUES (:c,:f,'DISCARDED',:n,:u)"),
                  {"c": cycle_id, "f": cy.stage, "n": body.reason, "u": user.id})
        tray = _tray_code(c, cy.tray_id)
        pushes = _finish(c, cy, "DISCARDED", f"Khay {tray}: đã loại bỏ", f"Khay {tray} bị loại bỏ. Lý do: {body.reason}")
        out = _row(c.execute(text(_SELECT + " WHERE cc.id=:i"), {"i": cycle_id}).first())
    _push_all(pushes)
    return out

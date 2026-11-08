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
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, current_user, require_roles

from .. import clock, lifecycle, notify
from .. import variety as variety_mod

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
    SELECT cc.id, cc.rental_id, cc.tray_id, cc.stage, cc.status, cc.variety, cc.variety_id, cc.variety_status,
           cc.variety_reject_reason, cc.start_date, cc.expected_harvest_date,
           cc.harvested_at, cc.weight_kg, cc.discard_reason, cc.note,
           t.tray_code, t.room_id, t.location_row, t.location_shelf, t.location_slot,
           r.customer_id, r.customer_name, r.status AS rental_status, r.end_date AS rental_end_date,
           mv.growth_days AS vi_growth_days, mv.temp_min AS vi_temp_min, mv.temp_max AS vi_temp_max,
           mv.hum_min AS vi_hum_min, mv.hum_max AS vi_hum_max
    FROM cultivation_cycles cc
         JOIN trays t ON t.id = cc.tray_id
         JOIN rentals r ON r.id = cc.rental_id
         LEFT JOIN mushroom_varieties mv ON mv.id = cc.variety_id"""


def _row(r) -> dict:
    d = {}
    for k, v in r._mapping.items():
        if k.startswith("vi_"):
            continue
        if isinstance(v, (dt.date, dt.datetime)):
            v = v.isoformat()
        elif k == "weight_kg" and v is not None:
            v = float(v)
        elif k in ("id", "rental_id", "tray_id", "room_id", "customer_id", "variety_id") and v is not None:
            v = str(v)
        d[k] = v
    m = r._mapping
    # Khoảng nhiệt độ, độ ẩm phù hợp của giống trong danh mục (null nếu chưa chọn giống hoặc giống tự nhập chưa vào danh mục).
    d["variety_info"] = None if m["vi_growth_days"] is None else {
        "growth_days": m["vi_growth_days"], "temp_min": float(m["vi_temp_min"]), "temp_max": float(m["vi_temp_max"]),
        "hum_min": float(m["vi_hum_min"]), "hum_max": float(m["vi_hum_max"])}
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
_CYCLE_STATUSES = ("GROWING", "HARVESTED", "DISCARDED")
_RENTAL_STATUSES = ("ACTIVE", "EXPIRED", "COMPLETED")


def _csv_filter(raw: str, allowed: tuple[str, ...], code: str, label: str) -> list[str]:
    """'ALL' hoặc danh sách cách nhau bởi dấu phẩy, mỗi giá trị phải nằm trong [allowed]."""
    if raw.strip().upper() == "ALL":
        return list(allowed)
    vals = [v.strip().upper() for v in raw.split(",") if v.strip()]
    if not vals or any(v not in allowed for v in vals):
        raise AppError(422, code, f"{label} phải là ALL hoặc một hay nhiều giá trị trong {', '.join(allowed)}")
    return vals


@router.get("/my-trays", summary="FR-17: Khay của tôi (mặc định: đợt đang nuôi của đơn ACTIVE hoặc EXPIRED)")
def my_trays(status: str = "GROWING", rentalStatus: str = "ACTIVE,EXPIRED", rentalId: str | None = None,
             user: CurrentUser = Depends(require_roles("CUSTOMER"))):
    """status: trạng thái đợt nuôi; rentalStatus: trạng thái đơn thuê (còn hạn = ACTIVE); rentalId: chỉ khay của một đơn."""
    cs = _csv_filter(status, _CYCLE_STATUSES, "INVALID_STATUS", "status")
    rs = _csv_filter(rentalStatus, _RENTAL_STATUSES, "INVALID_RENTAL_STATUS", "rentalStatus")
    if rentalId is not None:
        try:
            uuid.UUID(rentalId)
        except ValueError:
            raise AppError(422, "INVALID_RENTAL_ID", "rentalId không hợp lệ") from None
    with engine().connect() as c:
        rows = c.execute(text(_SELECT + """
            WHERE r.customer_id=:u AND r.status = ANY(CAST(:rs AS text[])) AND cc.status = ANY(CAST(:cs AS text[]))
              AND (CAST(:rid AS uuid) IS NULL OR r.id = CAST(:rid AS uuid))
            ORDER BY t.tray_code"""), {"u": user.id, "rs": rs, "cs": cs, "rid": rentalId})
        return [_row(r) for r in rows]


# ---------------------------------------------------------------- Operator
@router.get("/cycles", summary="FR-18: Operator xem khay đang thuê kèm khách và hạn thuê")
def list_cycles(status: str = "GROWING", roomId: str | None = None, varietyStatus: str | None = None,
                _=Depends(require_roles("OPERATOR"))):
    if status not in ("GROWING", "HARVESTED", "DISCARDED", "ALL"):
        raise AppError(422, "INVALID_STATUS", "status phải là GROWING, HARVESTED, DISCARDED hoặc ALL")
    if varietyStatus is not None and varietyStatus not in ("NONE", "APPROVED", "PENDING", "REJECTED"):
        raise AppError(422, "INVALID_VARIETY_STATUS", "varietyStatus phải là NONE, APPROVED, PENDING hoặc REJECTED")
    q = _SELECT + " WHERE (:s='ALL' OR cc.status=:s) AND (CAST(:room AS uuid) IS NULL OR t.room_id=CAST(:room AS uuid)) " \
                  "AND (CAST(:vs AS text) IS NULL OR cc.variety_status=:vs) ORDER BY r.end_date, t.tray_code"
    with engine().connect() as c:
        return [_row(r) for r in c.execute(text(q), {"s": status, "room": roomId, "vs": varietyStatus})]


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
        new_variety = " ".join(body.variety.split()) if body.variety is not None else None
        new_variety = new_variety or None                       # chuỗi rỗng = không đổi
        if body.stage is not None:
            effective = "APPROVED" if new_variety else cy.variety_status    # Operator nhập giống thì coi là đã duyệt
            if effective in ("PENDING", "REJECTED"):
                raise AppError(409, "VARIETY_NOT_APPROVED",
                               "Giống nấm đang chờ duyệt hoặc đã bị từ chối: hãy duyệt giống (hoặc để khách chọn lại) trước khi chuyển giai đoạn")
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
        v_id = None
        if new_variety:
            from .varieties import find_active_by_name
            hit = find_active_by_name(c, new_variety)
            new_variety, v_id = (hit.name, str(hit.id)) if hit else (new_variety, None)
        c.execute(text("""UPDATE cultivation_cycles SET stage=COALESCE(:s,stage), variety=COALESCE(:v,variety),
                          variety_id=CASE WHEN :v IS NULL THEN variety_id ELSE CAST(:vi AS uuid) END,
                          variety_status=CASE WHEN :v IS NULL THEN variety_status ELSE 'APPROVED' END,
                          variety_reject_reason=CASE WHEN :v IS NULL THEN variety_reject_reason ELSE NULL END,
                          expected_harvest_date=COALESCE(:e,expected_harvest_date), note=COALESCE(:n,note) WHERE id=:i"""),
                  {"s": body.stage, "v": new_variety, "vi": v_id, "e": body.expectedHarvestDate, "n": body.note, "i": cycle_id})
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


# ---------------------------------------------------------------- Giống nấm
class VarietyDecision(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class CatalogEntry(BaseModel):
    """Thông tin để thêm giống tự nhập vào danh mục lúc duyệt (khách hàng sẽ được đánh giá số đo theo khoảng này)."""
    growthDays: int = Field(gt=0, le=1000)
    tempMin: float = Field(ge=-40, le=85)
    tempMax: float = Field(ge=-40, le=85)
    humMin: float = Field(ge=0, le=100)
    humMax: float = Field(ge=0, le=100)
    description: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def _ranges(self):
        if self.tempMin > self.tempMax or self.humMin > self.humMax:
            raise ValueError("Giá trị nhỏ nhất không được lớn hơn giá trị lớn nhất")
        return self


class ApproveIn(BaseModel):
    addToCatalog: CatalogEntry | None = None


@router.put("/cycles/{cycle_id}/variety", summary="Khách chọn hoặc đổi giống khi khay còn ở giai đoạn Cấy giống")
def customer_set_variety(cycle_id: str, body: variety_mod.VarietyChoice, user: CurrentUser = Depends(require_roles("CUSTOMER"))):
    if not body.varietyId and body.customVariety is None:
        raise AppError(422, "VARIETY_REQUIRED", "Hãy chọn một giống hoặc nhập tên giống")
    with engine().begin() as c:
        cy = c.execute(text("""SELECT cc.*, r.customer_id FROM cultivation_cycles cc JOIN rentals r ON r.id=cc.rental_id
                               WHERE cc.id=:i FOR UPDATE OF cc"""), {"i": cycle_id}).first() if _is_uuid(cycle_id) else None
        if not cy or str(cy.customer_id) != user.id:
            raise AppError(404, "CYCLE_NOT_FOUND", "Đợt nuôi không tồn tại")            # BR-02
        if cy.status != "GROWING":
            raise AppError(409, "CYCLE_NOT_GROWING", "Đợt nuôi đã kết thúc (thu hoạch hoặc loại bỏ)")
        if cy.stage != "SEEDING":
            raise AppError(409, "VARIETY_LOCKED", "Chỉ đổi được giống khi khay còn ở giai đoạn Cấy giống")
        name, vid, status = variety_mod.resolve(c, body)
        c.execute(text("""UPDATE cultivation_cycles SET variety=:v, variety_id=CAST(:vi AS uuid), variety_status=:s,
                          variety_reject_reason=NULL WHERE id=:i"""), {"v": name, "vi": vid, "s": status, "i": cycle_id})
        tray = _tray_code(c, cy.tray_id)
        pending = status == "PENDING"
        if pending:
            notify.create(c, type="VARIETY_PENDING", title="Có giống nấm chờ duyệt", content=f"{user.name} chọn giống \"{name}\" cho khay {tray}",
                          dedupe_key=f"VARIETY_PENDING:{cycle_id}:{name.lower()}", staff=True, data={"cycleId": cycle_id})
        out = _row(c.execute(text(_SELECT + " WHERE cc.id=:i"), {"i": cycle_id}).first())
    if pending:
        notify.push_to_staff("Có giống nấm chờ duyệt", f"{user.name} chọn giống \"{name}\" cho khay {tray}", {"type": "VARIETY_PENDING", "cycleId": cycle_id})
    return out


def _decide(cycle_id: str, approve: bool, reason: str | None, entry: CatalogEntry | None = None) -> dict:
    """Duyệt/từ chối giống đang chờ. Áp dụng cho mọi khay cùng đơn đang chờ cùng tên giống, để khỏi duyệt từng khay."""
    pushes: list = []
    with engine().begin() as c:
        cy = _locked_cycle(c, cycle_id)
        if cy.variety_status != "PENDING":
            raise AppError(409, "VARIETY_NOT_PENDING", "Giống này không ở trạng thái chờ duyệt")
        rows = c.execute(text("""SELECT cc.id, t.tray_code FROM cultivation_cycles cc JOIN trays t ON t.id=cc.tray_id
                                 WHERE cc.rental_id=:r AND cc.status='GROWING' AND cc.variety_status='PENDING'
                                   AND lower(cc.variety)=lower(:v) ORDER BY t.tray_code FOR UPDATE OF cc"""),
                         {"r": cy.rental_id, "v": cy.variety}).all()
        ids = [str(r.id) for r in rows]
        if approve:
            vid = None
            if entry:
                try:
                    vid = str(c.execute(text("""INSERT INTO mushroom_varieties(name,description,growth_days,temp_min,temp_max,hum_min,hum_max)
                                              VALUES (:n,:d,:g,:tmin,:tmax,:hmin,:hmax) RETURNING id"""),
                                        {"n": cy.variety, "d": entry.description.strip(), "g": entry.growthDays, "tmin": entry.tempMin,
                                         "tmax": entry.tempMax, "hmin": entry.humMin, "hmax": entry.humMax}).scalar())
                except IntegrityError:
                    raise AppError(409, "VARIETY_EXISTS", "Danh mục đã có giống trùng tên này (có thể đang bị tắt). "
                                   "Hãy bật lại giống đó, hoặc duyệt mà không thêm vào danh mục.")
            c.execute(text("UPDATE cultivation_cycles SET variety_status='APPROVED', variety_reject_reason=NULL, "
                           "variety_id=COALESCE(CAST(:vid AS uuid), variety_id) WHERE id = ANY(CAST(:ids AS uuid[]))"), {"ids": ids, "vid": vid})
            etype, title = "APPROVED", "Giống nấm đã được duyệt"
            content = f"Giống \"{cy.variety}\" cho {len(ids)} khay ({', '.join(r.tray_code for r in rows)}) đã được duyệt"
        else:
            c.execute(text("UPDATE cultivation_cycles SET variety_status='REJECTED', variety_reject_reason=:r WHERE id = ANY(CAST(:ids AS uuid[]))"),
                      {"r": reason, "ids": ids})
            etype, title = "REJECTED", "Giống nấm bị từ chối"
            content = f"Giống \"{cy.variety}\" chưa được chấp nhận. Lý do: {reason}. Vui lòng chọn giống khác trong danh mục."
        uid = str(cy.customer_id)
        notify.create(c, type=f"VARIETY_{etype}", title=title, content=content, dedupe_key=f"VARIETY_{etype}:{ids[0]}:{cy.variety.lower()}",
                      user_id=uid, data={"cycleId": ids[0], "rentalId": str(cy.rental_id)})
        pushes.append((uid, title, content))
    _push_all(pushes)
    return {"updated": len(ids), "cycleIds": ids, "addedToCatalog": bool(approve and entry)}


@router.post("/cycles/{cycle_id}/variety/approve", summary="Operator duyệt giống tự nhập (có thể kèm thêm vào danh mục với khoảng nhiệt độ, độ ẩm)")
def approve_variety(cycle_id: str, body: ApproveIn | None = None, _=Depends(require_roles("OPERATOR"))):
    return _decide(cycle_id, True, None, body.addToCatalog if body else None)


@router.post("/cycles/{cycle_id}/variety/reject", summary="Operator từ chối giống tự nhập (bắt buộc có lý do)")
def reject_variety(cycle_id: str, body: VarietyDecision, _=Depends(require_roles("OPERATOR"))):
    reason = (body.reason or "").strip()
    if not reason:
        raise AppError(422, "REASON_REQUIRED", "Hãy nhập lý do từ chối")
    return _decide(cycle_id, False, reason)


def _is_uuid(s: str) -> bool:
    import uuid
    try:
        uuid.UUID(s)
        return True
    except ValueError:
        return False

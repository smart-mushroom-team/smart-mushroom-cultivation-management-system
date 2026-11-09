"""Early termination: snapshot refund at request time; human-reviewed bank transfer."""
import datetime as dt
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, require_roles

router = APIRouter(prefix="/terminations", tags=["terminations"])
TZ = ZoneInfo("Asia/Ho_Chi_Minh")

class RequestIn(BaseModel):
    bankName: str = Field(min_length=2,max_length=100)
    accountNumber: str = Field(min_length=4,max_length=40,pattern=r"^[0-9]+$")
    accountHolder: str = Field(min_length=2,max_length=100)

class DecisionIn(BaseModel):
    approve: bool
    reason: str | None = Field(default=None,max_length=1000)

class TransferIn(BaseModel):
    reference: str = Field(min_length=3,max_length=150)


def serialize(r):
    d = dict(r._mapping)
    for k,v in list(d.items()):
        if isinstance(v,(dt.datetime,dt.date)): d[k]=v.isoformat()
        elif isinstance(v,Decimal): d[k]=float(v)
        elif k in ('id','rental_id','customer_id','reviewed_by','cleared_by') and v is not None: d[k]=str(v)
    return d

@router.post('/rentals/{rental_id}',status_code=201)
def request_termination(rental_id: str, body: RequestIn, user: CurrentUser=Depends(require_roles('CUSTOMER'))):
    now=dt.datetime.now(TZ)
    with engine().begin() as c:
        r=c.execute(text('SELECT * FROM rentals WHERE id=CAST(:r AS uuid) AND customer_id=CAST(:u AS uuid) FOR UPDATE'),{'r':rental_id,'u':user.id}).first()
        if not r: raise AppError(404,'RENTAL_NOT_FOUND','Không tìm thấy đơn thuê')
        if r.status!='ACTIVE': raise AppError(409,'NOT_ACTIVE','Đơn không còn hoạt động')
        pending=c.execute(text("SELECT 1 FROM rental_termination_requests WHERE rental_id=:r AND status IN ('PENDING_REVIEW','APPROVED','REFUNDED')"),{'r':r.id}).scalar()
        if pending: raise AppError(409,'REQUEST_EXISTS','Đơn đã có yêu cầu đang xử lý')
        # Each started 24-hour interval counts as a used day; snapshot at the server's receipt time.
        started=dt.datetime.combine(r.start_date,dt.time.min,tzinfo=TZ)
        elapsed=max(0,(now-started).total_seconds())
        used=min(r.duration_days,max(1,int((elapsed+86399.999999)//86400)))
        remaining=max(0,r.duration_days-used)
        if remaining==0: raise AppError(409,'NO_DAYS_LEFT','Đơn không còn ngày thuê để hoàn tiền')
        # All cycles must have finished before a customer can request early termination.
        growing=c.execute(text("SELECT count(*) FROM cultivation_cycles WHERE rental_id=:r AND status='GROWING'"),{'r':r.id}).scalar()
        if growing: raise AppError(409,'CYCLES_NOT_FINISHED','Cần thu hoạch hoặc kết thúc toàn bộ đợt nuôi trước khi yêu cầu')
        amount=(Decimal(str(r.price_per_tray))*r.tray_count*Decimal(remaining)*Decimal('0.70')/Decimal(r.duration_days)).quantize(Decimal('1'),rounding=ROUND_HALF_UP)
        policy=r.policy_version
        result=c.execute(text("""INSERT INTO rental_termination_requests(rental_id,customer_id,used_days,remaining_days,refund_amount,bank_name,account_number,account_holder,policy_version)
            VALUES (:r,:u,:used,:remaining,:amount,:bank,:number,:holder,:policy) RETURNING *"""),
            {'r':r.id,'u':user.id,'used':used,'remaining':remaining,'amount':amount,'bank':body.bankName.strip(),'number':body.accountNumber,'holder':body.accountHolder.strip(),'policy':policy}).first()
        return serialize(result)

@router.get('/mine')
def mine(user: CurrentUser=Depends(require_roles('CUSTOMER'))):
    with engine().connect() as c:
        rows=c.execute(text('SELECT * FROM rental_termination_requests WHERE customer_id=CAST(:u AS uuid) ORDER BY requested_at DESC'),{'u':user.id})
        return [serialize(r) for r in rows]

@router.get('')
def all_requests(_=Depends(require_roles('ADMIN'))):
    with engine().connect() as c:
        rows=c.execute(text("""SELECT t.*,r.customer_name,r.package_name,r.tray_count,r.start_date,r.end_date,r.status AS rental_status
            FROM rental_termination_requests t JOIN rentals r ON r.id=t.rental_id ORDER BY t.requested_at DESC"""))
        return [serialize(r) for r in rows]

@router.post('/{request_id}/decision')
def decide(request_id: str, body: DecisionIn, user: CurrentUser=Depends(require_roles('ADMIN'))):
    if not body.approve and not (body.reason or '').strip(): raise AppError(422,'REASON_REQUIRED','Cần ghi lý do từ chối')
    with engine().begin() as c:
        r=c.execute(text("""UPDATE rental_termination_requests SET status=:s,rejection_reason=:reason,reviewed_by=CAST(:u AS uuid),reviewed_at=now()
            WHERE id=CAST(:id AS uuid) AND status='PENDING_REVIEW' RETURNING id"""),{'s':'APPROVED' if body.approve else 'REJECTED','reason':None if body.approve else body.reason.strip(),'u':user.id,'id':request_id}).first()
        if not r: raise AppError(409,'INVALID_STATE','Yêu cầu không ở trạng thái chờ duyệt')
    return {'status':'APPROVED' if body.approve else 'REJECTED'}

@router.post('/{request_id}/transfer')
def confirm_transfer(request_id: str, body: TransferIn, _=Depends(require_roles('ADMIN'))):
    # This endpoint records an external transfer; it does not send money.
    with engine().begin() as c:
        r=c.execute(text("""UPDATE rental_termination_requests SET status='REFUNDED',transfer_reference=:ref,refunded_at=now()
            WHERE id=CAST(:id AS uuid) AND status='APPROVED' RETURNING id"""),{'id':request_id,'ref':body.reference.strip()}).first()
        if not r: raise AppError(409,'INVALID_STATE','Chỉ xác nhận chuyển khoản cho yêu cầu đã duyệt')
    return {'status':'REFUNDED'}

@router.get('/awaiting-clearance')
def awaiting_clearance(_=Depends(require_roles('OPERATOR'))):
    with engine().connect() as c:
        rows = c.execute(text("""
            SELECT t.id, t.rental_id, t.remaining_days,
                   r.package_name, r.tray_count, r.customer_name,
                   COALESCE(room.name, 'Chưa xác định') AS room_name
            FROM rental_termination_requests t
            JOIN rentals r ON r.id = t.rental_id
            LEFT JOIN rooms room ON room.id = r.room_id
            WHERE t.status = 'REFUNDED'
            ORDER BY t.refunded_at
        """)).fetchall()
        result = [serialize(row) for row in rows]
        for item in result:
            tray_rows = c.execute(text("""
                SELECT t.id AS tray_id, t.tray_code,
                       t.location_row, t.location_shelf, t.location_slot,
                       room.name AS room_name
                FROM rental_trays rt
                JOIN trays t ON t.id = rt.tray_id
                JOIN rooms room ON room.id = t.room_id
                WHERE rt.rental_id = CAST(:r AS uuid)
                  AND rt.is_active = true
                ORDER BY t.location_row, t.location_shelf, t.location_slot, t.tray_code
            """), {'r': item['rental_id']}).fetchall()
            item['trays'] = [
                {
                    'tray_id': str(tray.tray_id),
                    'tray_code': tray.tray_code,
                    'position': f'H{tray.location_row}-K{tray.location_shelf}-O{tray.location_slot}',
                }
                for tray in tray_rows
            ]
            # Older rentals may not have room_id populated; derive it from their trays.
            if item['room_name'] == 'Chưa xác định' and tray_rows:
                item['room_name'] = tray_rows[0].room_name
        return result

@router.post('/{request_id}/clear')
def clear_trays(request_id: str, user: CurrentUser=Depends(require_roles('OPERATOR'))):
    with engine().begin() as c:
        r=c.execute(text('SELECT * FROM rental_termination_requests WHERE id=CAST(:i AS uuid) FOR UPDATE'),{'i':request_id}).first()
        if not r or r.status!='REFUNDED': raise AppError(409,'INVALID_STATE','Chỉ bàn giao khay sau khi xác nhận hoàn tiền')
        rental=c.execute(text('SELECT * FROM rentals WHERE id=:i FOR UPDATE'),{'i':r.rental_id}).first()
        if rental.status not in ('ACTIVE','EXPIRED'): raise AppError(409,'INVALID_RENTAL','Đơn đã kết thúc')
        n=c.execute(text("SELECT count(*) FROM cultivation_cycles WHERE rental_id=:r AND status='GROWING'"),{'r':r.rental_id}).scalar()
        if n: raise AppError(409,'CYCLES_NOT_FINISHED','Còn đợt nuôi đang hoạt động')
        c.execute(text("UPDATE rental_trays SET is_active=false WHERE rental_id=:r"),{'r':r.rental_id})
        c.execute(text("UPDATE trays SET occupancy_status='AVAILABLE' WHERE id IN (SELECT tray_id FROM rental_trays WHERE rental_id=:r)"),{'r':r.rental_id})
        c.execute(text("UPDATE rentals SET status='COMPLETED' WHERE id=:r"),{'r':r.rental_id})
        c.execute(text("UPDATE rental_termination_requests SET status='COMPLETED',cleared_by=CAST(:u AS uuid),cleared_at=now() WHERE id=:i"),{'u':user.id,'i':r.id})
    return {'status':'COMPLETED'}

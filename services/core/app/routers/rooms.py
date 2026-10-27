"""FR-07, FR-08: phòng và khay (Admin/Operator). Danh sách/tạo cơ bản; TODO: sửa, ngừng phòng (không khi còn khay RENTED), xóa khay chưa từng thuê."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from common.db import engine
from common.errors import AppError
from common.security import CurrentUser, current_user, require_roles

router = APIRouter(tags=["rooms & trays"])


class RoomIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class RoomPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    status: str | None = Field(default=None, pattern="^(ACTIVE|INACTIVE)$")


class TrayIn(BaseModel):
    trayCode: str = Field(min_length=1, max_length=50)
    roomId: str
    row: int = Field(ge=1)
    shelf: int = Field(ge=1)
    slot: int = Field(ge=1)


class TrayPatch(BaseModel):
    trayCode: str | None = Field(default=None, min_length=1, max_length=50)
    roomId: str | None = None
    row: int | None = Field(default=None, ge=1)
    shelf: int | None = Field(default=None, ge=1)
    slot: int | None = Field(default=None, ge=1)


def _room_row(r):
    return {"id": str(r.id), "name": r.name, "status": r.status}


@router.get("/rooms")
def list_rooms(_: CurrentUser = Depends(current_user)):
    with engine().connect() as c:
        return [_room_row(r) for r in c.execute(text("SELECT id,name,status FROM rooms ORDER BY name"))]


@router.post("/rooms", status_code=201)
def create_room(body: RoomIn, _=Depends(require_roles("OPERATOR"))):
    with engine().begin() as c:
        return {"id": str(c.execute(text("INSERT INTO rooms(name) VALUES (:n) RETURNING id"), {"n": body.name}).scalar())}


@router.patch("/rooms/{room_id}", summary="Sửa tên / ngừng hoặc bật lại phòng")
def update_room(room_id: str, body: RoomPatch, _=Depends(require_roles("OPERATOR"))):
    with engine().begin() as c:
        room = c.execute(text("SELECT id,name,status FROM rooms WHERE id=:i FOR UPDATE"), {"i": room_id}).first()
        if not room:
            raise AppError(404, "ROOM_NOT_FOUND", "Phòng không tồn tại")
        if body.status == "INACTIVE" and room.status != "INACTIVE":
            rented = c.execute(text("SELECT count(*) FROM trays WHERE room_id=:i AND occupancy_status='RENTED'"),
                               {"i": room_id}).scalar()
            if rented:
                raise AppError(409, "ROOM_HAS_RENTED_TRAYS", f"Phòng còn {rented} khay đang được thuê, không thể ngừng")
        c.execute(text("UPDATE rooms SET name=COALESCE(:n,name), status=COALESCE(:s,status) WHERE id=:i"),
                  {"n": body.name, "s": body.status, "i": room_id})
        return _room_row(c.execute(text("SELECT id,name,status FROM rooms WHERE id=:i"), {"i": room_id}).first())


@router.get("/trays")
def list_trays(roomId: str | None = None, _=Depends(require_roles("OPERATOR"))):
    q = "SELECT id,tray_code,room_id,location_row,location_shelf,location_slot,occupancy_status FROM trays"
    with engine().connect() as c:
        rows = c.execute(text(q + (" WHERE room_id=:r" if roomId else "") + " ORDER BY tray_code"), {"r": roomId})
        return [dict(r._mapping, id=str(r.id), room_id=str(r.room_id)) for r in rows]


@router.post("/trays", status_code=201)
def create_tray(body: TrayIn, _=Depends(require_roles("OPERATOR"))):
    try:
        with engine().begin() as c:
            if not c.execute(text("SELECT 1 FROM rooms WHERE id=:i"), {"i": body.roomId}).first():
                raise AppError(404, "ROOM_NOT_FOUND", "Phòng không tồn tại")
            tid = c.execute(text("""INSERT INTO trays(tray_code,room_id,location_row,location_shelf,location_slot)
                                    VALUES (:c,:r,:a,:b,:d) RETURNING id"""),
                            {"c": body.trayCode, "r": body.roomId, "a": body.row, "b": body.shelf, "d": body.slot}).scalar()
    except IntegrityError:
        raise AppError(409, "TRAY_CODE_EXISTS", "Mã khay đã tồn tại")
    return {"id": str(tid)}


def _tray_row(r):
    return {"id": str(r.id), "tray_code": r.tray_code, "room_id": str(r.room_id), "location_row": r.location_row,
            "location_shelf": r.location_shelf, "location_slot": r.location_slot, "occupancy_status": r.occupancy_status}


@router.patch("/trays/{tray_id}", summary="Sửa mã / vị trí khay (đổi phòng chỉ khi khay đang AVAILABLE)")
def update_tray(tray_id: str, body: TrayPatch, _=Depends(require_roles("OPERATOR"))):
    try:
        with engine().begin() as c:
            tray = c.execute(text("SELECT * FROM trays WHERE id=:i FOR UPDATE"), {"i": tray_id}).first()
            if not tray:
                raise AppError(404, "TRAY_NOT_FOUND", "Khay không tồn tại")
            if body.roomId and str(tray.room_id) != body.roomId:
                if tray.occupancy_status == "RENTED":
                    raise AppError(409, "TRAY_RENTED", "Khay đang được thuê, không thể chuyển phòng")
                if not c.execute(text("SELECT 1 FROM rooms WHERE id=:i"), {"i": body.roomId}).first():
                    raise AppError(404, "ROOM_NOT_FOUND", "Phòng không tồn tại")
            c.execute(text("""UPDATE trays SET tray_code=COALESCE(:c,tray_code), room_id=COALESCE(CAST(:r AS uuid),room_id),
                              location_row=COALESCE(:a,location_row), location_shelf=COALESCE(:b,location_shelf),
                              location_slot=COALESCE(:d,location_slot) WHERE id=:i"""),
                      {"c": body.trayCode, "r": body.roomId, "a": body.row, "b": body.shelf, "d": body.slot, "i": tray_id})
            return _tray_row(c.execute(text("SELECT id,tray_code,room_id,location_row,location_shelf,location_slot,occupancy_status FROM trays WHERE id=:i"),
                                       {"i": tray_id}).first())
    except IntegrityError:
        raise AppError(409, "TRAY_CODE_EXISTS", "Mã khay đã tồn tại")


@router.delete("/trays/{tray_id}", status_code=204, summary="Xóa khay chưa từng thuê")
def delete_tray(tray_id: str, _=Depends(require_roles("OPERATOR"))):
    with engine().begin() as c:
        if not c.execute(text("SELECT 1 FROM trays WHERE id=:i FOR UPDATE"), {"i": tray_id}).first():
            raise AppError(404, "TRAY_NOT_FOUND", "Khay không tồn tại")
        if c.execute(text("SELECT 1 FROM rental_trays WHERE tray_id=:i LIMIT 1"), {"i": tray_id}).first():
            raise AppError(409, "TRAY_HAS_HISTORY", "Khay đã từng được thuê, không thể xóa")
        c.execute(text("DELETE FROM trays WHERE id=:i"), {"i": tray_id})

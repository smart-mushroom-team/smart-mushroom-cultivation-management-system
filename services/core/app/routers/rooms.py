"""FR-07, FR-08: phòng và khay (Admin/Operator). Danh sách/tạo cơ bản; TODO: sửa, ngừng phòng (không khi còn khay RENTED), xóa khay chưa từng thuê."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from common.db import engine
from common.security import CurrentUser, current_user, require_roles

router = APIRouter(tags=["rooms & trays"])


class RoomIn(BaseModel):
    name: str


class TrayIn(BaseModel):
    trayCode: str
    roomId: str
    row: int
    shelf: int
    slot: int


@router.get("/rooms")
def list_rooms(_: CurrentUser = Depends(current_user)):
    with engine().connect() as c:
        return [dict(r._mapping, id=str(r.id)) for r in c.execute(text("SELECT id,name,status FROM rooms ORDER BY name"))]


@router.post("/rooms", status_code=201)
def create_room(body: RoomIn, _=Depends(require_roles("OPERATOR"))):
    with engine().begin() as c:
        return {"id": str(c.execute(text("INSERT INTO rooms(name) VALUES (:n) RETURNING id"), {"n": body.name}).scalar())}


@router.get("/trays")
def list_trays(roomId: str | None = None, _=Depends(require_roles("OPERATOR"))):
    q = "SELECT id,tray_code,room_id,location_row,location_shelf,location_slot,occupancy_status FROM trays"
    with engine().connect() as c:
        rows = c.execute(text(q + (" WHERE room_id=:r" if roomId else "") + " ORDER BY tray_code"), {"r": roomId})
        return [dict(r._mapping, id=str(r.id), room_id=str(r.room_id)) for r in rows]


@router.post("/trays", status_code=201)
def create_tray(body: TrayIn, _=Depends(require_roles("OPERATOR"))):
    with engine().begin() as c:
        tid = c.execute(text("""INSERT INTO trays(tray_code,room_id,location_row,location_shelf,location_slot)
                                VALUES (:c,:r,:a,:b,:d) RETURNING id"""),
                        {"c": body.trayCode, "r": body.roomId, "a": body.row, "b": body.shelf, "d": body.slot}).scalar()
    return {"id": str(tid)}

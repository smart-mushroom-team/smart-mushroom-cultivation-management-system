import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { Pagination } from '../../components/Pagination'
import { createRoom, listRooms, listTrays, patchRoom, type Room } from '../../api/core'
import { describeError } from '../../api/http'
import { Notice } from '../../components/Notice'
import { btn, ghost, input, primary } from './ui'

const ROOM_CAPACITY = 4 * 2 * 4

export function RoomsTab() {
  const { session } = useAuth()
  const canEdit = session?.role === 'ADMIN'
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const trays = useQuery({ queryKey: ['trays'], queryFn: listTrays })
  const refresh = () => qc.invalidateQueries({ queryKey: ['rooms'] })
  const [name, setName] = useState('')
  const [shown, setShown] = useState(false)
  const add = useMutation({ mutationFn: () => createRoom(name.trim()), onSuccess: () => { setName(''); setShown(false); return refresh() } })

  function submit(e: FormEvent) {
    e.preventDefault()
    setShown(true)
    if (name.trim()) add.mutate()
  }

  const totalPages = Math.max(1, Math.ceil((rooms.data?.length ?? 0) / 5))
  const currentPage = Math.min(page, totalPages)
  const pageRooms = (rooms.data ?? []).slice((currentPage - 1) * 5, currentPage * 5)
  return (
    <div className="space-y-5">
      {canEdit && <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Thêm phòng</h2>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="room-name" className="block text-sm font-medium">Tên phòng</label>
            <input id="room-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={input} aria-invalid={shown && !name.trim() ? true : undefined} aria-describedby={shown && !name.trim() ? 'room-name-err' : undefined} />
            {shown && !name.trim() && <p id="room-name-err" className="mt-1 text-sm text-brick">Nhập tên phòng.</p>}
          </div>
          <button type="submit" disabled={add.isPending} className={`${primary} mt-[1.6rem]`}>{add.isPending ? 'Đang thêm...' : 'Thêm phòng'}</button>
        </div>
        {add.isError && <div className="mt-3"><Notice tone="error">Không thêm được. {describeError(add.error)}</Notice></div>}
      </form>}

      {trays.isError && <Notice tone="error">Không tải được thống kê khay. <button className="font-medium underline" onClick={() => void trays.refetch()}>Thử lại</button></Notice>}

      {rooms.error ? (
        <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void rooms.refetch()}>Thử lại</button>}>Không tải được danh sách phòng. {describeError(rooms.error)}</Notice>
      ) : !rooms.data ? (
        <p className="text-mute" role="status">Đang tải...</p>
      ) : rooms.data.length === 0 ? (
        <p className="text-mute">Chưa có phòng nào. Thêm phòng đầu tiên ở trên, rồi sang mục Khay để thêm khay.</p>
      ) : (
        <ul className="space-y-3">
          {pageRooms.map((r) => {
            const mine = (trays.data ?? []).filter((t) => t.roomId === r.id)
            return <RoomRow key={r.id} room={r} total={trays.data ? mine.length : null} rented={trays.data ? mine.filter((t) => t.occupancy === 'RENTED').length : null} onChanged={refresh} canEdit={canEdit} />
          })}
        </ul>
      )}
      {!!rooms.data?.length && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  )
}

function RoomRow({ room, total, rented, onChanged, canEdit }: { room: Room; total: number | null; rented: number | null; onChanged: () => unknown; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(room.name)
  const patch = useMutation({ mutationFn: (b: { name?: string; status?: Room['status'] }) => patchRoom(room.id, b), onSuccess: () => { setEditing(false); return onChanged() } })
  const active = room.status === 'ACTIVE'
  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">{room.name}</h3>
          <p className="mt-0.5 text-sm text-mute">Sức chứa tối đa: {ROOM_CAPACITY} vị trí (4 hàng × 2 kệ × 4 ô)</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${active ? 'bg-moss-soft text-moss' : 'bg-amber-soft text-amber'}`}>{active ? 'Đang hoạt động' : 'Đã ngừng'}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label={`Thống kê ${room.name}`}>
        <div className="rounded-lg border border-line p-3">
          <p className="text-xs text-mute">Đã đặt khay</p>
          <p className="mt-1 text-xl font-semibold">{total === null ? '—' : `${total}/${ROOM_CAPACITY}`}</p>
        </div>
        <div className="rounded-lg border border-line p-3">
          <p className="text-xs text-mute">Đang thuê</p>
          <p className="mt-1 text-xl font-semibold">{rented === null ? '—' : rented}</p>
        </div>
        <div className="rounded-lg border border-line p-3">
          <p className="text-xs text-mute">Ô chưa có khay</p>
          <p className="mt-1 text-xl font-semibold">{total === null ? '—' : Math.max(0, ROOM_CAPACITY - total)}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-mute">
          <span>Mức sử dụng vị trí</span>
          <span>{total === null ? 'Đang tải...' : `${total}/${ROOM_CAPACITY}`}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-moss-soft" role="progressbar" aria-label="Mức sử dụng vị trí" aria-valuemin={0} aria-valuemax={ROOM_CAPACITY} aria-valuenow={total ?? 0}>
          <div className="h-full rounded-full bg-moss" style={{ width: `${Math.min(100, Math.max(0, (total ?? 0) / ROOM_CAPACITY * 100))}%` }} />
        </div>
      </div>
      {canEdit && (editing ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (name.trim()) patch.mutate({ name: name.trim() }) }} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor={`rn-${room.id}`} className="block text-sm font-medium">Tên phòng</label>
            <input id={`rn-${room.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={input} />
          </div>
          <button type="submit" disabled={patch.isPending || !name.trim()} className={primary}>Lưu</button>
          <button type="button" onClick={() => { setEditing(false); setName(room.name) }} className={`${btn} border border-line`}>Hủy</button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className={ghost}>Sửa tên</button>
          <button type="button" disabled={patch.isPending} onClick={() => patch.mutate({ status: active ? 'INACTIVE' : 'ACTIVE' })} className={ghost}>{active ? 'Ngừng phòng' : 'Bật lại'}</button>
        </div>
      ))}
      {patch.isError && <div className="mt-3"><Notice tone="error">Không thực hiện được. {describeError(patch.error)}</Notice></div>}
    </li>
  )
}

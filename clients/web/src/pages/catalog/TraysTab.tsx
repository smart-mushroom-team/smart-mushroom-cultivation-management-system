import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { createTray, deleteTray, listRooms, listTrays, patchTray, type Room, type Tray } from '../../api/core'
import { describeError } from '../../api/http'
import { Notice } from '../../components/Notice'
import { parseInt_, planTrays } from '../../lib/catalog'
import { btn, ghost, input, primary } from './ui'

export function TraysTab() {
  const qc = useQueryClient()
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const trays = useQuery({ queryKey: ['trays'], queryFn: listTrays })
  const [filter, setFilter] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['trays'] })
  const roomName = (id: string) => rooms.data?.find((r) => r.id === id)?.name ?? '—'
  const list = (trays.data ?? []).filter((t) => !filter || t.roomId === filter)

  return (
    <div className="space-y-5">
      <AddTrays rooms={(rooms.data ?? []).filter((r) => r.status === 'ACTIVE')} onDone={refresh} />

      <label className="flex items-center gap-2 text-sm">
        Phòng
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm">
          <option value="">Tất cả</option>
          {(rooms.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>

      {trays.error ? (
        <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void trays.refetch()}>Thử lại</button>}>Không tải được danh sách khay. {describeError(trays.error)}</Notice>
      ) : !trays.data ? (
        <p className="text-mute" role="status">Đang tải...</p>
      ) : list.length === 0 ? (
        <p className="text-mute">{filter ? 'Phòng này chưa có khay.' : 'Chưa có khay nào. Dùng form phía trên để thêm.'}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => <TrayRow key={t.id} tray={t} room={roomName(t.roomId)} rooms={rooms.data ?? []} onChanged={refresh} />)}
        </ul>
      )}
    </div>
  )
}

function AddTrays({ rooms, onDone }: { rooms: Room[]; onDone: () => unknown }) {
  const [roomId, setRoomId] = useState('')
  const [prefix, setPrefix] = useState('')
  const [count, setCount] = useState('1')
  const [row, setRow] = useState('1')
  const [shelf, setShelf] = useState('1')
  const [slot, setSlot] = useState('1')
  const [shown, setShown] = useState(false)
  const [result, setResult] = useState<{ ok: number; total: number; failed?: string } | null>(null)
  const n = parseInt_(count, 1, 50)
  const r = parseInt_(row)
  const s = parseInt_(shelf)
  const sl = parseInt_(slot)
  const valid = !!roomId && prefix.trim() !== '' && n !== null && r !== null && s !== null && sl !== null

  const add = useMutation({
    mutationFn: async () => {
      // Tạo tuần tự để mã nào lỗi thì dừng ngay và báo đã tạo được bao nhiêu, thay vì đoán xem khay nào đã có.
      const plan = n === 1 ? [{ trayCode: prefix.trim(), slot: sl! }] : planTrays(prefix.trim(), n!, sl!)
      let ok = 0
      for (const p of plan) {
        try {
          await createTray({ trayCode: p.trayCode, roomId, row: r!, shelf: s!, slot: p.slot })
          ok++
        } catch (e) {
          setResult({ ok, total: plan.length, failed: `${p.trayCode}: ${describeError(e)}` })
          await onDone()
          return
        }
      }
      setResult({ ok, total: plan.length })
      await onDone()
    },
  })
  function submit(e: FormEvent) {
    e.preventDefault()
    setShown(true)
    setResult(null)
    if (valid) add.mutate()
  }
  const err = (cond: boolean, id: string, msg: string) => (shown && cond ? <p id={id} className="mt-1 text-sm text-brick">{msg}</p> : null)
  const inv = (cond: boolean, id: string) => ({ 'aria-invalid': shown && cond ? true : undefined, 'aria-describedby': shown && cond ? id : undefined })

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-paper p-4">
      <h2 className="font-display text-base font-semibold">Thêm khay</h2>
      <p className="mt-1 text-sm text-mute">Thêm một khay, hoặc nhiều khay liền nhau trên cùng một kệ: mã sẽ là tiền tố kèm số thứ tự (A1-01, A1-02...), ô tăng dần.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="t-room" className="block text-sm font-medium">Phòng</label>
          <select id="t-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className={input} {...inv(!roomId, 't-room-e')}>
            <option value="">Chọn phòng...</option>
            {rooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          {err(!roomId, 't-room-e', 'Chọn phòng đặt khay.')}
        </div>
        <div>
          <label htmlFor="t-prefix" className="block text-sm font-medium">Mã khay (hoặc tiền tố)</label>
          <input id="t-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={40} className={input} {...inv(!prefix.trim(), 't-prefix-e')} />
          {err(!prefix.trim(), 't-prefix-e', 'Nhập mã khay.')}
        </div>
        <div>
          <label htmlFor="t-count" className="block text-sm font-medium">Số lượng</label>
          <input id="t-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} className={input} {...inv(n === null, 't-count-e')} />
          {err(n === null, 't-count-e', 'Nhập số nguyên từ 1 đến 50.')}
        </div>
        <div>
          <label htmlFor="t-row" className="block text-sm font-medium">Hàng</label>
          <input id="t-row" inputMode="numeric" value={row} onChange={(e) => setRow(e.target.value)} className={input} {...inv(r === null, 't-row-e')} />
          {err(r === null, 't-row-e', 'Nhập số nguyên từ 1.')}
        </div>
        <div>
          <label htmlFor="t-shelf" className="block text-sm font-medium">Kệ</label>
          <input id="t-shelf" inputMode="numeric" value={shelf} onChange={(e) => setShelf(e.target.value)} className={input} {...inv(s === null, 't-shelf-e')} />
          {err(s === null, 't-shelf-e', 'Nhập số nguyên từ 1.')}
        </div>
        <div>
          <label htmlFor="t-slot" className="block text-sm font-medium">Ô (bắt đầu từ)</label>
          <input id="t-slot" inputMode="numeric" value={slot} onChange={(e) => setSlot(e.target.value)} className={input} {...inv(sl === null, 't-slot-e')} />
          {err(sl === null, 't-slot-e', 'Nhập số nguyên từ 1.')}
        </div>
      </div>
      <div className="mt-3"><button type="submit" disabled={add.isPending} className={primary}>{add.isPending ? 'Đang thêm...' : 'Thêm khay'}</button></div>
      {result && !result.failed && <div className="mt-3"><Notice tone="ok">Đã thêm {result.ok} khay.</Notice></div>}
      {result?.failed && <div className="mt-3"><Notice tone="error">Đã thêm {result.ok}/{result.total} khay, dừng ở {result.failed}</Notice></div>}
    </form>
  )
}

function TrayRow({ tray, room, rooms, onChanged }: { tray: Tray; room: string; rooms: Room[]; onChanged: () => unknown }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')
  const [code, setCode] = useState(tray.code)
  const [roomId, setRoomId] = useState(tray.roomId)
  const [row, setRow] = useState(String(tray.row))
  const [shelf, setShelf] = useState(String(tray.shelf))
  const [slot, setSlot] = useState(String(tray.slot))
  const r = parseInt_(row), s = parseInt_(shelf), sl = parseInt_(slot)
  const ok = code.trim() !== '' && r !== null && s !== null && sl !== null
  const rented = tray.occupancy === 'RENTED'
  const patch = useMutation({
    mutationFn: () => patchTray(tray.id, { trayCode: code.trim(), roomId, row: r!, shelf: s!, slot: sl! }),
    onSuccess: () => { setMode('view'); return onChanged() },
  })
  const del = useMutation({ mutationFn: () => deleteTray(tray.id), onSuccess: () => onChanged() })

  return (
    <li className="rounded-lg border border-line bg-paper px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-medium">{tray.code}</span>
          <span className="ml-2 text-sm text-mute">{room} · hàng {tray.row}, kệ {tray.shelf}, ô {tray.slot}</span>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${rented ? 'bg-spore-soft text-spore-deep' : 'bg-bone text-mute'}`}>{rented ? 'Đã thuê' : 'Còn trống'}</span>
      </div>
      {mode === 'view' && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setMode('edit')} className={ghost} aria-label={`Sửa khay ${tray.code}`}>Sửa</button>
          <button type="button" onClick={() => setMode('delete')} className={ghost} aria-label={`Xóa khay ${tray.code}`}>Xóa</button>
        </div>
      )}
      {mode === 'edit' && (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (ok) patch.mutate() }} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label htmlFor={`c-${tray.id}`} className="block text-sm font-medium">Mã khay</label>
              <input id={`c-${tray.id}`} value={code} onChange={(e) => setCode(e.target.value)} maxLength={50} className={input} />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor={`r-${tray.id}`} className="block text-sm font-medium">Phòng</label>
              <select id={`r-${tray.id}`} value={roomId} disabled={rented} onChange={(e) => setRoomId(e.target.value)} className={input}>
                {rooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              {rented && <p className="mt-1 text-xs text-mute">Khay đang được thuê nên chưa chuyển phòng được.</p>}
            </div>
            {([['Hàng', row, setRow, r], ['Kệ', shelf, setShelf, s], ['Ô', slot, setSlot, sl]] as const).map(([l, v, set, parsed]) => (
              <div key={l}>
                <label htmlFor={`${l}-${tray.id}`} className="block text-sm font-medium">{l}</label>
                <input id={`${l}-${tray.id}`} inputMode="numeric" value={v} onChange={(e) => set(e.target.value)} className={input} aria-invalid={parsed === null ? true : undefined} />
                {parsed === null && <p className="mt-1 text-sm text-brick">Số nguyên từ 1.</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={patch.isPending || !ok} className={primary}>{patch.isPending ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" onClick={() => setMode('view')} className={`${btn} border border-line`}>Hủy</button>
          </div>
        </form>
      )}
      {mode === 'delete' && (
        <div role="group" aria-label={`Xác nhận xóa khay ${tray.code}`} className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm">Xóa khay <strong>{tray.code}</strong>? Chỉ xóa được khay chưa từng được thuê.</span>
          <button type="button" disabled={del.isPending} onClick={() => del.mutate()} className={`${btn} bg-brick text-paper`}>{del.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}</button>
          <button type="button" onClick={() => { setMode('view'); del.reset() }} className={`${btn} border border-line`}>Hủy</button>
        </div>
      )}
      {(patch.isError || del.isError) && <div className="mt-3"><Notice tone="error">Không thực hiện được. {describeError(patch.error ?? del.error)}</Notice></div>}
    </li>
  )
}

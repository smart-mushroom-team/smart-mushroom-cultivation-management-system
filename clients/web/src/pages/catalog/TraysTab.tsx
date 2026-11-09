import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTray, deleteTray, listRooms, listTrays, patchTray, type Tray } from '../../api/core'
import { describeError } from '../../api/http'
import { Notice } from '../../components/Notice'
import { input, primary } from './ui'
import { useAuth } from '../../auth/AuthContext'
import { parseInt_, planTrays } from '../../lib/catalog'

const positions = Array.from({ length: 32 }, (_, i) => ({ row: Math.floor(i / 8) + 1, shelf: Math.floor(i % 8 / 4) + 1, slot: i % 4 + 1 }))
const positionKey = (row: number, shelf: number, slot: number) => `${row}-${shelf}-${slot}`

export function TraysTab() {
  const { session } = useAuth()
  const canEdit = session?.role === 'ADMIN'
  const qc = useQueryClient()
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const trays = useQuery({ queryKey: ['trays'], queryFn: listTrays })
  const [search, setSearch] = useState('')
  const [roomId, setRoomId] = useState('')
  const [batchRoomId, setBatchRoomId] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [count, setCount] = useState('1')
  const [startSlot, setStartSlot] = useState('1')
  const [showAdd, setShowAdd] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [adding, setAdding] = useState(false)
  const [batchError, setBatchError] = useState('')
  const [error, setError] = useState('')
  const activeRooms = useMemo(() => (rooms.data ?? []).filter(r => (canEdit ? r.status === 'ACTIVE' : true) && r.name.toLowerCase().includes(search.toLowerCase())), [rooms.data, search])
  useEffect(() => { if (!roomId && activeRooms.length) setRoomId(activeRooms[0].id) }, [activeRooms, roomId])
  const current = rooms.data?.find(r => r.id === roomId)
  const occupied = new Map<string, Tray>((trays.data ?? []).filter(t => t.roomId === roomId).map(t => [positionKey(t.row,t.shelf,t.slot),t]))
  const place = positions.find(p => positionKey(p.row,p.shelf,p.slot) === selected)
  const selectedTray = selected ? occupied.get(selected) : undefined
  const validCount = parseInt_(count, 1, 32)
  const firstSlot = parseInt_(startSlot, 1, 32)

  const addOne = useMutation({
    mutationFn: () => createTray({ roomId, trayCode: code.trim(), row: place!.row, shelf: place!.shelf, slot: place!.slot }),
    onSuccess: async () => { setCode(''); setSelected(null); setError(''); await qc.invalidateQueries({ queryKey: ['trays'] }) },
    onError: e => setError(describeError(e)),
  })
  const remove = useMutation({
    mutationFn: deleteTray,
    onSuccess: async () => { setSelected(null); await qc.invalidateQueries({ queryKey: ['trays'] }) },
    onError: e => setError(describeError(e)),
  })

  async function submitBatch(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!batchRoomId || !code.trim() || validCount === null || firstSlot === null || firstSlot + validCount - 1 > 32) return

    setAdding(true)
    setBatchError('')
    const plan = planTrays(code.trim(), validCount, firstSlot)
    try {
      for (let i = 0; i < plan.length; i++) {
        const { trayCode, slot: linearSlot } = plan[i]
        const position = linearSlot - 1
        try {
          await createTray({
            roomId: batchRoomId,
            trayCode,
            row: Math.floor(position / 8) + 1,
            shelf: Math.floor(position % 8 / 4) + 1,
            slot: position % 4 + 1,
          })
        } catch (cause) {
          setBatchError(`Đã thêm ${i}/${plan.length} khay, dừng ở ${trayCode}: ${describeError(cause)}`)
          await qc.invalidateQueries({ queryKey: ['trays'] })
          return
        }
      }
      setCode('')
      setSubmitted(false)
      setShowAdd(false)
      await qc.invalidateQueries({ queryKey: ['trays'] })
    } finally {
      setAdding(false)
    }
  }

  return <div className="space-y-5">
    {canEdit && <section className="rounded-lg border border-line bg-paper p-4">
      {!showAdd ? <button type="button" className={primary} onClick={() => { setShowAdd(true); setSubmitted(true) }}>Thêm khay</button> : <form onSubmit={submitBatch} noValidate className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Thêm khay</h2>
        <div>
          <label className="block text-sm font-medium" htmlFor="t-room">Phòng</label>
          <select id="t-room" className={input} value={batchRoomId} onChange={e => { setBatchRoomId(e.target.value); setRoomId(e.target.value) }}>
            <option value="">Chọn phòng</option>
            {activeRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {submitted && !batchRoomId && <p className="mt-1 text-sm text-brick">Chọn phòng đặt khay.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="tray-code">Mã khay (hoặc tiền tố)</label>
          <input id="tray-code" className={input} value={code} maxLength={50} onChange={e => setCode(e.target.value)} />
          {submitted && !code.trim() && <p className="mt-1 text-sm text-brick">Nhập mã khay.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium" htmlFor="tray-count">Số lượng
            <input id="tray-count" className={input} inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} />
          </label>
          <label className="block text-sm font-medium" htmlFor="tray-start">Ô (bắt đầu từ)
            <input id="tray-start" className={input} inputMode="numeric" value={startSlot} onChange={e => setStartSlot(e.target.value)} />
          </label>
        </div>
        {submitted && validCount === null && <p className="text-sm text-brick">Số lượng phải từ 1 đến 32.</p>}
        {submitted && firstSlot === null && <p className="text-sm text-brick">Ô bắt đầu phải từ 1 đến 32.</p>}
        {submitted && firstSlot !== null && validCount !== null && firstSlot + validCount - 1 > 32 && <p className="text-sm text-brick">Số khay vượt quá 32 ô trong phòng.</p>}
        <div className="flex gap-2">
          <button type="submit" className={primary} disabled={adding}>{adding ? 'Đang thêm...' : 'Thêm khay'}</button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-sm" onClick={() => { setShowAdd(false); setSubmitted(false); setBatchError('') }}>Hủy</button>
        </div>
        {batchError && <Notice tone="error">{batchError}</Notice>}
      </form>}
    </section>}
    <div className="rounded-lg border border-line bg-paper p-4 space-y-3">
      <h2 className="font-display text-lg font-semibold">Chọn phòng và bố trí khay</h2>
      <label className="block text-sm font-medium" htmlFor="room-search">Tìm phòng</label>
      <input id="room-search" className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nhập tên phòng..." />
      <label className="block text-sm font-medium" htmlFor="tray-room">Phòng</label>
      <select id="tray-room" className={input} value={activeRooms.some(r => r.id === roomId) ? roomId : ''} onChange={e => { setRoomId(e.target.value); setSelected(null); setError('') }}>
        <option value="">Chọn phòng</option>
        {activeRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </div>
    {trays.isError && <Notice tone="error">Không tải được khay: {describeError(trays.error)}</Notice>}
    {current && <div className="rounded-lg border border-line bg-paper p-4 space-y-4">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Sơ đồ {current.name}</h3><span className="text-sm text-mute">{occupied.size}/32 vị trí đã có khay</span></div>
      <p className="text-sm text-mute">4 hàng × 2 kệ × 4 ô. {canEdit ? 'Chọn một ô để thêm khay; ô đã có khay hiển thị mã và trạng thái.' : 'Chọn một ô để xem thông tin khay; không thể thay đổi dữ liệu.'}</p>
      <div className="space-y-4">{[1,2,3,4].map(row => <section key={row}>
        <h4 className="mb-2 font-semibold">Hàng {row}</h4>
        <div className="grid gap-3 md:grid-cols-2">{[1,2].map(shelf => <div key={shelf} className="rounded-lg border border-line p-3">
          <div className="mb-2 text-sm text-mute">Kệ {shelf}</div>
          <div className="grid grid-cols-4 gap-2">{[1,2,3,4].map(slot => {
            const key = positionKey(row,shelf,slot), tray = occupied.get(key)
            return <button type="button" key={slot} onClick={() => { setSelected(key); setError('') }} aria-pressed={selected === key} aria-label={`H${row}-K${shelf}-O${slot}${tray ? `, ${tray.code}` : ', trống'}`} className={`min-h-20 rounded-md border p-2 text-xs transition-colors ${selected === key ? 'border-moss ring-2 ring-moss' : 'border-line'} ${tray ? tray.occupancy === 'RENTED' ? 'bg-amber-soft' : 'bg-moss-soft' : 'bg-bone'}`}>
              <span className="block font-semibold">O{slot}</span><span className="mt-1 block break-all">{tray ? tray.code : 'Trống'}</span><span className="block">{tray?.occupancy === 'RENTED' ? 'Đang thuê' : tray ? 'Sẵn sàng' : ''}</span>
            </button>
          })}</div>
        </div>)}</div>
      </section>)}</div>
    </div>}
    {!!trays.data?.length && <section className="rounded-lg border border-line bg-paper p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">Danh sách khay</h2>
      <ul className="space-y-3">
        {trays.data.map(tray => <TrayRow key={tray.id} tray={tray} rooms={rooms.data ?? []} canEdit={canEdit} onChanged={() => qc.invalidateQueries({ queryKey: ['trays'] })} />)}
      </ul>
    </section>}
    {place && <div className="rounded-lg border border-line bg-paper p-4 space-y-3">
      <h3 className="font-semibold">Vị trí H{place.row}-K{place.shelf}-O{place.slot}</h3>
      {selectedTray ? <><p className="text-sm">Khay {selectedTray.code} — {selectedTray.occupancy === 'RENTED' ? 'Đang thuê' : 'Sẵn sàng'}</p>
        {canEdit && <button type="button" className="rounded border border-line px-3 py-2 text-sm" disabled={selectedTray.occupancy === 'RENTED' || remove.isPending} onClick={() => { if (window.confirm(`Xóa khay ${selectedTray.code}?`)) remove.mutate(selectedTray.id) }}>Xóa khay chưa từng thuê</button>}
      </> : canEdit ? <form onSubmit={e => { e.preventDefault(); if (code.trim()) addOne.mutate() }} className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><label htmlFor="new-tray-code" className="block text-sm font-medium">Mã khay</label><input id="new-tray-code" className={input} maxLength={50} value={code} onChange={e => setCode(e.target.value)} placeholder="VD: A-H1-K1-O2" /></div>
        <button type="submit" className={primary} disabled={!code.trim() || addOne.isPending}>Thêm khay vào ô</button>
      </form> : <p className="text-sm text-mute">Ô này chưa có khay.</p>}
      {error && <Notice tone="error">{error}</Notice>}
    </div>}
    {!current && <p className="text-sm text-mute">Chọn một phòng đang hoạt động để xem sơ đồ.</p>}
  </div>
}

function TrayRow({ tray, rooms, canEdit, onChanged }: { tray: Tray; rooms: { id: string; name: string; status: 'ACTIVE' | 'INACTIVE' }[]; canEdit: boolean; onChanged: () => unknown }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [trayCode, setTrayCode] = useState(tray.code)
  const [targetRoom, setTargetRoom] = useState(tray.roomId)
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: () => patchTray(tray.id, { trayCode: trayCode.trim(), roomId: targetRoom }),
    onSuccess: async () => { setEditing(false); setError(''); await onChanged() },
    onError: e => setError(describeError(e)),
  })
  const remove = useMutation({
    mutationFn: () => deleteTray(tray.id),
    onSuccess: async () => { setConfirming(false); setError(''); await qc.invalidateQueries({ queryKey: ['trays'] }) },
    onError: e => setError(describeError(e)),
  })
  const rented = tray.occupancy === 'RENTED'
  return <li className="rounded-md border border-line p-3">
    {editing ? <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor={`code-${tray.id}`}>Mã khay
        <input id={`code-${tray.id}`} className={input} value={trayCode} onChange={e => setTrayCode(e.target.value)} />
      </label>
      <label className="block text-sm font-medium" htmlFor={`r-${tray.id}`}>Phòng
        <select id={`r-${tray.id}`} className={input} value={targetRoom} disabled={rented} onChange={e => setTargetRoom(e.target.value)}>
          {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
      </label>
      {rented && <p className="text-sm text-mute">Khay đang được thuê nên chưa chuyển phòng được.</p>}
      <div className="flex gap-2">
        <button type="button" className={primary} disabled={!trayCode.trim() || save.isPending} onClick={() => save.mutate()}>Lưu</button>
        <button type="button" className="rounded-md border border-line px-3 py-1.5 text-sm" onClick={() => { setEditing(false); setTrayCode(tray.code); setTargetRoom(tray.roomId); setError('') }}>Hủy</button>
      </div>
    </div> : <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-medium">{tray.code} — {rooms.find(room => room.id === tray.roomId)?.name ?? 'Không rõ phòng'} — {rented ? 'Đang thuê' : 'Sẵn sàng'}</span>
      {canEdit && <div className="flex gap-2">
        <button type="button" className="rounded-md border border-line px-3 py-1.5 text-sm" onClick={() => setEditing(true)}>Sửa khay {tray.code}</button>
        <button type="button" className="rounded-md border border-line px-3 py-1.5 text-sm" onClick={() => { setConfirming(true); setError('') }}>Xóa khay {tray.code}</button>
      </div>}
    </div>}
    {confirming && <div className="mt-3 space-y-2" role="group" aria-label={`Xác nhận xóa khay ${tray.code}`}>
      <p className="text-sm">Bạn có chắc muốn xóa khay {tray.code}?</p>
      <button type="button" className={primary} disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}</button>
      <button type="button" className="ml-2 rounded-md border border-line px-3 py-1.5 text-sm" onClick={() => setConfirming(false)}>Hủy</button>
    </div>}
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
  </li>
}

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTray, deleteTray, listRooms, listTrays, type Tray } from '../../api/core'
import { describeError } from '../../api/http'
import { Notice } from '../../components/Notice'
import { input, primary } from './ui'
import { useAuth } from '../../auth/AuthContext'

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
  const [selected, setSelected] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const activeRooms = useMemo(() => (rooms.data ?? []).filter(r => (canEdit ? r.status === 'ACTIVE' : true) && r.name.toLowerCase().includes(search.toLowerCase())), [rooms.data, search])
  useEffect(() => { if (!roomId && activeRooms.length) setRoomId(activeRooms[0].id) }, [activeRooms, roomId])
  const current = rooms.data?.find(r => r.id === roomId)
  const occupied = new Map<string, Tray>((trays.data ?? []).filter(t => t.roomId === roomId).map(t => [positionKey(t.row,t.shelf,t.slot),t]))
  const place = positions.find(p => positionKey(p.row,p.shelf,p.slot) === selected)
  const add = useMutation({ mutationFn: () => createTray({ roomId, trayCode: code.trim(), row: place!.row, shelf: place!.shelf, slot: place!.slot }), onSuccess: async () => { setCode(''); setSelected(null); setError(''); await qc.invalidateQueries({ queryKey: ['trays'] }) }, onError: e => setError(describeError(e)) })
  const remove = useMutation({ mutationFn: (id: string) => deleteTray(id), onSuccess: async () => { setSelected(null); await qc.invalidateQueries({ queryKey: ['trays'] }) }, onError: e => setError(describeError(e)) })
  const selectedTray = selected ? occupied.get(selected) : undefined
  return <div className="space-y-5">
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
    {place && <div className="rounded-lg border border-line bg-paper p-4 space-y-3">
      <h3 className="font-semibold">Vị trí H{place.row}-K{place.shelf}-O{place.slot}</h3>
      {selectedTray ? <><p className="text-sm">Khay {selectedTray.code} — {selectedTray.occupancy === 'RENTED' ? 'Đang thuê' : 'Sẵn sàng'}</p>
        {canEdit && <button type="button" className="rounded border border-line px-3 py-2 text-sm" disabled={selectedTray.occupancy === 'RENTED' || remove.isPending} onClick={() => { if (window.confirm(`Xóa khay ${selectedTray.code}?`)) remove.mutate(selectedTray.id) }}>Xóa khay chưa từng thuê</button>}
      </> : canEdit ? <form onSubmit={e => { e.preventDefault(); if (code.trim()) add.mutate() }} className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><label htmlFor="new-tray-code" className="block text-sm font-medium">Mã khay</label><input id="new-tray-code" className={input} maxLength={50} value={code} onChange={e => setCode(e.target.value)} placeholder="VD: A-H1-K1-O2" /></div>
        <button type="submit" className={primary} disabled={!code.trim() || add.isPending}>Thêm khay vào ô</button>
      </form> : <p className="text-sm text-mute">Ô này chưa có khay.</p>}
      {error && <Notice tone="error">{error}</Notice>}
    </div>}
    {!current && <p className="text-sm text-mute">Chọn một phòng đang hoạt động để xem sơ đồ.</p>}
  </div>
}

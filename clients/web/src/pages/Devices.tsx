import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listRooms } from '../api/core'
import { createDevice, listDevices, patchDevice, rotateKey, type Device, type DeviceType, type KeyResult } from '../api/devices'
import { describeError } from '../api/http'
import { Notice } from '../components/Notice'
import { OFFLINE_HINT, TYPE_LABEL, parseInterval } from '../lib/device'
import { timeAgo } from '../lib/format'

const input = 'mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm'
const btn = 'rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60'

type Shown = { deviceName: string; apiKey: string; how: 'tạo' | 'đổi' }

export function Devices() {
  const qc = useQueryClient()
  const devices = useQuery({ queryKey: ['devices'], queryFn: listDevices, refetchInterval: 15_000 })
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const [shown, setShown] = useState<Shown | null>(null)
  const [adding, setAdding] = useState(false)
  const roomName = (id: string) => rooms.data?.find((r) => r.id === id)?.name ?? '—'
  const refresh = () => qc.invalidateQueries({ queryKey: ['devices'] })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Thiết bị</h1>
          <p className="mt-1 text-mute">Cảm biến và camera của từng phòng. Mỗi phòng có tối đa một thiết bị đang bật cho mỗi loại.</p>
        </div>
        {!adding && <button type="button" onClick={() => setAdding(true)} className={`${btn} bg-spore text-paper hover:bg-spore-deep`}>Thêm thiết bị</button>}
      </div>

      {shown && <KeyReveal shown={shown} onDone={() => setShown(null)} />}
      {adding && (
        <AddForm
          rooms={(rooms.data ?? []).filter((r) => r.status === 'ACTIVE')}
          onCancel={() => setAdding(false)}
          onCreated={(name, k) => { setAdding(false); setShown({ deviceName: name, apiKey: k.apiKey, how: 'tạo' }); void refresh() }}
        />
      )}

      {devices.error ? (
        <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void devices.refetch()}>Thử lại</button>}>
          Không tải được danh sách thiết bị. {describeError(devices.error)}
        </Notice>
      ) : !devices.data ? (
        <p className="text-mute" role="status">Đang tải...</p>
      ) : devices.data.length === 0 ? (
        <p className="text-mute">Chưa có thiết bị nào. Bấm "Thêm thiết bị" để tạo cảm biến hoặc camera cho một phòng.</p>
      ) : (
        <ul className="space-y-3">
          {devices.data.map((d) => (
            <DeviceCard key={d.id} d={d} room={roomName(d.roomId)} onChanged={refresh} onKey={(k) => setShown({ deviceName: d.name, apiKey: k.apiKey, how: 'đổi' })} />
          ))}
        </ul>
      )}
    </div>
  )
}

function KeyReveal({ shown, onDone }: { shown: Shown; onDone: () => void }) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  async function copy() {
    try {
      await navigator.clipboard.writeText(shown.apiKey)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
  }
  return (
    <section aria-label="Khóa API" className="rounded-lg border border-amber/40 bg-amber-soft p-4">
      <h2 className="font-display text-base font-semibold text-amber">Khóa API của {shown.deviceName}</h2>
      <p className="mt-1 text-sm">Hệ thống chỉ hiện khóa này một lần. Hãy sao chép và nạp vào thiết bị ngay; mất khóa thì phải đổi khóa mới.{shown.how === 'đổi' && ' Khóa cũ đã hết hiệu lực.'}</p>
      <code data-testid="api-key" className="mt-3 block overflow-x-auto rounded-md bg-paper px-3 py-2 text-sm break-all select-all">{shown.apiKey}</code>
      <p className="mt-2 text-xs text-mute">Thiết bị gửi khóa trong header <code>X-Device-Key</code> tới <code>/iot/telemetry</code> (số đo) hoặc <code>/iot/snapshot</code> (ảnh JPEG).</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void copy()} className={`${btn} border border-line bg-paper hover:border-spore`}>Sao chép khóa</button>
        <button type="button" onClick={onDone} className={`${btn} bg-spore text-paper hover:bg-spore-deep`}>Đã lưu khóa, ẩn đi</button>
        {copied === 'ok' && <span role="status" className="text-sm text-moss">Đã sao chép.</span>}
        {copied === 'fail' && <span role="status" className="text-sm text-brick">Trình duyệt không cho sao chép tự động. Bôi đen khóa rồi nhấn Ctrl+C.</span>}
      </div>
    </section>
  )
}

function AddForm({ rooms, onCancel, onCreated }: { rooms: { id: string; name: string }[]; onCancel: () => void; onCreated: (name: string, k: KeyResult) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<DeviceType>('SENSOR_NODE')
  const [roomId, setRoomId] = useState('')
  const [interval, setInterval_] = useState('30')
  const [sim, setSim] = useState(false)
  const [shown, setShown] = useState(false)
  const iv = parseInterval(interval)
  const nameOk = name.trim().length > 0
  const create = useMutation({
    mutationFn: () => createDevice({ name: name.trim(), type, roomId, intervalSec: iv!, isSimulated: sim }),
    onSuccess: (k) => onCreated(name.trim(), k),
  })
  function submit(e: FormEvent) {
    e.preventDefault()
    setShown(true)
    if (nameOk && roomId && iv !== null) create.mutate()
  }
  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-paper p-4">
      <h2 className="font-display text-base font-semibold">Thiết bị mới</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="d-name" className="block text-sm font-medium">Tên thiết bị</label>
          <input id="d-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={input} aria-invalid={shown && !nameOk ? true : undefined} aria-describedby={shown && !nameOk ? 'd-name-err' : undefined} />
          {shown && !nameOk && <p id="d-name-err" className="mt-1 text-sm text-brick">Nhập tên để phân biệt thiết bị.</p>}
        </div>
        <div>
          <label htmlFor="d-type" className="block text-sm font-medium">Loại</label>
          <select id="d-type" value={type} onChange={(e) => setType(e.target.value as DeviceType)} className={input}>
            {(Object.keys(TYPE_LABEL) as DeviceType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="d-room" className="block text-sm font-medium">Phòng</label>
          <select id="d-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className={input} aria-invalid={shown && !roomId ? true : undefined} aria-describedby={shown && !roomId ? 'd-room-err' : undefined}>
            <option value="">Chọn phòng...</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {shown && !roomId && <p id="d-room-err" className="mt-1 text-sm text-brick">Chọn phòng đặt thiết bị.</p>}
        </div>
        <div>
          <label htmlFor="d-int" className="block text-sm font-medium">Chu kỳ gửi (giây)</label>
          <input id="d-int" inputMode="numeric" value={interval} onChange={(e) => setInterval_(e.target.value)} className={input} aria-invalid={shown && iv === null ? true : undefined} aria-describedby={shown && iv === null ? 'd-int-err' : undefined} />
          {shown && iv === null && <p id="d-int-err" className="mt-1 text-sm text-brick">Nhập số nguyên từ 5 đến 3600.</p>}
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sim} onChange={(e) => setSim(e.target.checked)} />
        Thiết bị mô phỏng (dùng để chạy thử, không phải phần cứng thật)
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={create.isPending} className={`${btn} bg-spore text-paper hover:bg-spore-deep`}>{create.isPending ? 'Đang tạo...' : 'Tạo thiết bị'}</button>
        <button type="button" onClick={onCancel} className={`${btn} border border-line`}>Hủy</button>
      </div>
      {create.isError && <div className="mt-3"><Notice tone="error">Không tạo được. {describeError(create.error)}</Notice></div>}
    </form>
  )
}

function DeviceCard({ d, room, onChanged, onKey }: { d: Device; room: string; onChanged: () => unknown; onKey: (k: KeyResult) => void }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'rotate'>('view')
  const [name, setName] = useState(d.name)
  const [interval, setInterval_] = useState(String(d.intervalSec))
  const iv = parseInterval(interval)
  const patch = useMutation({ mutationFn: (b: Parameters<typeof patchDevice>[1]) => patchDevice(d.id, b), onSuccess: () => { setMode('view'); return onChanged() } })
  const rotate = useMutation({ mutationFn: () => rotateKey(d.id), onSuccess: (k) => { setMode('view'); onKey(k); return onChanged() } })
  const active = d.status === 'ACTIVE'

  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">
            {d.name}
            {d.isSimulated && <span className="ml-2 rounded bg-spore-soft px-1.5 py-0.5 text-xs font-normal text-spore-deep">Mô phỏng</span>}
          </h2>
          <p className="mt-0.5 text-sm text-mute">
            {TYPE_LABEL[d.type]} · <Link to={`/giam-sat/${d.roomId}`} className="underline">{room}</Link> · gửi mỗi {d.intervalSec} giây
          </p>
        </div>
        <Status d={d} />
      </div>

      {mode === 'view' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('edit')} className={`${btn} border border-line hover:border-spore`}>Sửa</button>
          <button type="button" disabled={patch.isPending} onClick={() => patch.mutate({ status: active ? 'INACTIVE' : 'ACTIVE' })} className={`${btn} border border-line hover:border-spore`}>{active ? 'Tắt thiết bị' : 'Bật lại'}</button>
          <button type="button" onClick={() => setMode('rotate')} className={`${btn} border border-line hover:border-spore`}>Đổi khóa API</button>
        </div>
      )}

      {mode === 'edit' && (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (name.trim() && iv !== null) patch.mutate({ name: name.trim(), intervalSec: iv }) }} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`n-${d.id}`} className="block text-sm font-medium">Tên</label>
              <input id={`n-${d.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={input} />
            </div>
            <div>
              <label htmlFor={`i-${d.id}`} className="block text-sm font-medium">Chu kỳ gửi (giây)</label>
              <input id={`i-${d.id}`} inputMode="numeric" value={interval} onChange={(e) => setInterval_(e.target.value)} className={input} aria-invalid={iv === null ? true : undefined} aria-describedby={iv === null ? `i-${d.id}-err` : undefined} />
              {iv === null && <p id={`i-${d.id}-err`} className="mt-1 text-sm text-brick">Nhập số nguyên từ 5 đến 3600.</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={patch.isPending || !name.trim() || iv === null} className={`${btn} bg-spore text-paper hover:bg-spore-deep`}>{patch.isPending ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" onClick={() => { setMode('view'); setName(d.name); setInterval_(String(d.intervalSec)) }} className={`${btn} border border-line`}>Hủy</button>
          </div>
        </form>
      )}

      {mode === 'rotate' && (
        <div role="group" aria-label="Xác nhận đổi khóa" className="mt-3 space-y-2">
          <p className="text-sm">Khóa cũ sẽ hết hiệu lực ngay, thiết bị phải nạp khóa mới mới gửi được dữ liệu. Đổi khóa cho <strong>{d.name}</strong>?</p>
          <div className="flex gap-2">
            <button type="button" disabled={rotate.isPending} onClick={() => rotate.mutate()} className={`${btn} bg-brick text-paper`}>{rotate.isPending ? 'Đang đổi...' : 'Đổi khóa'}</button>
            <button type="button" onClick={() => setMode('view')} className={`${btn} border border-line`}>Hủy</button>
          </div>
        </div>
      )}

      {(patch.isError || rotate.isError) && <div className="mt-3"><Notice tone="error">Không thực hiện được. {describeError(patch.error ?? rotate.error)}</Notice></div>}
    </li>
  )
}

function Status({ d }: { d: Device }) {
  if (d.status === 'INACTIVE') return <span className="rounded bg-bone px-2 py-0.5 text-xs text-mute">Đã tắt</span>
  if (!d.lastSeenAt) return <span className="rounded bg-bone px-2 py-0.5 text-xs text-mute">Chưa gửi dữ liệu lần nào</span>
  return d.online ? (
    <span className="rounded bg-moss-soft px-2 py-0.5 text-xs font-medium text-moss">Trực tuyến · {timeAgo(d.lastSeenAt)}</span>
  ) : (
    <span title={OFFLINE_HINT(d.intervalSec)} className="rounded bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber">Mất kết nối · {timeAgo(d.lastSeenAt)}</span>
  )
}

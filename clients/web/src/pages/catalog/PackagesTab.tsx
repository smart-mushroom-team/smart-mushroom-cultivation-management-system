import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { describeError } from '../../api/http'
import { createPackage, listAllPackages, patchPackage, type Pack } from '../../api/packages'
import { Notice } from '../../components/Notice'
import { money, parseInt_, parsePrice } from '../../lib/catalog'
import { btn, ghost, input, primary } from './ui'

function Fields({ name, setName, days, setDays, price, setPrice, shown, id }: { name: string; setName: (v: string) => void; days: string; setDays: (v: string) => void; price: string; setPrice: (v: string) => void; shown: boolean; id: string }) {
  const dOk = parseInt_(days, 1, 3650) !== null
  const pOk = parsePrice(price) !== null
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <label htmlFor={`${id}-n`} className="block text-sm font-medium">Tên gói</label>
        <input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={input} aria-invalid={shown && !name.trim() ? true : undefined} aria-describedby={shown && !name.trim() ? `${id}-n-e` : undefined} />
        {shown && !name.trim() && <p id={`${id}-n-e`} className="mt-1 text-sm text-brick">Nhập tên gói.</p>}
      </div>
      <div>
        <label htmlFor={`${id}-d`} className="block text-sm font-medium">Thời hạn (ngày)</label>
        <input id={`${id}-d`} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={input} aria-invalid={shown && !dOk ? true : undefined} aria-describedby={shown && !dOk ? `${id}-d-e` : undefined} />
        {shown && !dOk && <p id={`${id}-d-e`} className="mt-1 text-sm text-brick">Nhập số ngày nguyên từ 1 đến 3650.</p>}
      </div>
      <div>
        <label htmlFor={`${id}-p`} className="block text-sm font-medium">Giá mỗi khay (đ)</label>
        <input id={`${id}-p`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={input} aria-invalid={shown && !pOk ? true : undefined} aria-describedby={shown && !pOk ? `${id}-p-e` : undefined} />
        {shown && !pOk && <p id={`${id}-p-e`} className="mt-1 text-sm text-brick">Nhập giá từ 0 trở lên, ví dụ 50000.</p>}
      </div>
    </div>
  )
}

export function PackagesTab() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['packages-all'], queryFn: listAllPackages })
  const refresh = () => qc.invalidateQueries({ queryKey: ['packages-all'] })
  const [name, setName] = useState('')
  const [days, setDays] = useState('30')
  const [price, setPrice] = useState('')
  const [shown, setShown] = useState(false)
  const d = parseInt_(days, 1, 3650)
  const p = parsePrice(price)
  const add = useMutation({ mutationFn: () => createPackage({ name: name.trim(), durationDays: d!, pricePerTray: p! }), onSuccess: () => { setName(''); setPrice(''); setShown(false); return refresh() } })
  function submit(e: FormEvent) {
    e.preventDefault()
    setShown(true)
    if (name.trim() && d !== null && p !== null) add.mutate()
  }
  return (
    <div className="space-y-5">
      <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Thêm gói thuê</h2>
        <div className="mt-3"><Fields id="np" name={name} setName={setName} days={days} setDays={setDays} price={price} setPrice={setPrice} shown={shown} /></div>
        <div className="mt-3"><button type="submit" disabled={add.isPending} className={primary}>{add.isPending ? 'Đang thêm...' : 'Thêm gói'}</button></div>
        {add.isError && <div className="mt-3"><Notice tone="error">Không thêm được. {describeError(add.error)}</Notice></div>}
      </form>

      {q.error ? (
        <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>Không tải được các gói. {describeError(q.error)}</Notice>
      ) : !q.data ? (
        <p className="text-mute" role="status">Đang tải...</p>
      ) : q.data.length === 0 ? (
        <p className="text-mute">Chưa có gói nào. Khách chỉ thuê được khi có ít nhất một gói đang bật.</p>
      ) : (
        <>
          <p className="text-sm text-mute">Sửa hoặc tắt gói không ảnh hưởng đơn đã thuê, vì đơn lưu sẵn tên, thời hạn và giá lúc thuê.</p>
          <ul className="space-y-3">{q.data.map((k) => <PackRow key={k.id} pack={k} onChanged={refresh} />)}</ul>
        </>
      )}
    </div>
  )
}

function PackRow({ pack, onChanged }: { pack: Pack; onChanged: () => unknown }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pack.name)
  const [days, setDays] = useState(String(pack.durationDays))
  const [price, setPrice] = useState(String(pack.pricePerTray))
  const [shown, setShown] = useState(false)
  const d = parseInt_(days, 1, 3650)
  const p = parsePrice(price)
  const patch = useMutation({ mutationFn: (b: Parameters<typeof patchPackage>[1]) => patchPackage(pack.id, b), onSuccess: () => { setEditing(false); setShown(false); return onChanged() } })
  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">{pack.name}</h3>
          <p className="mt-0.5 text-sm text-mute">{pack.durationDays} ngày · {money(pack.pricePerTray)} mỗi khay</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${pack.active ? 'bg-moss-soft text-moss' : 'bg-bone text-mute'}`}>{pack.active ? 'Đang bán' : 'Đã tắt'}</span>
      </div>
      {editing ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); setShown(true); if (name.trim() && d !== null && p !== null) patch.mutate({ name: name.trim(), durationDays: d, pricePerTray: p }) }} className="mt-3 space-y-3">
          <Fields id={`ep-${pack.id}`} name={name} setName={setName} days={days} setDays={setDays} price={price} setPrice={setPrice} shown={shown} />
          <div className="flex gap-2">
            <button type="submit" disabled={patch.isPending} className={primary}>Lưu</button>
            <button type="button" onClick={() => { setEditing(false); setShown(false) }} className={`${btn} border border-line`}>Hủy</button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className={ghost}>Sửa</button>
          <button type="button" disabled={patch.isPending} onClick={() => patch.mutate({ isActive: !pack.active })} className={ghost}>{pack.active ? 'Tắt gói' : 'Bật lại'}</button>
        </div>
      )}
      {patch.isError && <div className="mt-3"><Notice tone="error">Không thực hiện được. {describeError(patch.error)}</Notice></div>}
    </li>
  )
}

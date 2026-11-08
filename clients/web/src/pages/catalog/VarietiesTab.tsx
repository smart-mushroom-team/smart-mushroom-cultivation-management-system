import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { describeError } from '../../api/http'
import { createVariety, listAllVarieties, patchVariety, type Variety, type VarietyBody } from '../../api/varieties'
import { Notice } from '../../components/Notice'
import { parseDecimal, parseInt_ } from '../../lib/catalog'
import { btn, ghost, input, primary } from './ui'

export type Form = { name: string; description: string; days: string; tMin: string; tMax: string; hMin: string; hMax: string }
export const EMPTY_VARIETY_FORM: Form = { name: '', description: '', days: '', tMin: '', tMax: '', hMin: '', hMax: '' }
const fromVariety = (v: Variety): Form => ({ name: v.name, description: v.description, days: String(v.growthDays), tMin: String(v.tempMin), tMax: String(v.tempMax), hMin: String(v.humMin), hMax: String(v.humMax) })

/** Kiểm tra form; trả lỗi theo từng ô và, nếu hợp lệ, body gửi lên server. */
export function validate(f: Form): { errors: Partial<Record<keyof Form, string>>; body: VarietyBody | null } {
  const errors: Partial<Record<keyof Form, string>> = {}
  const days = parseInt_(f.days, 1, 1000)
  const tMin = parseDecimal(f.tMin, -40, 85)
  const tMax = parseDecimal(f.tMax, -40, 85)
  const hMin = parseDecimal(f.hMin, 0, 100)
  const hMax = parseDecimal(f.hMax, 0, 100)
  if (!f.name.trim()) errors.name = 'Nhập tên giống.'
  if (days === null) errors.days = 'Nhập số ngày nguyên từ 1 đến 1000.'
  if (tMin === null) errors.tMin = 'Nhập nhiệt độ từ -40 đến 85.'
  if (tMax === null) errors.tMax = 'Nhập nhiệt độ từ -40 đến 85.'
  else if (tMin !== null && tMin > tMax) errors.tMax = 'Nhiệt độ cao nhất phải từ nhiệt độ thấp nhất trở lên.'
  if (hMin === null) errors.hMin = 'Nhập độ ẩm từ 0 đến 100.'
  if (hMax === null) errors.hMax = 'Nhập độ ẩm từ 0 đến 100.'
  else if (hMin !== null && hMin > hMax) errors.hMax = 'Độ ẩm cao nhất phải từ độ ẩm thấp nhất trở lên.'
  if (Object.keys(errors).length > 0) return { errors, body: null }
  return { errors, body: { name: f.name.trim(), description: f.description.trim(), growthDays: days!, tempMin: tMin!, tempMax: tMax!, humMin: hMin!, humMax: hMax! } }
}

function Field({ id, label, value, onChange, error, shown, inputMode }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; shown: boolean; inputMode?: 'numeric' | 'decimal' }) {
  const bad = shown && !!error
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input id={id} value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} className={input} aria-invalid={bad ? true : undefined} aria-describedby={bad ? `${id}-e` : undefined} />
      {bad && <p id={`${id}-e`} className="mt-1 text-sm text-brick">{error}</p>}
    </div>
  )
}

export function Fields({ id, f, set, shown, hideName }: { id: string; f: Form; set: (p: Partial<Form>) => void; shown: boolean; hideName?: boolean }) {
  const { errors } = validate(f)
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {!hideName && <div>
          <label htmlFor={`${id}-n`} className="block text-sm font-medium">Tên giống</label>
          <input id={`${id}-n`} value={f.name} maxLength={100} onChange={(e) => set({ name: e.target.value })} className={input} aria-invalid={shown && errors.name ? true : undefined} aria-describedby={shown && errors.name ? `${id}-n-e` : undefined} />
          {shown && errors.name && <p id={`${id}-n-e`} className="mt-1 text-sm text-brick">{errors.name}</p>}
        </div>}
        <Field id={`${id}-d`} label="Thời gian sinh trưởng (ngày)" value={f.days} onChange={(v) => set({ days: v })} error={errors.days} shown={shown} inputMode="numeric" />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field id={`${id}-tmin`} label="Nhiệt độ thấp nhất (°C)" value={f.tMin} onChange={(v) => set({ tMin: v })} error={errors.tMin} shown={shown} inputMode="decimal" />
        <Field id={`${id}-tmax`} label="Nhiệt độ cao nhất (°C)" value={f.tMax} onChange={(v) => set({ tMax: v })} error={errors.tMax} shown={shown} inputMode="decimal" />
        <Field id={`${id}-hmin`} label="Độ ẩm thấp nhất (%)" value={f.hMin} onChange={(v) => set({ hMin: v })} error={errors.hMin} shown={shown} inputMode="decimal" />
        <Field id={`${id}-hmax`} label="Độ ẩm cao nhất (%)" value={f.hMax} onChange={(v) => set({ hMax: v })} error={errors.hMax} shown={shown} inputMode="decimal" />
      </div>
      <div>
        <label htmlFor={`${id}-desc`} className="block text-sm font-medium">Mô tả (khách đọc khi chọn giống)</label>
        <textarea id={`${id}-desc`} value={f.description} maxLength={1000} rows={2} onChange={(e) => set({ description: e.target.value })} className={input} />
      </div>
    </div>
  )
}

export function VarietiesTab() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['varieties-all'], queryFn: listAllVarieties })
  const refresh = () => qc.invalidateQueries({ queryKey: ['varieties-all'] })
  const [f, setF] = useState<Form>(EMPTY_VARIETY_FORM)
  const [shown, setShown] = useState(false)
  const add = useMutation({ mutationFn: (b: VarietyBody) => createVariety(b), onSuccess: () => { setF(EMPTY_VARIETY_FORM); setShown(false); return refresh() } })
  function submit(e: FormEvent) {
    e.preventDefault()
    setShown(true)
    const { body } = validate(f)
    if (body) add.mutate(body)
  }
  return (
    <div className="space-y-5">
      <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Thêm giống nấm</h2>
        <div className="mt-3"><Fields id="nv" f={f} set={(p) => { setF({ ...f, ...p }); add.reset() }} shown={shown} /></div>
        <div className="mt-3"><button type="submit" disabled={add.isPending} className={primary}>{add.isPending ? 'Đang thêm...' : 'Thêm giống'}</button></div>
        {add.isError && <div className="mt-3"><Notice tone="error">Không thêm được. {describeError(add.error)}</Notice></div>}
      </form>

      {q.error ? (
        <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>Không tải được danh sách giống. {describeError(q.error)}</Notice>
      ) : !q.data ? (
        <p className="text-mute" role="status">Đang tải...</p>
      ) : q.data.length === 0 ? (
        <p className="text-mute">Chưa có giống nào. Khách vẫn thuê được, nhưng phải tự nhập tên giống và chờ duyệt.</p>
      ) : (
        <>
          <p className="text-sm text-mute">Số liệu chỉ để tham khảo cho khách khi chọn giống. Tắt giống thì khách không còn thấy, các khay đã chọn giữ nguyên.</p>
          <ul className="space-y-3">{q.data.map((v) => <VarietyRow key={v.id} v={v} onChanged={refresh} />)}</ul>
        </>
      )}
    </div>
  )
}

function VarietyRow({ v, onChanged }: { v: Variety; onChanged: () => unknown }) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState<Form>(fromVariety(v))
  const [shown, setShown] = useState(false)
  const patch = useMutation({ mutationFn: (b: Parameters<typeof patchVariety>[1]) => patchVariety(v.id, b), onSuccess: () => { setEditing(false); setShown(false); return onChanged() } })
  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">{v.name}</h3>
          <p className="mt-0.5 text-sm text-mute">{v.growthDays} ngày · {v.tempMin}–{v.tempMax} °C · độ ẩm {v.humMin}–{v.humMax} %</p>
          {v.description && <p className="mt-1 text-sm">{v.description}</p>}
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${v.active ? 'bg-moss-soft text-moss' : 'bg-bone text-mute'}`}>{v.active ? 'Đang bật' : 'Đã tắt'}</span>
      </div>
      {editing ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); setShown(true); const { body } = validate(f); if (body) patch.mutate(body) }} className="mt-3 space-y-3">
          <Fields id={`ev-${v.id}`} f={f} set={(p) => setF({ ...f, ...p })} shown={shown} />
          <div className="flex gap-2">
            <button type="submit" disabled={patch.isPending} className={primary}>Lưu</button>
            <button type="button" onClick={() => { setEditing(false); setShown(false); setF(fromVariety(v)) }} className={`${btn} border border-line`}>Hủy</button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className={ghost}>Sửa</button>
          <button type="button" disabled={patch.isPending} onClick={() => patch.mutate({ isActive: !v.active })} className={ghost}>{v.active ? 'Tắt giống' : 'Bật lại'}</button>
        </div>
      )}
      {patch.isError && <div className="mt-3"><Notice tone="error">Không thực hiện được. {describeError(patch.error)}</Notice></div>}
    </li>
  )
}

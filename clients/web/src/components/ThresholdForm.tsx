import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { putThresholds, type ThresholdState, type Thresholds } from '../api/monitoring'
import { describeError } from '../api/http'
import { Notice } from './Notice'

type Draft = Record<keyof Thresholds, string>
const toDraft = (t: Thresholds): Draft => ({ tempMin: String(t.tempMin), tempMax: String(t.tempMax), humMin: String(t.humMin), humMax: String(t.humMax), consecutiveN: String(t.consecutiveN) })

/** Kiểm tra giống backend để báo lỗi ngay tại form. */
export function validate(d: Draft): { values: Thresholds | null; errors: Partial<Record<keyof Thresholds, string>> } {
  const n = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')))
  const v = { tempMin: n(d.tempMin), tempMax: n(d.tempMax), humMin: n(d.humMin), humMax: n(d.humMax), consecutiveN: n(d.consecutiveN) }
  const e: Partial<Record<keyof Thresholds, string>> = {}
  for (const k of Object.keys(v) as (keyof Thresholds)[]) if (Number.isNaN(v[k])) e[k] = 'Nhập một số.'
  const range = (lo: keyof Thresholds, hi: keyof Thresholds, a: number, b: number, what: string) => {
    if (!e[lo] && (v[lo] < a || v[lo] > b)) e[lo] = `${what} phải nằm trong khoảng ${a} đến ${b}.`
    if (!e[hi] && (v[hi] < a || v[hi] > b)) e[hi] = `${what} phải nằm trong khoảng ${a} đến ${b}.`
    if (!e[lo] && !e[hi] && v[lo] >= v[hi]) e[hi] = 'Ngưỡng trên phải lớn hơn ngưỡng dưới.'
  }
  range('tempMin', 'tempMax', -40, 85, 'Nhiệt độ')
  range('humMin', 'humMax', 0, 100, 'Độ ẩm')
  if (!e.consecutiveN && (!Number.isInteger(v.consecutiveN) || v.consecutiveN < 1 || v.consecutiveN > 100)) e.consecutiveN = 'Nhập số nguyên từ 1 đến 100.'
  return { values: Object.keys(e).length ? null : v, errors: e }
}

const FIELDS: { key: keyof Thresholds; label: string; unit: string }[] = [
  { key: 'tempMin', label: 'Nhiệt độ thấp nhất', unit: '°C' },
  { key: 'tempMax', label: 'Nhiệt độ cao nhất', unit: '°C' },
  { key: 'humMin', label: 'Độ ẩm thấp nhất', unit: '%' },
  { key: 'humMax', label: 'Độ ẩm cao nhất', unit: '%' },
  { key: 'consecutiveN', label: 'Số lần đo liên tiếp để báo', unit: 'lần' },
]

export function ThresholdForm({ roomId, current }: { roomId: string; current: ThresholdState }) {
  const qc = useQueryClient(); const [draft, setDraft] = useState<Draft>(() => toDraft(current)); const [shown, setShown] = useState(false); const { values, errors } = validate(draft)
  const save = useMutation({ mutationFn: (v: Thresholds) => putThresholds(roomId, v), onSuccess: () => qc.invalidateQueries({ queryKey: ['thresholds', roomId] }) })
  function submit(ev: FormEvent) { ev.preventDefault(); setShown(true); if (values) save.mutate(values) }
  return <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-paper p-4"><h2 className="font-display text-base font-semibold">Ngưỡng cảnh báo</h2><p className="mt-1 text-sm text-mute">{current.configured ? 'Hệ thống báo khi số đo vượt ngưỡng đủ số lần liên tiếp.' : 'Phòng chưa đặt ngưỡng riêng, đang hiện giá trị gợi ý. Lưu lại để bắt đầu cảnh báo.'}</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{FIELDS.map((f) => <div key={f.key}><label htmlFor={`th-${f.key}`} className="block text-sm font-medium">{f.label} <span className="font-normal text-mute">({f.unit})</span></label><input id={`th-${f.key}`} inputMode="decimal" value={draft[f.key]} onChange={(e) => { setDraft({ ...draft, [f.key]: e.target.value }); save.reset() }} aria-invalid={shown && errors[f.key] ? true : undefined} aria-describedby={shown && errors[f.key] ? `th-${f.key}-err` : undefined} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" />{shown && errors[f.key] && <p id={`th-${f.key}-err`} className="mt-1 text-sm text-brick">{errors[f.key]}</p>}</div>)}</div><div className="mt-4 flex items-center gap-4"><button type="submit" disabled={save.isPending} className="rounded-md bg-spore px-4 py-2 text-sm font-medium text-paper hover:bg-spore-deep disabled:opacity-60">{save.isPending ? 'Đang lưu...' : 'Lưu ngưỡng'}</button>{save.isSuccess && <Notice tone="ok">Đã lưu ngưỡng mới.</Notice>}</div>{save.isError && <div className="mt-3"><Notice tone="error">Không lưu được. {describeError(save.error)}</Notice></div>}</form>
}

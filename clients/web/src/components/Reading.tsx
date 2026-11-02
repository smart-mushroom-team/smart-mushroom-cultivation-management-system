import { LEVEL_TEXT, level, num } from '../lib/format'

const TONE = { ok: 'text-ink', low: 'text-water', high: 'text-brick', unknown: 'text-mute' } as const

/** Một số đo kèm chữ giải thích mức (không chỉ dựa vào màu) so với ngưỡng. */
export function Reading({ label, value, unit, min, max, big }: { label: string; value: number | null | undefined; unit: string; min: number; max: number; big?: boolean }) {
  const lv = level(value, min, max)
  return (
    <div>
      <div className="text-sm text-mute">{label}</div>
      <div className={`font-display font-semibold ${big ? 'text-4xl' : 'text-xl'} ${TONE[lv]}`}>{num(value, unit)}</div>
      {lv !== 'unknown' && lv !== 'ok' ? <div className={`text-xs font-medium ${TONE[lv]}`}>{LEVEL_TEXT[lv]}</div> : lv === 'ok' ? <div className="text-xs text-moss">{LEVEL_TEXT.ok}</div> : null}
    </div>
  )
}

export function OnlineBadge({ online, hasData }: { online: boolean; hasData: boolean }) {
  if (!hasData) return <span className="rounded bg-bone px-2 py-0.5 text-xs text-mute">Chưa có dữ liệu</span>
  return online ? (
    <span className="rounded bg-moss-soft px-2 py-0.5 text-xs font-medium text-moss">Thiết bị trực tuyến</span>
  ) : (
    <span className="rounded bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber">Thiết bị mất kết nối</span>
  )
}

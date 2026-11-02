/** Hàm thuần dùng chung cho giao diện giám sát (có test riêng). */

export const MIN = 60_000
export const WINDOW_MS = 5 * MIN
const fmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
export const num = (v: number | null | undefined, unit = '') => (v === null || v === undefined ? '—' : `${fmt.format(v)}${unit}`)
const pad = (n: number) => String(n).padStart(2, '0')
export function clock(iso: string, now = new Date()): string { const d = new Date(iso); const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`; return d.toDateString() === now.toDateString() ? time : `${time} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}` }
export function timeAgo(iso: string, now = Date.now()): string { const s = Math.round((now - new Date(iso).getTime()) / 1000); if (s < 10) return 'vừa xong'; if (s < 60) return `${s} giây trước`; if (s < 3600) return `${Math.floor(s / 60)} phút trước`; if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`; return clock(iso, new Date(now)) }
export type Level = 'low' | 'ok' | 'high' | 'unknown'
export function level(value: number | null | undefined, min: number, max: number): Level { if (value === null || value === undefined) return 'unknown'; return value < min ? 'low' : value > max ? 'high' : 'ok' }
export const LEVEL_TEXT: Record<Level, string> = { low: 'Thấp hơn ngưỡng', ok: 'Trong ngưỡng', high: 'Cao hơn ngưỡng', unknown: '' }
export type Plot = { x: number; temp: number | null; hum: number | null; tempMin: number | null; tempMax: number | null; humMin: number | null; humMax: number | null; n: number }
export function plotPoints(points: { t: string; temp: number | null; hum: number | null; tempMin: number | null; tempMax: number | null; humMin: number | null; humMax: number | null; n: number }[]): Plot[] { const out: Plot[] = []; const sorted = [...points].sort((a, b) => +new Date(a.t) - +new Date(b.t)); for (const p of sorted) { const x = new Date(p.t).getTime(); const prev = out[out.length - 1]; if (prev && prev.n > 0 && x - prev.x > 2 * WINDOW_MS) out.push({ x: prev.x + WINDOW_MS, temp: null, hum: null, tempMin: null, tempMax: null, humMin: null, humMax: null, n: 0 }); out.push({ x, temp: p.temp, hum: p.hum, tempMin: p.tempMin, tempMax: p.tempMax, humMin: p.humMin, humMax: p.humMax, n: p.n }) } return out }
export function yDomain(values: (number | null)[], min: number, max: number): [number, number] { const v = values.filter((x): x is number => x !== null); const lo = Math.min(min, ...(v.length ? v : [min])); const hi = Math.max(max, ...(v.length ? v : [max])); const pad = Math.max((hi - lo) * 0.1, 1); return [Math.floor(lo - pad), Math.ceil(hi + pad)] }
export const HOUR_CHOICES = [{ hours: 6, label: '6 giờ' }, { hours: 24, label: '24 giờ' }, { hours: 72, label: '3 ngày' }, { hours: 168, label: '7 ngày' }] as const

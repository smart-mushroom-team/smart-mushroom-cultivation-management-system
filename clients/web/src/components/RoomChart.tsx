import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../api/monitoring'
import { clock, num, plotPoints, yDomain, type Plot } from '../lib/format'

type Props = { title: string; unit: string; field: 'temp' | 'hum'; points: ChartPoint[]; min: number; max: number; color: string }

function Tip({ active, payload, unit, field }: { active?: boolean; payload?: { payload: Plot }[]; unit: string; field: 'temp' | 'hum' }) {
  const p = payload?.[0]?.payload
  if (!active || !p || p.n === 0) return null
  const lo = field === 'temp' ? p.tempMin : p.humMin
  const hi = field === 'temp' ? p.tempMax : p.humMax
  return <div className="rounded-md border border-line bg-paper px-3 py-2 text-sm shadow-sm"><div className="font-medium">{clock(new Date(p.x).toISOString())}</div><div>Trung bình {num(field === 'temp' ? p.temp : p.hum, unit)}</div><div className="text-mute">Thấp nhất {num(lo, unit)} · cao nhất {num(hi, unit)}</div><div className="text-mute">{p.n} lần đo trong 5 phút</div></div>
}

/** Biểu đồ trung bình 5 phút; vùng nền xanh nhạt là khoảng ngưỡng cho phép. */
export function RoomChart({ title, unit, field, points, min, max, color }: Props) {
  const data = plotPoints(points)
  const [lo, hi] = yDomain(data.map((d) => d[field]), min, max)
  const hasData = data.some((d) => d.n > 0)
  return <figure className="rounded-lg border border-line bg-paper p-4"><figcaption className="mb-2 flex items-baseline justify-between gap-3"><span className="font-display text-base font-semibold">{title}</span><span className="text-xs text-mute">Ngưỡng {num(min)}–{num(max, unit)}</span></figcaption>{!hasData ? <p className="flex h-56 items-center justify-center text-sm text-mute">Chưa có số đo trong khoảng thời gian này.</p> : <div className="h-56" role="img" aria-label={`${title}, ${data.filter((d) => d.n > 0).length} điểm`}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}><ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid stroke="var(--color-line)" vertical={false} /><ReferenceArea y1={min} y2={max} fill="var(--color-moss-soft)" fillOpacity={0.7} ifOverflow="extendDomain" /><ReferenceLine y={min} stroke="var(--color-moss)" strokeDasharray="4 3" /><ReferenceLine y={max} stroke="var(--color-moss)" strokeDasharray="4 3" /><XAxis dataKey="x" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(v: number) => clock(new Date(v).toISOString())} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} stroke="var(--color-line)" minTickGap={48} /><YAxis domain={[lo, hi]} width={44} tickFormatter={(v: number) => `${v}`} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} stroke="var(--color-line)" allowDecimals={false} /><Tooltip content={<Tip unit={unit} field={field} />} /><Line type="monotone" dataKey={field} stroke={color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} activeDot={{ r: 4 }} /></ComposedChart></ResponsiveContainer></div>}</figure>
}

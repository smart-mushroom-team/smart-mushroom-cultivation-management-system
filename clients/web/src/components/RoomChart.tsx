import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../api/monitoring'
import { clock, num, plotPoints, WINDOW_MS, yDomain, type Plot } from '../lib/format'

type Field = 'temp' | 'hum' | 'soil'
type Props = { title: string; unit: string; points: ChartPoint[]; color: string } & (
  { field: 'temp' | 'hum'; min: number; max: number } | { field: 'soil' }
)

function Tip({ active, payload, unit, field }: { active?: boolean; payload?: { payload: Plot }[]; unit: string; field: Field }) {
  const point = payload?.[0]?.payload
  if (!active || !point || point[field] === null) return null
  return <div className="rounded-md border border-line bg-paper px-3 py-2 text-sm shadow-sm">
    <div className="font-medium">{clock(new Date(point.x).toISOString())}</div>
    <div>Trung bình {num(point[field], unit)}</div>
    <div className="text-mute">Thấp nhất {num(point[`${field}Min`], unit)} · cao nhất {num(point[`${field}Max`], unit)}</div>
    <div className="text-mute">{field === 'soil' ? point.soilN : point.n} lần đo trong 5 phút</div>
  </div>
}

export function RoomChart(props: Props) {
  const { title, unit, field, points, color } = props
  const threshold = props.field === 'soil' ? null : { min: props.min, max: props.max }
  const data = threshold ? plotPoints(points.filter(p => p.n > 0)) : plotPoints(points, WINDOW_MS)
  const values = data.map(point => point[field])
  const domain = threshold ? yDomain(values, threshold.min, threshold.max) : [0, 100]
  const count = values.filter(value => value !== null).length

  return <figure className="rounded-lg border border-line bg-paper p-4">
    <figcaption className="mb-2 flex items-baseline justify-between gap-3">
      <span className="font-display text-base font-semibold">{title}</span>
      {threshold && <span className="text-xs text-mute">Ngưỡng {num(threshold.min)}–{num(threshold.max, unit)}</span>}
    </figcaption>
    {count === 0 ? <p className="flex h-56 items-center justify-center text-sm text-mute">Chưa có số đo trong khoảng thời gian này.</p> :
      <div className="h-56" role="img" aria-label={`${title}, ${count} điểm`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            {threshold && <ReferenceArea y1={threshold.min} y2={threshold.max} fill="var(--color-moss-soft)" fillOpacity={0.7} ifOverflow="extendDomain" />}
            {threshold && <ReferenceLine y={threshold.min} stroke="var(--color-moss)" strokeDasharray="4 3" />}
            {threshold && <ReferenceLine y={threshold.max} stroke="var(--color-moss)" strokeDasharray="4 3" />}
            <XAxis dataKey="x" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(v: number) => clock(new Date(v).toISOString())} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} stroke="var(--color-line)" minTickGap={48} />
            <YAxis domain={domain} width={44} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} stroke="var(--color-line)" allowDecimals={false} />
            <Tooltip content={<Tip unit={unit} field={field} />} />
            <Line type="monotone" dataKey={field} stroke={color} strokeWidth={2} dot={field === 'soil' ? { r: 2 } : false} connectNulls={false} isAnimationActive={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>}
  </figure>
}

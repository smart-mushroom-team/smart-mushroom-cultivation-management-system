import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayRevenue } from '../api/dashboard'
import { money } from '../lib/dashboard'

const label = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function Tip({ active, payload }: { active?: boolean; payload?: { payload: DayRevenue }[] }) {
  const d = payload?.[0]?.payload
  if (!active || !d) return null
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-2 text-sm shadow-sm">
      <div className="font-medium">{label(d.date)}</div>
      <div>Doanh thu {money(d.gross)}</div>
      <div className="text-brick">Hoàn tiền {money(d.refunds)}</div>
      <div className="font-medium">Thực thu {money(d.gross - d.refunds)}</div>
    </div>
  )
}

/** Doanh thu và hoàn tiền theo ngày (30 ngày gần nhất). */
export function RevenueChart({ days }: { days: DayRevenue[] }) {
  const any = days.some((d) => d.gross > 0 || d.refunds > 0)
  if (!any) return <p className="flex h-48 items-center justify-center text-sm text-mute">Chưa có đơn thuê nào trong 30 ngày qua.</p>
  const total = days.reduce((s, d) => s + d.gross - d.refunds, 0)
  return (
    <div className="h-56" role="img" aria-label={`Doanh thu 30 ngày gần nhất, thực thu ${money(total)}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
        <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={label} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} stroke="var(--color-line)" minTickGap={24} />
          <YAxis width={64} tickFormatter={(v: number) => (v >= 1_000_000 ? `${v / 1_000_000}tr` : v >= 1000 ? `${v / 1000}k` : `${v}`)} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} stroke="var(--color-line)" />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--color-bone)' }} />
          <Bar dataKey="gross" name="Doanh thu" fill="var(--color-moss)" isAnimationActive={false} />
          <Bar dataKey="refunds" name="Hoàn tiền" fill="var(--color-brick)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

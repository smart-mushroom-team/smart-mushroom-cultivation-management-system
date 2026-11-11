import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listRooms, listTrays } from '../api/core'
import { getDashboard } from '../api/dashboard'
import { listDevices } from '../api/devices'
import { describeError } from '../api/http'
import { getLatest, getThresholds } from '../api/monitoring'
import { listUsers } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import { Notice } from '../components/Notice'
import { OnlineBadge, Reading } from '../components/Reading'
import { RevenueChart } from '../components/RevenueChart'
import { buildTodo, daysLeftText, money, occupancyRate, sensorSummary, offlineDevices, roomHealth, type Health } from '../lib/dashboard'
import { dateVi } from '../lib/cycle'
import { timeAgo } from '../lib/format'

const retry = (refetch: () => unknown) => (
  <button className="shrink-0 font-medium underline" onClick={() => void refetch()}>
    Thử lại
  </button>
)

function Figure({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="sm:px-6 sm:first:pl-0">
      <div className="font-display text-3xl font-semibold">{value}</div>
      <div className="text-sm text-mute">{label}</div>
    </div>
  )
}

function Kpi({ label, value, hint, to }: { label: string; value: number | string; hint?: string; to?: string }) {
  const content = (
    <>
      <div className="text-xs text-mute">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold" aria-label={`${label}: ${value}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </>
  )
  const cls = 'block rounded-xl border border-line bg-paper p-4 transition-colors hover:border-spore'
  return to ? <Link to={to} className={cls}>{content}</Link> : <div className={cls}>{content}</div>
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-mute">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

const HEALTH: Record<Health, { text: string; cls: string }> = {
  loading: { text: 'Đang tải...', cls: 'bg-bone text-mute' },
  inactive: { text: 'Đã ngừng', cls: 'bg-amber-soft text-amber' },
  alert: { text: 'Cảnh báo', cls: 'bg-brick-soft text-brick' },
  offline: { text: 'Mất kết nối', cls: 'bg-amber-soft text-amber' },
  nodata: { text: 'Chưa có dữ liệu', cls: 'bg-bone text-mute' },
  ok: { text: 'Bình thường', cls: 'bg-moss-soft text-moss' },
}

export function Home() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard, refetchInterval: 60_000 })
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const trays = useQuery({ queryKey: ['trays'], queryFn: listTrays })
  const devices = useQuery({ queryKey: ['devices'], queryFn: listDevices, refetchInterval: 30_000 })
  const users = useQuery({ queryKey: ['users'], queryFn: listUsers, enabled: isAdmin })
  const list = rooms.data ?? []
  // Cùng queryKey với trang Giám sát nên hai trang dùng chung dữ liệu đã tải.
  const latest = useQueries({ queries: list.map((r) => ({ queryKey: ['latest', r.id], queryFn: () => getLatest(r.id), refetchInterval: 15_000 })) })
  const th = useQueries({ queries: list.map((r) => ({ queryKey: ['thresholds', r.id], queryFn: () => getThresholds(r.id), refetchInterval: 30_000 })) })
  const roomRows = list.map((room, i) => ({ room, latest: latest[i]?.data, th: th[i]?.data, failed: !!latest[i]?.error, status: roomHealth(room, latest[i]?.data, th[i]?.data) }))
  const offline = offlineDevices(devices.data ?? [])
  const todo = buildTodo({ dash: dash.data, rooms: roomRows, offline: offline.length })
  const rented = (trays.data ?? []).filter((t) => t.occupancy === 'RENTED').length
  const d = dash.data
  const sensors = sensorSummary(devices.data ?? [])
  const activeRooms = list.filter((r) => r.status === 'ACTIVE').length
  const alertRooms = roomRows.filter((r) => r.status.health === 'alert').length
  const occupiedPct = trays.data ? occupancyRate(rented, trays.data.length) : null
  const activeUsers = users.data?.filter((u) => u.status === 'ACTIVE').length

  return (
    <div>
      <h1 className="text-3xl font-semibold">Tổng quan</h1>
      <p className="mt-1 text-mute">Xin chào, {session?.name}.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={isAdmin ? 'Chỉ số quản trị' : 'Chỉ số vận hành'}>
        {isAdmin ? (
          <>
            <Kpi label="Người dùng hoạt động" value={activeUsers ?? '—'} hint="Tất cả vai trò" to="/nguoi-dung" />
            <Kpi label="Đơn thuê ACTIVE" value={d?.activeRentals ?? '—'} to="/don-thue" />
            <Kpi label="Doanh thu thuần tháng này" value={d?.revenue ? money(d.revenue.thisMonth.net) : '—'} hint="Trừ khoản hoàn đã duyệt" />
            <Kpi label="Tỷ lệ lấp đầy" value={occupiedPct === null ? '—' : `${occupiedPct}%`} hint={trays.data ? `${rented}/${trays.data.length} khay` : 'Đang tải khay'} />
          </>
        ) : (
          <>
            <Kpi label="Phòng hoạt động" value={rooms.data ? `${activeRooms}/${list.length}` : '—'} to="/giam-sat" />
            <Kpi label="Cảm biến online" value={devices.data ? `${sensors.online}/${sensors.total}` : '—'} hint="SENSOR_NODE đang bật" to="/thiet-bi" />
            <Kpi label="Phòng cảnh báo ngưỡng" value={rooms.data ? alertRooms : '—'} to="/giam-sat" />
            <Kpi label="Khay đang trồng/thuê" value={trays.data ? rented : '—'} hint="Đang được thuê" />
          </>
        )}
      </div>

      <Section title="Cần xử lý" hint="Nhấn vào một mục để mở trang quản lý tương ứng.">
        {dash.error ? (
          <Notice tone="error" action={retry(dash.refetch)}>
            Không tải được việc cần xử lý. {describeError(dash.error)}
          </Notice>
        ) : !d ? (
          <p className="text-mute" role="status">
            Đang tải...
          </p>
        ) : todo.length === 0 ? (
          <p className="rounded-lg border border-line bg-paper px-4 py-3 text-moss">Không có việc tồn đọng. Mọi thứ đang bình thường.</p>
        ) : (
          <ul className="space-y-2">
            {todo.map((t) => (
              <li key={t.key}>
                <Link to={t.to} className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 hover:border-spore ${t.tone === 'error' ? 'border-brick/40 bg-brick-soft text-brick' : 'border-amber/40 bg-amber-soft text-amber'}`}>
                  <span className="font-medium">{t.label}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:flex sm:gap-0 sm:divide-x sm:divide-line">
        <Figure value={list.filter((r) => r.status === 'ACTIVE').length} label="phòng đang hoạt động" />
        <Figure value={trays.data ? rented : '—'} label="khay đang cho thuê" />
        <Figure value={trays.data ? trays.data.length - rented : '—'} label="khay còn trống" />
        <Figure value={d ? d.activeRentals : '—'} label="đơn đang chạy" />
      </div>

      {isAdmin && d?.revenue && (
        <Section title="Doanh thu" hint="Tính theo ngày tạo đơn (thanh toán mô phỏng). Phần hoàn tiền được trừ vào ngày Admin duyệt yêu cầu kết thúc sớm.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-paper p-4">
              <div className="text-sm text-mute">Tháng này</div>
              <div className="font-display text-2xl font-semibold" data-testid="revenue-net">{money(d.revenue.thisMonth.net)}</div>
              <div className="text-xs text-mute">
                {money(d.revenue.thisMonth.gross)} − hoàn {money(d.revenue.thisMonth.refunds)}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-paper p-4">
              <div className="text-sm text-mute">Tháng trước</div>
              <div className="font-display text-2xl font-semibold">{money(d.revenue.lastMonth.net)}</div>
              <div className="text-xs text-mute">
                {money(d.revenue.lastMonth.gross)} − hoàn {money(d.revenue.lastMonth.refunds)}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-paper p-4">
              <div className="text-sm text-mute">Đơn thuê tháng này</div>
              <div className="font-display text-2xl font-semibold">{d.revenue.thisMonth.orders}</div>
              <div className="text-xs text-mute">tháng trước {d.revenue.lastMonth.orders}</div>
            </div>
          </div>
          <figure className="mt-4 rounded-lg border border-line bg-paper p-4">
            <figcaption className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-display text-base font-semibold">30 ngày gần nhất</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-moss" />Doanh thu</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-brick" />Hoàn tiền</span>
            </figcaption>
            <RevenueChart days={d.revenue.daily} />
          </figure>
        </Section>
      )}

      {d && d.expiring.items.length > 0 && (
        <Section title="Đơn sắp hết hạn" hint={`Hết hạn trong ${d.expiring.days} ngày tới${d.expiring.total > d.expiring.items.length ? ` (hiện ${d.expiring.items.length}/${d.expiring.total} đơn)` : ''}.`}>
          <div className="overflow-x-auto rounded-lg border border-line bg-paper">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Đơn thuê sắp hết hạn</caption>
              <thead className="border-b border-line text-mute">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Khách</th>
                  <th scope="col" className="px-4 py-3 font-medium">Gói</th>
                  <th scope="col" className="px-4 py-3 font-medium">Khay</th>
                  <th scope="col" className="px-4 py-3 font-medium">Hết hạn</th>
                </tr>
              </thead>
              <tbody>
                {d.expiring.items.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-3 font-medium">{e.customerName}</th>
                    <td className="px-4 py-3">{e.packageName}</td>
                    <td className="px-4 py-3">{e.trayCount}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dateVi(e.endDate)} <span className={e.daysLeft <= 1 ? 'font-medium text-brick' : 'text-mute'}>· {daysLeftText(e.daysLeft)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Tình trạng phòng" hint="Cảnh báo dựa trên ngưỡng cấu hình cho phòng; không thay thế đánh giá theo giống nấm ở từng khay.">
        {rooms.error ? (
          <Notice tone="error" action={retry(rooms.refetch)}>
            Không tải được danh sách phòng. {describeError(rooms.error)}
          </Notice>
        ) : !rooms.data ? (
          <p className="text-mute" role="status">
            Đang tải...
          </p>
        ) : list.length === 0 ? (
          <p className="text-mute">{isAdmin ? 'Chưa có phòng nào. Thêm phòng và khay ở mục Phòng, khay, gói để khách có thể thuê.' : 'Chưa có phòng nào. Nhờ Admin thêm phòng và khay để bắt đầu.'}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-paper">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Tình trạng và số đo mới nhất của từng phòng</caption>
              <thead className="border-b border-line text-mute">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Phòng</th>
                  <th scope="col" className="px-4 py-3 font-medium">Tình trạng</th>
                  <th scope="col" className="px-4 py-3 font-medium">Nhiệt độ</th>
                  <th scope="col" className="px-4 py-3 font-medium">Độ ẩm</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium whitespace-nowrap">Đã thuê</th>
                </tr>
              </thead>
              <tbody>
                {roomRows.map(({ room, latest: l, th: t, failed, status }) => {
                  const mine = (trays.data ?? []).filter((x) => x.roomId === room.id)
                  const n = mine.filter((x) => x.occupancy === 'RENTED').length
                  const snap = l?.snapshot
                  const h = HEALTH[status.health]
                  return (
                    <tr key={room.id} className="border-b border-line align-top last:border-0">
                      <th scope="row" className="px-4 py-3 font-medium">
                        <Link to={`/giam-sat/${room.id}`} className="underline decoration-line underline-offset-2 hover:text-spore-deep">{room.name}</Link>
                      </th>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${h.cls}`}>{h.text}</span>
                        {status.reasons.length > 0 && <div className="mt-1 text-xs text-brick">Vượt ngưỡng phòng: {status.reasons.join(', ')}</div>}
                        {status.health === 'ok' || status.health === 'offline' ? <div className="mt-1 text-xs text-mute">Đo {snap ? timeAgo(snap.recordedAt) : ''}</div> : null}
                        {failed && <div className="mt-1 text-xs text-brick">Không tải được số đo</div>}
                        {l && status.health === 'alert' && <div className="mt-1"><OnlineBadge online={l.deviceOnline} hasData={!!snap} /></div>}
                      </td>
                      <td className="px-4 py-3">{room.status === 'ACTIVE' ? <Reading label="" value={snap?.temperature} unit="°C" min={t?.tempMin ?? -Infinity} max={t?.tempMax ?? Infinity} /> : <span className="text-mute">—</span>}</td>
                      <td className="px-4 py-3">{room.status === 'ACTIVE' ? <Reading label="" value={snap?.humidity} unit="%" min={t?.humMin ?? -Infinity} max={t?.humMax ?? Infinity} /> : <span className="text-mute">—</span>}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{trays.data ? `${n}/${mine.length}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {isAdmin && (
        <Section title="Người dùng">
          {users.error ? (
            <Notice tone="error" action={retry(users.refetch)}>
              Không tải được người dùng. {describeError(users.error)}
            </Notice>
          ) : !users.data ? (
            <p className="text-mute" role="status">
              Đang tải...
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-0 sm:divide-x sm:divide-line">
              <Figure value={users.data.filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE').length} label="Admin" />
              <Figure value={users.data.filter((u) => u.role === 'OPERATOR' && u.status === 'ACTIVE').length} label="Operator" />
              <Figure value={users.data.filter((u) => u.role === 'CUSTOMER' && u.status === 'ACTIVE').length} label="khách hàng" />
            </div>
          )}
          <p className="mt-2 text-sm text-mute">Chỉ tính tài khoản đang hoạt động.</p>
        </Section>
      )}
    </div>
  )
}

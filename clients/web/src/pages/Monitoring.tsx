import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listRooms } from '../api/core'
import { describeError } from '../api/http'
import { getLatest, getThresholds } from '../api/monitoring'
import { Notice } from '../components/Notice'
import { OnlineBadge, Reading } from '../components/Reading'
import { timeAgo } from '../lib/format'

export function Monitoring() {
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const list = rooms.data ?? []
  const latest = useQueries({ queries: list.map((r) => ({ queryKey: ['latest', r.id], queryFn: () => getLatest(r.id), refetchInterval: 15_000 })) })
  const th = useQueries({ queries: list.map((r) => ({ queryKey: ['thresholds', r.id], queryFn: () => getThresholds(r.id) })) })
  return <div><h1 className="text-3xl font-semibold">Giám sát phòng</h1><p className="mt-1 text-mute">Số đo mới nhất của từng phòng, tự làm mới mỗi 15 giây.</p><div className="mt-8">{rooms.error ? <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void rooms.refetch()}>Thử lại</button>}>Không tải được danh sách phòng. {describeError(rooms.error)}</Notice> : !rooms.data ? <p className="text-mute" role="status">Đang tải...</p> : list.length === 0 ? <p className="text-mute">Chưa có phòng nào. Nhờ Admin thêm phòng ở mục Phòng, khay, gói.</p> : <ul className="grid gap-4 sm:grid-cols-2">{list.map((r, i) => { const l = latest[i]?.data; const t = th[i]?.data; const snap = l?.snapshot; return <li key={r.id}><Link to={`/giam-sat/${r.id}`} className="block rounded-lg border border-line bg-paper p-4 hover:border-spore"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-lg font-semibold">{r.name}</h2>{r.status === 'INACTIVE' ? <span className="rounded bg-amber-soft px-2 py-0.5 text-xs text-amber">Đã ngừng</span> : l ? <OnlineBadge online={l.deviceOnline} hasData={!!snap} /> : null}</div>{latest[i]?.error ? <p className="mt-3 text-sm text-brick">Không tải được số đo.</p> : <div className="mt-3 flex gap-8"><Reading label="Nhiệt độ" value={snap?.temperature} unit="°C" min={t?.tempMin ?? -Infinity} max={t?.tempMax ?? Infinity} /><Reading label="Độ ẩm" value={snap?.humidity} unit="%" min={t?.humMin ?? -Infinity} max={t?.humMax ?? Infinity} /></div>}{snap && <p className="mt-3 text-xs text-mute">Đo {timeAgo(snap.recordedAt)}</p>}</Link></li> })}</ul>}</div></div>
}

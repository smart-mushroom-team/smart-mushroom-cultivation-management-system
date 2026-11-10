import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { listRooms } from '../api/core'
import { describeError } from '../api/http'
import { listNotifications, listNotificationPage, markRead, type AppNotification, type NotificationFilter } from '../api/notifications'
import { Notice } from '../components/Notice'
import { clock, timeAgo } from '../lib/format'

const LABEL: Record<string, { text: string; tone: string }> = {
  TEMP_OUT_OF_RANGE: { text: 'Nhiệt độ', tone: 'bg-brick-soft text-brick' },
  HUMIDITY_OUT_OF_RANGE: { text: 'Độ ẩm', tone: 'bg-brick-soft text-brick' },
  DEVICE_OFFLINE: { text: 'Mất kết nối', tone: 'bg-amber-soft text-amber' },
  DEVICE_ONLINE: { text: 'Kết nối lại', tone: 'bg-moss-soft text-moss' },
  NEW_RENTAL: { text: 'Thuê mới', tone: 'bg-spore-soft text-spore-deep' },
  VARIETY_PENDING: { text: 'Giống chờ duyệt', tone: 'bg-amber-soft text-amber' },
}
const fallback = { text: 'Thông báo', tone: 'bg-bone text-mute' }

export const unreadKey = ['notifications']

export function useNotifications(poll = false) {
  return useQuery({ queryKey: unreadKey, queryFn: listNotifications, refetchInterval: poll ? 20_000 : false })
}

export function Notifications() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>('')
  const [page, setPage] = useState(1)
  const q = useQuery({ queryKey: ['notifications', 'page', page, filter], queryFn: () => listNotificationPage(page, filter) })
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const read = useMutation({ mutationFn: markRead, onSuccess: () => qc.invalidateQueries({ queryKey: unreadKey }) })
  const all = useMutation({
    mutationFn: async (ids: string[]) => { await Promise.all(ids.map(markRead)) },
    onSettled: () => qc.invalidateQueries({ queryKey: unreadKey }),
  })
  const items = q.data?.items ?? []
  const pageCount = Math.max(1, Math.ceil((q.data?.total ?? 0) / 10))
  const unread = items.filter((n) => !n.read)
  const roomName = (n: AppNotification) => rooms.data?.find((r) => r.id === n.data?.roomId)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Thông báo</h1>
          <p className="mt-1 text-mute">{unread.length ? `${unread.length} chưa đọc trên trang này` : 'Không có thông báo chưa đọc trên trang này'}</p>
        </div>
        {unread.length > 0 && (
          <button type="button" disabled={all.isPending} onClick={() => all.mutate(unread.map((n) => n.id))} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-spore">
            Đánh dấu trang này đã đọc
          </button>
        )}
      </div>
      <div className="mt-5">
        <label className="flex items-center gap-2 text-sm">Loại thông báo
          <select value={filter} onChange={(e) => { setFilter(e.target.value as NotificationFilter); setPage(1) }} className="rounded-md border border-line bg-paper px-2 py-1.5">
            <option value="">Tất cả</option><option value="NEW_RENTAL">Thuê mới</option><option value="DEVICE_OFFLINE">Mất kết nối</option><option value="VARIETY_PENDING">Giống chờ duyệt</option><option value="DEVICE_ONLINE">Kết nối lại</option>
          </select>
        </label>
      </div>
      <div className="mt-6">
        {q.error ? (
          <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>
            Không tải được thông báo. {describeError(q.error)}
          </Notice>
        ) : !q.data ? (
          <p className="text-mute" role="status">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-mute">Chưa có thông báo nào. Cảnh báo ngưỡng, thiết bị mất kết nối và thuê mới sẽ hiện ở đây.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper">
            {items.map((n) => {
              const l = LABEL[n.type] ?? fallback
              const room = roomName(n)
              return (
                <li key={n.id} className={`flex items-start justify-between gap-4 px-4 py-3 ${n.read ? '' : 'bg-spore-soft/40'}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${l.tone}`}>{l.text}</span>
                      <span className={`text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-mute">{n.content}</p>
                    <p className="mt-1 text-xs text-mute" title={clock(n.created_at)}>
                      {timeAgo(n.created_at)}
                      {room && (
                        <>
                          {' · '}
                          <Link to={`/giam-sat/${room.id}`} className="text-spore-deep underline">{room.name}</Link>
                        </>
                      )}
                    </p>
                  </div>
                  {!n.read && (
                    <button type="button" onClick={() => read.mutate(n.id)} className="shrink-0 text-sm font-medium text-spore-deep underline">
                      Đã đọc
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {!!q.data && <nav aria-label="Phân trang thông báo" className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span>Trang {page}/{pageCount} · {q.data.total} thông báo</span>
        <div className="flex gap-2"><button type="button" className="rounded border border-line px-3 py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button><button type="button" className="rounded border border-line px-3 py-1" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Sau</button></div>
      </nav>}
    </div>
  )
}

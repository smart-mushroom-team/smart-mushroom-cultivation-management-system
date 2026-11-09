import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ApiError } from '../api/http'
import { getLatestImage, getSnapshotImage, getSnapshotPage, type SnapshotItem } from '../api/monitoring'
import { clock, timeAgo } from '../lib/format'
import { AuthImage, useBlobUrl } from './AuthImage'
import { Notice } from './Notice'
import { Pagination } from './Pagination'

function Lightbox({ roomId, item, onClose }: { roomId: string; item: SnapshotItem; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return <div role="dialog" aria-modal="true" aria-label={`Ảnh lúc ${clock(item.capturedAt)}`}
    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-ink/80 p-4" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-4xl">
      <AuthImage queryKey={['snap', roomId, item.id]} fetcher={() => getSnapshotImage(roomId, item.id)}
        alt={`Ảnh phòng lúc ${clock(item.capturedAt)}`} className="max-h-[80vh] rounded-md" />
    </div>
    <button type="button" autoFocus onClick={onClose} className="rounded-md bg-paper px-4 py-2 text-sm font-medium">Đóng</button>
  </div>
}

function LatestCamera({ roomId, slot }: { roomId: string; slot: 1 | 2 }) {
  const latest = useBlobUrl(['cam-latest', roomId, slot], () => getLatestImage(roomId, slot), { refetchInterval: 30_000 })
  const noSnap = latest.error instanceof ApiError && latest.error.status === 404
  return <div className="min-w-0 rounded-lg border border-line p-3">
    <h3 className="mb-2 font-medium">Camera {slot} · Hàng {slot === 1 ? '1–2' : '3–4'}</h3>
    {latest.url ? <figure><img src={latest.url} alt={`Ảnh mới nhất camera ${slot}`}
      className="aspect-video w-full rounded-md border border-line object-contain" />
      {latest.capturedAt && <figcaption className="mt-1 text-xs text-mute">Chụp {timeAgo(latest.capturedAt)} ({clock(latest.capturedAt)})</figcaption>}</figure>
    : latest.isLoading ? <div className="aspect-video animate-pulse rounded-md bg-bone" />
    : noSnap ? <Notice>Camera {slot} chưa có ảnh.</Notice>
    : <Notice tone="error">Không tải được ảnh camera {slot}.</Notice>}
  </div>
}

function CameraHistory({ roomId, slot }: { roomId: string; slot: 1 | 2 }) {
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<SnapshotItem | null>(null)
  useEffect(() => setPage(1), [roomId])
  const history = useQuery({ queryKey: ['snapshots', roomId, slot, page],
    queryFn: () => getSnapshotPage(roomId, slot, page), refetchInterval: 30_000 })
  const items = history.data?.items ?? []
  useEffect(() => {
  if (!history.data) return

  console.log(`[Camera ${slot}] Pagination debug`, {
    currentPage: page,
    total: history.data.total,
    totalPages: history.data.totalPages,
    response: history.data,
  })
}, [slot, page, history.data])
  return <section aria-label={`Lịch sử camera ${slot}`} className="space-y-3">
    <h3 className="font-medium">Camera {slot} · Ảnh gần đây</h3>
    {history.isLoading ? <p role="status" className="text-sm text-mute">Đang tải ảnh...</p>
    : history.error ? <Notice tone="error">Không tải được lịch sử camera {slot}.</Notice>
    : items.length === 0 ? <p className="text-sm text-mute">Camera {slot} chưa có ảnh trong lịch sử.</p>
    : <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
      {items.map(it => <li key={it.id}><button type="button" onClick={() => setOpen(it)}
        className="block w-full text-left" aria-label={`Camera ${slot}, xem ảnh lúc ${clock(it.capturedAt)}`}>
        <AuthImage queryKey={['snap', roomId, it.id]} fetcher={() => getSnapshotImage(roomId, it.id)}
          alt="" className="aspect-video w-full rounded border border-line object-cover" />
        <span className="text-xs text-mute">{clock(it.capturedAt)}</span>
      </button></li>)}
    </ul>}
    {history.data && <Pagination currentPage={page} totalPages={history.data.totalPages} onPageChange={setPage} />}
    {open && <Lightbox roomId={roomId} item={open} onClose={() => setOpen(null)} />}
  </section>
}

export function CameraPanel({ roomId }: { roomId: string }) {
  return <section aria-label="Camera" className="space-y-5 rounded-lg border border-line bg-paper p-4">
    <h2 className="font-display text-xl font-semibold">Camera</h2>
    <div className="grid gap-4 md:grid-cols-2">
      <LatestCamera roomId={roomId} slot={1} /><LatestCamera roomId={roomId} slot={2} />
    </div>
    <h2 className="font-display text-lg font-semibold">Ảnh gần đây</h2>
    <CameraHistory roomId={roomId} slot={1} /><CameraHistory roomId={roomId} slot={2} />
  </section>
}

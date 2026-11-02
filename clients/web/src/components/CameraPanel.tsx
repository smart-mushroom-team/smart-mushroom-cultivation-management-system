import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ApiError } from '../api/http'
import { getLatestImage, getSnapshotImage, getSnapshotPage, type SnapshotItem } from '../api/monitoring'
import { clock, timeAgo } from '../lib/format'
import { AuthImage, useBlobUrl } from './AuthImage'
import { Notice } from './Notice'

function Lightbox({ roomId, item, onClose }: { roomId: string; item: SnapshotItem; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label={`Ảnh lúc ${clock(item.capturedAt)}`} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-ink/80 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-4xl">
        <AuthImage queryKey={['snap', roomId, item.id]} fetcher={() => getSnapshotImage(roomId, item.id)} alt={`Ảnh phòng lúc ${clock(item.capturedAt)}`} className="max-h-[80vh] rounded-md" />
      </div>
      <button autoFocus onClick={onClose} className="rounded-md bg-paper px-4 py-2 text-sm font-medium">Đóng</button>
    </div>
  )
}

export function CameraPanel({ roomId }: { roomId: string }) {
  const latest = useBlobUrl(['cam-latest', roomId], () => getLatestImage(roomId), { refetchInterval: 30_000 })
  const history = useInfiniteQuery({ queryKey: ['snapshots', roomId], queryFn: ({ pageParam }) => getSnapshotPage(roomId, pageParam), initialPageParam: null as string | null, getNextPageParam: (p) => p.nextBefore })
  const [open, setOpen] = useState<SnapshotItem | null>(null)
  const items = history.data?.pages.flatMap((p) => p.items) ?? []
  const retention = history.data?.pages[0]?.retentionHours
  const noSnap = latest.error instanceof ApiError && latest.error.status === 404

  return (
    <section aria-labelledby="cam-h" className="rounded-lg border border-line bg-paper p-4">
      <h2 id="cam-h" className="font-display text-base font-semibold">Camera</h2>
      <div className="mt-3">
        {latest.url ? <figure><img src={latest.url} alt="Ảnh mới nhất của phòng" className="w-full max-w-xl rounded-md border border-line" />{latest.capturedAt && <figcaption className="mt-1 text-sm text-mute">Chụp {timeAgo(latest.capturedAt)} ({clock(latest.capturedAt)})</figcaption>}</figure> : latest.isLoading ? <div className="aspect-video max-w-xl animate-pulse rounded-md bg-bone" aria-hidden="true" /> : noSnap ? <Notice>Phòng chưa có ảnh nào. Ảnh sẽ hiện khi camera gửi lên.</Notice> : <Notice tone="error">Không tải được ảnh mới nhất.</Notice>}
      </div>
      {items.length > 0 && <div className="mt-5"><h3 className="text-sm font-medium">Ảnh gần đây{retention ? <span className="font-normal text-mute"> · lưu {retention >= 48 ? `${Math.round(retention / 24)} ngày` : `${retention} giờ`}</span> : null}</h3><ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">{items.map((it) => <li key={it.id}><button type="button" onClick={() => setOpen(it)} className="block w-full text-left" aria-label={`Xem ảnh lúc ${clock(it.capturedAt)}`}><AuthImage queryKey={['snap', roomId, it.id]} fetcher={() => getSnapshotImage(roomId, it.id)} alt="" className="aspect-video w-full rounded border border-line object-cover" /><span className="text-xs text-mute">{clock(it.capturedAt)}</span></button></li>)}</ul>{history.hasNextPage && <button type="button" onClick={() => void history.fetchNextPage()} disabled={history.isFetchingNextPage} className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-spore">{history.isFetchingNextPage ? 'Đang tải...' : 'Xem ảnh cũ hơn'}</button>}</div>}
      {open && <Lightbox roomId={roomId} item={open} onClose={() => setOpen(null)} />}
    </section>
  )
}

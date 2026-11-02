import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

/** Ảnh camera cần JWT nên không dùng thẳng <img src>; tải thành blob rồi tạo URL tạm, thu hồi khi không dùng nữa. */
export function useBlobUrl(key: unknown[], fetcher: () => Promise<{ blob: Blob; capturedAt: string | null }>, opts: { refetchInterval?: number } = {}) {
  const q = useQuery({ queryKey: key, queryFn: fetcher, refetchInterval: opts.refetchInterval, staleTime: 60_000, retry: false })
  const blob = q.data?.blob
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return setUrl(null)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return { url, capturedAt: q.data?.capturedAt ?? null, error: q.error, isLoading: q.isLoading }
}

export function AuthImage({ queryKey, fetcher, alt, className }: { queryKey: unknown[]; fetcher: () => Promise<{ blob: Blob; capturedAt: string | null }>; alt: string; className?: string }) {
  const { url, error } = useBlobUrl(queryKey, fetcher)
  if (error) return <div className={`flex items-center justify-center bg-bone text-xs text-mute ${className ?? ''}`}>Không tải được ảnh</div>
  if (!url) return <div className={`animate-pulse bg-bone ${className ?? ''}`} aria-hidden="true" />
  return <img src={url} alt={alt} className={className} />
}

import { useEffect, useState, type KeyboardEvent } from 'react'

type Props = { currentPage: number; totalPages: number; onPageChange: (page: number) => void }
export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  const [value, setValue] = useState(String(currentPage))
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setValue(String(currentPage)) }, [currentPage, focused])
  if (totalPages <= 1) return null
  const commit = () => {
    const page = Number(value)
    const next = Number.isInteger(page) && page >= 1 && page <= totalPages ? page : 1
    setValue(String(next))
    onPageChange(next)
  }
  const keyDown = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur() }
  const buttonClass = 'rounded-lg border border-line bg-paper px-4 py-2 text-sm font-medium hover:bg-bone disabled:cursor-not-allowed disabled:opacity-40'
  return <nav aria-label="Phân trang phòng" className="mt-6 flex flex-wrap items-center justify-center gap-3">
    <button type="button" className={buttonClass} disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Trước</button>
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
      <label htmlFor="rooms-page" className="sr-only">Trang hiện tại</label>
      <input id="rooms-page" type="number" min={1} max={totalPages} value={value} onChange={e => setValue(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); commit() }} onKeyDown={keyDown} className="w-12 bg-transparent text-center text-sm font-semibold text-spore-deep outline-none" />
      <span className="text-sm text-mute">/ {totalPages}</span>
    </div>
    <button type="button" className={buttonClass} disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Sau</button>
  </nav>
}

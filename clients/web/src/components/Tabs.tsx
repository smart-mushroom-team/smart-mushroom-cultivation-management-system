/** Thanh chuyển mục dùng chung; nút đang chọn có aria-pressed và nền tím nhạt, giống các bộ lọc khác. */
export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {items.map((i) => (
        <button key={i.id} type="button" aria-pressed={value === i.id} onClick={() => onChange(i.id)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${value === i.id ? 'bg-spore-soft text-spore-deep' : 'border border-line hover:border-spore'}`}>
          {i.label}
        </button>
      ))}
    </div>
  )
}

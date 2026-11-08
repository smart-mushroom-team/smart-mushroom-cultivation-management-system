import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { listAllPackages, createPackage, patchPackage } from '../../api/packages'
import { describeError } from '../../api/http'
import { Notice } from '../../components/Notice'
import { money, parsePrice } from '../../lib/catalog'
import { input, primary } from './ui'

const DURATIONS = [10, 15, 30] as const
function PriceEditor({ days, price, id }: { days: number; price: number; id?: string }) {
  const qc = useQueryClient()
  const [value, setValue] = useState(String(price))
  useEffect(() => setValue(String(price)), [price])
  const amount = parsePrice(value)
  const save = useMutation({
    mutationFn: () => id ? patchPackage(id, { pricePerTray: amount!, isActive: true })
      : createPackage({ name: `Gói ${days} ngày`, durationDays: days, pricePerTray: amount! }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['packages-all'] }) },
  })
  return <div className="rounded-lg border border-line bg-paper p-4">
    <h3 className="font-display text-lg font-semibold">Gói {days} ngày</h3>
    <label htmlFor={`price-${days}`} className="mt-3 block text-sm font-medium">Giá thuê một khay cho cả gói (VNĐ)</label>
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <input id={`price-${days}`} type="number" min="0" step="1" className={`${input} min-w-44 flex-1`} value={value} onChange={e => setValue(e.target.value)} />
      <button type="button" className={primary} disabled={amount === null || save.isPending || (id !== undefined && amount === price)} onClick={() => save.mutate()}>{save.isPending ? 'Đang lưu...' : 'Lưu giá'}</button>
    </div>
    <p className="mt-2 text-sm text-mute">{amount === null ? 'Giá không hợp lệ' : `Một khay: ${money(amount)} · Ba khay: ${money(amount * 3)}`}</p>
    {save.isError && <div className="mt-2"><Notice tone="error">{describeError(save.error)}</Notice></div>}
    {save.isSuccess && <p className="mt-2 text-sm text-moss">Đã lưu cấu hình.</p>}
  </div>
}
export function PackagesTab() {
  const q = useQuery({ queryKey: ['packages-all'], queryFn: listAllPackages })
  return <div className="space-y-4">
    <p className="text-sm text-mute">Admin chỉ cấu hình giá mỗi khay cho gói 10, 15 và 30 ngày. Số lượng khay do khách chọn khi đặt thuê. Giá đơn đã xác nhận không bị thay đổi.</p>
    {q.isError ? <Notice tone="error">Không tải được giá thuê: {describeError(q.error)}</Notice> : q.isPending ? <p>Đang tải...</p> : DURATIONS.map(days => {
      const pack = q.data?.find(p => p.durationDays === days && p.active) ?? q.data?.find(p => p.durationDays === days)
      return <PriceEditor key={`${days}-${pack?.id ?? 'new'}`} days={days} price={pack?.pricePerTray ?? 0} id={pack?.id} />
    })}
  </div>
}

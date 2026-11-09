import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { listAllPackages, createPackage, patchPackage, type Pack } from '../../api/packages'
import { describeError } from '../../api/http'
import { Notice } from '../../components/Notice'
import { money } from '../../lib/catalog'
import { input, primary } from './ui'
import { useAuth } from '../../auth/AuthContext'

function PackageCard({ pack, canEdit }: { pack: Pack; canEdit: boolean }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pack.name)
  const [days, setDays] = useState(String(pack.durationDays))
  const [price, setPrice] = useState(String(pack.pricePerTray))
  const duration = Number(days)
  const amount = Number(price)
  const valid = name.trim().length > 0 && Number.isSafeInteger(duration) && duration > 0 && Number.isSafeInteger(amount) && amount > 0
  const mutation = useMutation({
    mutationFn: (data: { name?: string; durationDays?: number; pricePerTray?: number; isActive?: boolean }) => patchPackage(pack.id, data),
    onSuccess: async () => { setEditing(false); await qc.invalidateQueries({ queryKey: ['packages-all'] }) },
  })
  return <div className="rounded-xl border border-line bg-paper p-4 space-y-3">
    {editing ? <>
      <label className="block text-sm">Tên gói<input className={`${input} mt-1 w-full`} maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block text-sm">Thời hạn (ngày)<input className={`${input} mt-1 w-full`} type="number" min="1" step="1" value={days} onChange={e => setDays(e.target.value)} /></label>
      <label className="block text-sm">Giá mỗi khay cho cả gói (VNĐ)<input className={`${input} mt-1 w-full`} type="number" min="1" step="1" value={price} onChange={e => setPrice(e.target.value)} /></label>
      <p className="text-sm text-mute">Giá trung bình/ngày: {valid ? money(amount / duration) : '—'}</p>
      <div className="flex gap-2"><button type="button" className={primary} disabled={!valid || mutation.isPending} onClick={() => mutation.mutate({ name: name.trim(), durationDays: duration, pricePerTray: amount })}>Lưu thay đổi</button><button type="button" onClick={() => setEditing(false)}>Hủy</button></div>
    </> : <>
      <div className="flex items-center justify-between gap-2"><h3 className="font-display text-lg font-semibold">{pack.name}</h3><span className="text-sm text-mute">{pack.active ? 'Đang bán' : 'Đã tắt'}</span></div>
      <p className="text-sm text-mute">{pack.durationDays} ngày | {money(pack.pricePerTray)}/khay | {money(pack.pricePerTray / pack.durationDays)}/ngày</p>
      {canEdit && <div className="flex gap-3"><button type="button" className={primary} onClick={() => { setName(pack.name); setDays(String(pack.durationDays)); setPrice(String(pack.pricePerTray)); setEditing(true) }}>Chỉnh sửa</button><button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ isActive: !pack.active })}>{pack.active ? 'Tắt gói' : 'Bật gói'}</button></div>}
    </>}
    {mutation.isError && <Notice tone="error">{describeError(mutation.error)}</Notice>}
  </div>
}

export function PackagesTab() {
  const { session } = useAuth()
  const canEdit = session?.role === 'ADMIN'
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['packages-all'], queryFn: listAllPackages })
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [days, setDays] = useState('60')
  const [price, setPrice] = useState('600000')
  const duration = Number(days)
  const amount = Number(price)
  const valid = name.trim().length > 0 && Number.isSafeInteger(duration) && duration > 0 && Number.isSafeInteger(amount) && amount > 0
  const create = useMutation({
    mutationFn: () => createPackage({ name: name.trim(), durationDays: duration, pricePerTray: amount }),
    onSuccess: async () => { setShowForm(false); setName(''); await qc.invalidateQueries({ queryKey: ['packages-all'] }) },
  })
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-mute">Giá/ngày được tính tự động từ giá gói / số ngày. Tổng tiền đơn thuê luôn dùng giá gói.</p>{canEdit && <button type="button" className={primary} onClick={() => setShowForm(v => !v)}>{showForm ? 'Đóng' : '+ Tạo gói'}</button>}</div>
    {canEdit && showForm && <form className="rounded-xl border border-line bg-paper p-4 space-y-3" onSubmit={e => { e.preventDefault(); if (valid) create.mutate() }}>
      <h3 className="font-display text-lg font-semibold">Tạo gói thuê mới</h3>
      <label className="block text-sm">Tên gói<input className={`${input} mt-1 w-full`} maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Gói 60 ngày" required /></label>
      <label className="block text-sm">Số ngày thuê<input className={`${input} mt-1 w-full`} type="number" min="1" step="1" value={days} onChange={e => setDays(e.target.value)} required /></label>
      <label className="block text-sm">Giá thuê 1 khay cho cả gói (VNĐ)<input className={`${input} mt-1 w-full`} type="number" min="1" step="1" value={price} onChange={e => setPrice(e.target.value)} required /></label>
      <p className="text-sm font-medium">Giá trung bình/ngày: {valid ? money(amount / duration) : '—'}</p>
      <button type="submit" className={primary} disabled={!valid || create.isPending}>{create.isPending ? 'Đang tạo...' : 'Tạo gói'}</button>
      {create.isError && <Notice tone="error">{describeError(create.error)}</Notice>}
    </form>}
    {q.isPending ? <p>Đang tải...</p> : q.isError ? <Notice tone="error">Không tải được gói thuê: {describeError(q.error)}</Notice> : q.data?.length ? <div className="grid gap-4 md:grid-cols-2">{q.data.map(pack => <PackageCard key={pack.id} pack={pack} canEdit={canEdit} />)}</div> : <p className="text-sm text-mute">Chưa có gói thuê.</p>}
  </div>
}

import { useEffect, useMemo, useState } from 'react'
import { Pagination } from '../components/Pagination'
import { api, describeError } from '../api/http'

type Order = {
  id: string
  customer_name: string
  package_name: string
  tray_count: number
  status: string
  start_date: string
  end_date: string
  total_amount: number
}

type Request = {
  id: string
  rental_id: string
  customer_name: string
  package_name: string
  tray_count: number
  remaining_days: number
  used_days: number
  refund_amount: number
  status: string
  bank_name: string
  account_number: string
  account_holder: string
  rejection_reason: string | null
  transfer_reference: string | null
}

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

export function RentalOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [orderStatus, setOrderStatus] = useState('ALL')
  const [orderPackage, setOrderPackage] = useState('ALL')
  const [requestPackage, setRequestPackage] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const [requestPage, setRequestPage] = useState(1)
  const packageNames = useMemo(() => [...new Set(orders.map(o => o.package_name))].sort((a,b) => a.localeCompare(b, 'vi')), [orders])
  const filteredOrders = useMemo(() => orders.filter(o => (orderStatus === 'ALL' || o.status === orderStatus) && (orderPackage === 'ALL' || o.package_name === orderPackage)), [orders, orderStatus, orderPackage])
  const filteredRequests = useMemo(() => requests.filter(r => r.package_name.toLocaleLowerCase('vi').includes(requestPackage.trim().toLocaleLowerCase('vi'))), [requests, requestPackage])
  const orderPages = Math.max(1, Math.ceil(filteredOrders.length / 5))
  const requestPages = Math.max(1, Math.ceil(filteredRequests.length / 10))
  const currentOrderPage = Math.min(orderPage, orderPages)
  const currentRequestPage = Math.min(requestPage, requestPages)
  const visibleOrders = filteredOrders.slice((currentOrderPage - 1) * 5, currentOrderPage * 5)
  const visibleRequests = filteredRequests.slice((currentRequestPage - 1) * 10, currentRequestPage * 10)

  async function load() {
    try {
      const [a, b] = await Promise.all([
        api<Order[]>('/api/core/rentals/all'),
        api<Request[]>('/api/core/terminations'),
      ])
      setOrders(a)
      setRequests(b)
      setError('')
    } catch (e) {
      setError(describeError(e))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function act(id: string, kind: 'decision' | 'transfer' | 'clear', body?: unknown) {
    setBusy(true)
    try {
      await api(`/api/core/terminations/${id}/${kind}`, { method: 'POST', body })
      await load()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Đơn thuê</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}

      <h2 className="text-lg font-semibold">Yêu cầu kết thúc sớm</h2>
      <label className="block max-w-md space-y-1 text-sm">
        <span className="font-medium">Tìm theo tên gói</span>
        <input type="search" value={requestPackage} onChange={e => { setRequestPackage(e.target.value); setRequestPage(1) }} placeholder="Nhập tên gói..." className="w-full rounded-lg border border-line bg-paper px-3 py-2" />
      </label>
      {filteredRequests.length === 0 && <p>Không có yêu cầu phù hợp.</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {visibleRequests.map((r) => (
        <article key={r.id} className="rounded-lg border border-line bg-paper p-4 space-y-2">
          <div className="font-semibold">
            {r.customer_name} · {r.package_name} · {r.tray_count} khay
          </div>
          <p>
            Trạng thái: {r.status} · Đã dùng {r.used_days} ngày · Còn {r.remaining_days} ngày
          </p>
          <p className="font-semibold">Hoàn: {money(r.refund_amount)}</p>
          <p>
            Ngân hàng: {r.bank_name} · {r.account_number} · {r.account_holder}
          </p>
          {r.rejection_reason && <p>Lý do từ chối: {r.rejection_reason}</p>}
          {r.transfer_reference && <p>Mã chuyển khoản: {r.transfer_reference}</p>}

          {r.status === 'PENDING_REVIEW' && (
            <div className="flex gap-2">
              <button
                disabled={busy}
                className="rounded border p-2"
                onClick={() => void act(r.id, 'decision', { approve: true })}
              >
                Duyệt
              </button>
              <button
                disabled={busy}
                className="rounded border p-2"
                onClick={() => {
                  const reason = window.prompt('Lý do từ chối (bắt buộc)')
                  if (reason?.trim()) void act(r.id, 'decision', { approve: false, reason })
                }}
              >
                Từ chối
              </button>
            </div>
          )}

          {r.status === 'APPROVED' && (
            <button
              disabled={busy}
              className="rounded border p-2"
              onClick={() => {
                const reference = window.prompt('Nhập mã giao dịch sau khi đã chuyển tiền')
                if (reference?.trim()) void act(r.id, 'transfer', { reference })
              }}
            >
              Xác nhận đã chuyển khoản
            </button>
          )}

          {r.status === 'REFUNDED' && (
            <p className="text-sm">Chờ Operator xác nhận đã thu hoạch và vệ sinh khay.</p>
          )}
        </article>
      ))}
      </div>
      <Pagination currentPage={currentRequestPage} totalPages={requestPages} onPageChange={setRequestPage} label="Phân trang yêu cầu kết thúc sớm" />

      <h2 className="text-lg font-semibold">Tất cả đơn thuê</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="block font-medium">Trạng thái</span>
          <select value={orderStatus} onChange={e => { setOrderStatus(e.target.value); setOrderPage(1) }} className="w-full rounded-lg border border-line bg-paper px-3 py-2">
            <option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">ACTIVE</option><option value="COMPLETED">COMPLETED</option>
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="block font-medium">Tên gói</span>
          <select value={orderPackage} onChange={e => { setOrderPackage(e.target.value); setOrderPage(1) }} className="w-full rounded-lg border border-line bg-paper px-3 py-2">
            <option value="ALL">Tất cả gói</option>
            {packageNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Gói</th>
              <th>Khách</th>
              <th>Khay</th>
              <th>Trạng thái</th>
              <th>Tổng</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="py-2">{o.package_name}</td>
                <td>{o.customer_name}</td>
                <td>{o.tray_count}</td>
                <td>{o.status}</td>
                <td>{money(o.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredOrders.length === 0 && <p>Không có đơn thuê phù hợp.</p>}
      <Pagination currentPage={currentOrderPage} totalPages={orderPages} onPageChange={setOrderPage} label="Phân trang đơn thuê" />
    </section>
  )
}
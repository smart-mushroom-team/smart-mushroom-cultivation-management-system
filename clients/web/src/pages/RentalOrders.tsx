import { useEffect, useState } from 'react'
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
      {requests.length === 0 && <p>Chưa có yêu cầu.</p>}
      {requests.map((r) => (
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

      <h2 className="text-lg font-semibold">Tất cả đơn thuê</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Khách</th>
              <th>Gói</th>
              <th>Khay</th>
              <th>Trạng thái</th>
              <th>Tổng</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="py-2">{o.customer_name}</td>
                <td>{o.package_name}</td>
                <td>{o.tray_count}</td>
                <td>{o.status}</td>
                <td>{money(o.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
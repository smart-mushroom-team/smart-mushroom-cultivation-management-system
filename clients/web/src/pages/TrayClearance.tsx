import { useEffect, useState } from 'react'
import { api, describeError } from '../api/http'

type Tray = {
  tray_id: string
  tray_code: string
  position: string
}

type Item = {
  id: string
  rental_id: string
  remaining_days: number
  package_name: string
  tray_count: number
  customer_name: string
  room_name: string
  trays: Tray[]
}

export function TrayClearance() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    try {
      setItems(await api<Item[]>('/api/core/terminations/awaiting-clearance'))
      setError('')
    } catch (e) {
      setError(describeError(e))
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => { void load() }, [])

  async function clear(item: Item) {
    if (item.trays.length !== item.tray_count) {
      setError('Danh sách khay không khớp số lượng của đơn. Hãy kiểm tra dữ liệu trước khi bàn giao.')
      return
    }
    if (!window.confirm(`Xác nhận đã thu hoạch, vệ sinh và kiểm tra toàn bộ ${item.tray_count} khay của đơn này?`)) return
    setBusyId(item.id)
    try {
      await api(`/api/core/terminations/${item.id}/clear`, { method: 'POST' })
      await load()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Bàn giao khay sau hoàn tiền</h1>
      <p>Chỉ đánh dấu sẵn sàng khi tất cả khay đã được thu hoạch và vệ sinh.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loaded && items.length === 0 && <p>Không có đơn chờ bàn giao.</p>}
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-line p-4 space-y-3">
          <h2 className="font-semibold">{item.customer_name} · {item.package_name}</h2>
          <p><strong>Phòng:</strong> {item.room_name}</p>
          <p className="font-medium">{item.tray_count} khay</p>
          <ul className="space-y-2">
            {item.trays.map((tray) => (
              <li key={tray.tray_id} className="rounded border border-line p-3">
                <strong>Khay {tray.tray_code}</strong> <span className="text-gray-600">| Vị trí: {tray.position}</span>
              </li>
            ))}
          </ul>
          <p>{item.remaining_days} ngày còn lại đã được hoàn tiền</p>
          {item.trays.length !== item.tray_count && (
            <p role="alert" className="text-red-700">Số khay đang liên kết không khớp đơn thuê. Chưa thể bàn giao.</p>
          )}
          <button
            disabled={busyId !== null || item.trays.length !== item.tray_count}
            className="rounded border p-2 disabled:opacity-50"
            onClick={() => void clear(item)}
          >
            {busyId === item.id ? 'Đang xác nhận...' : 'Xác nhận đã vệ sinh toàn bộ khay'}
          </button>
        </article>
      ))}
    </section>
  )
}

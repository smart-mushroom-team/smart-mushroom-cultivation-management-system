import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, mockApi, renderApp, storedSession } from '../test/helpers'

const ROOMS = [
  { id: 'r1', name: 'Phòng A', status: 'ACTIVE' },
  { id: 'r2', name: 'Phòng B', status: 'ACTIVE' },
  { id: 'r3', name: 'Phòng C', status: 'INACTIVE' },
]
const tray = (id: string, room: string, occ: 'RENTED' | 'AVAILABLE', slot: number) => ({ id, tray_code: id, room_id: room, location_row: 1, location_shelf: 1, location_slot: slot, occupancy_status: occ })
const TRAYS = [tray('a1', 'r1', 'RENTED', 1), tray('a2', 'r1', 'RENTED', 2), tray('a3', 'r1', 'AVAILABLE', 3), tray('b1', 'r2', 'AVAILABLE', 1)]
const snap = (t: number, h: number) => ({ snapshot: { temperature: t, humidity: h, recordedAt: new Date().toISOString() }, deviceOnline: true })
const thr = (alerting = { temp: false, hum: false }) => ({ tempMin: 20, tempMax: 30, humMin: 80, humMax: 90, consecutiveN: 3, configured: true, alerting })
const device = (id: string, online: boolean) => ({ id, name: id, type: 'SENSOR_NODE', roomId: 'r1', status: 'ACTIVE', isSimulated: false, intervalSec: 30, online, lastSeenAt: '2026-11-10T08:00:00Z', cameraSlot: null, coverageRows: null })

const day = (i: number, gross: number, refunds = 0) => ({ date: `2026-10-${String(11 + i).padStart(2, '0')}`, gross, refunds })
const DAILY = Array.from({ length: 30 }, (_, i) => (i === 29 ? day(i, 300000, 70000) : day(i, 0)))
const DASH = {
  today: '2026-11-10',
  activeRentals: 5,
  pendingVarieties: { cycles: 3, rentals: 2 },
  expiring: { days: 3, total: 1, items: [{ id: 'x1', customerName: 'Chi Khách', packageName: 'Gói 30 ngày', trayCount: 2, endDate: '2026-11-11', daysLeft: 1 }] },
  expiredGrowing: 1,
  awaitingClearance: 0,
  terminations: null,
  revenue: null,
}
const REVENUE = { thisMonth: { gross: 900000, refunds: 70000, net: 830000, orders: 4 }, lastMonth: { gross: 500000, refunds: 0, net: 500000, orders: 2 }, daily: DAILY, monthStart: '2026-11-01' }

function routes(over: Record<string, () => Response | Promise<Response>> = {}) {
  return {
    'GET /api/core/notifications': () => json([]),
    'GET /api/core/dashboard': () => json(DASH),
    'GET /api/core/rooms': () => json(ROOMS),
    'GET /api/core/trays': () => json(TRAYS),
    'GET /api/monitoring/devices': () => json([device('d1', false), device('d2', true)]),
    'GET /api/monitoring/rooms/r1/latest': () => json(snap(33, 85)),
    'GET /api/monitoring/rooms/r2/latest': () => json({ snapshot: null, deviceOnline: false }),
    'GET /api/monitoring/rooms/r1/thresholds': () => json(thr({ temp: true, hum: false })),
    'GET /api/monitoring/rooms/r2/thresholds': () => json(thr()),
    'GET /api/monitoring/rooms/r3/latest': () => json(snap(25, 85)),
    'GET /api/monitoring/rooms/r3/thresholds': () => json(thr()),
    ...over,
  }
}

describe('Tổng quan (Operator)', () => {
  it('việc cần xử lý, số khay, đơn sắp hết hạn và tình trạng từng phòng', async () => {
    storedSession('OPERATOR')
    mockApi(routes())
    renderApp('/')
    const todo = within(await screen.findByRole('list'))
    expect(await todo.findByText('Phòng A đang cảnh báo ngưỡng phòng: nhiệt độ')).toBeInTheDocument()
    expect(todo.getByText(/1 đơn đã hết hạn còn khay đang nuôi/)).toBeInTheDocument()
    expect(todo.getByText('1 thiết bị mất kết nối')).toBeInTheDocument()
    expect(todo.getByText(/2 đơn có giống nấm chờ duyệt \(3 khay\)/)).toBeInTheDocument()
    expect(todo.getByRole('link', { name: /giống nấm chờ duyệt/ })).toHaveAttribute('href', '/dot-nuoi?giong=cho-duyet')
    expect(todo.getByRole('link', { name: /Phòng A đang/ })).toHaveAttribute('href', '/giam-sat/r1')

    expect(screen.getByText('phòng đang hoạt động').previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('khay đang cho thuê').previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('khay còn trống').previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('đơn đang chạy').previousElementSibling).toHaveTextContent('5')

    expect(screen.getByText('Chi Khách')).toBeInTheDocument()
    expect(screen.getByText(/Còn 1 ngày/)).toBeInTheDocument()

    const rows = within(screen.getByRole('table', { name: /Tình trạng và số đo/ })).getAllByRole('row')
    expect(within(rows[1]).getByText('Cảnh báo')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Vượt ngưỡng phòng: nhiệt độ')).toBeInTheDocument()
    expect(within(rows[1]).getByText('2/3')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Mất kết nối')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Đã ngừng')).toBeInTheDocument()
  })

  it('Operator không thấy doanh thu hay người dùng và không gọi API của Admin', async () => {
    storedSession('OPERATOR')
    const m = mockApi(routes())
    renderApp('/')
    await screen.findByText('Chi Khách')
    expect(screen.queryByText('Doanh thu')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Người dùng' })).not.toBeInTheDocument()
    expect(m.calls.some((c) => c.key.includes('/api/identity/users'))).toBe(false)
  })

  it('không có việc gì: nói rõ là không tồn đọng', async () => {
    storedSession('OPERATOR')
    mockApi(routes({
      'GET /api/core/dashboard': () => json({ ...DASH, pendingVarieties: { cycles: 0, rentals: 0 }, expiredGrowing: 0, expiring: { days: 3, total: 0, items: [] } }),
      'GET /api/monitoring/devices': () => json([device('d1', true)]),
      'GET /api/monitoring/rooms/r1/thresholds': () => json(thr()),
    }))
    renderApp('/')
    expect(await screen.findByText(/Không có việc tồn đọng/)).toBeInTheDocument()
    expect(screen.queryByText('Đơn sắp hết hạn')).not.toBeInTheDocument()
  })

  it('lỗi tải tổng hợp: báo lỗi riêng, phần phòng vẫn hiện; thử lại hoạt động', async () => {
    storedSession('OPERATOR')
    let fail = true
    mockApi(routes({ 'GET /api/core/dashboard': () => (fail ? new Response('', { status: 503 }) : json(DASH)) }))
    renderApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được việc cần xử lý')
    expect(await screen.findByText('Phòng A')).toBeInTheDocument()
    fail = false
    screen.getByRole('button', { name: 'Thử lại' }).click()
    expect(await screen.findByText('Chi Khách')).toBeInTheDocument()
  })

  it('chưa có phòng nào: nói phải làm gì tiếp theo', async () => {
    storedSession('OPERATOR')
    mockApi(routes({ 'GET /api/core/rooms': () => json([]), 'GET /api/core/trays': () => json([]) }))
    renderApp('/')
    expect(await screen.findByText(/Nhờ Admin thêm phòng/)).toBeInTheDocument()
  })
})

describe('Tổng quan (Admin)', () => {
  const USERS = [
    { id: 'u1', name: 'A', email: 'a@x', role: 'ADMIN', status: 'ACTIVE', created_at: '' },
    { id: 'u2', name: 'B', email: 'b@x', role: 'OPERATOR', status: 'ACTIVE', created_at: '' },
    { id: 'u3', name: 'C', email: 'c@x', role: 'CUSTOMER', status: 'ACTIVE', created_at: '' },
    { id: 'u4', name: 'D', email: 'd@x', role: 'CUSTOMER', status: 'ACTIVE', created_at: '' },
    { id: 'u5', name: 'E', email: 'e@x', role: 'CUSTOMER', status: 'INACTIVE', created_at: '' },
  ]

  it('thấy doanh thu thực thu (đã trừ hoàn tiền), đếm người dùng đang hoạt động và việc của Admin', async () => {
    storedSession('ADMIN')
    mockApi(routes({
      'GET /api/core/dashboard': () => json({ ...DASH, revenue: REVENUE, terminations: { pendingReview: 2, awaitingTransfer: 1 } }),
      'GET /api/identity/users': () => json(USERS),
    }))
    renderApp('/')
    expect(await screen.findByTestId('revenue-net')).toHaveTextContent('830.000đ')
    expect(screen.getByText('900.000đ − hoàn 70.000đ')).toBeInTheDocument()
    expect(screen.getByText('500.000đ − hoàn 0đ')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Doanh thu 30 ngày gần nhất, thực thu 230.000đ/ })).toBeInTheDocument()
    const todo = within(screen.getAllByRole('list')[0])
    expect(todo.getByText('2 yêu cầu kết thúc sớm chờ duyệt')).toBeInTheDocument()
    expect(todo.getByText(/1 yêu cầu đã duyệt, chờ xác nhận chuyển khoản/)).toBeInTheDocument()
    expect(await screen.findByText('khách hàng')).toBeInTheDocument()
    expect(screen.getByText('khách hàng').previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Operator').previousElementSibling).toHaveTextContent('1')
  })

  it('chưa có đơn nào trong 30 ngày: biểu đồ nói rõ thay vì vẽ khung trống', async () => {
    storedSession('ADMIN')
    const empty = { thisMonth: { gross: 0, refunds: 0, net: 0, orders: 0 }, lastMonth: { gross: 0, refunds: 0, net: 0, orders: 0 }, daily: DAILY.map((d) => ({ ...d, gross: 0, refunds: 0 })), monthStart: '2026-11-01' }
    mockApi(routes({ 'GET /api/core/dashboard': () => json({ ...DASH, revenue: empty, terminations: { pendingReview: 0, awaitingTransfer: 0 } }), 'GET /api/identity/users': () => json([]) }))
    renderApp('/')
    expect(await screen.findByText('Chưa có đơn thuê nào trong 30 ngày qua.')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-net')).toHaveTextContent('0đ')
  })
})

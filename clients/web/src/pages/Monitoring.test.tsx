import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { validate } from '../components/ThresholdForm'
import { apiError, json, mockApi, renderApp, storedSession } from '../test/helpers'

vi.mock('../components/RoomChart', () => ({ RoomChart: ({ title, points, min, max }: { title: string; points: unknown[]; min: number; max: number }) => <div data-testid="chart">{title}|{points.length}|{min}-{max}</div> }))
const ROOMS = [{ id: 'r1', name: 'Phòng A', status: 'ACTIVE' }, { id: 'r2', name: 'Phòng B', status: 'ACTIVE' }]
const TH = { tempMin: 20, tempMax: 30, humMin: 70, humMax: 95, consecutiveN: 3, configured: true, alerting: { temp: false, hum: false } }
const now = () => new Date().toISOString()

describe('validate ngưỡng', () => {
  const ok = { tempMin: '20', tempMax: '30', humMin: '70', humMax: '95', consecutiveN: '3' }
  it('chấp nhận dấu phẩy thập phân', () => { expect(validate({ ...ok, tempMin: '20,5' }).values?.tempMin).toBe(20.5) })
  it('bắt lỗi giống backend', () => { expect(validate({ ...ok, tempMin: '31' }).errors.tempMax).toMatch(/lớn hơn/); expect(validate({ ...ok, tempMax: '90' }).errors.tempMax).toMatch(/-40 đến 85/); expect(validate({ ...ok, humMax: '101' }).errors.humMax).toMatch(/0 đến 100/); expect(validate({ ...ok, consecutiveN: '2.5' }).errors.consecutiveN).toBeDefined() })
})

describe('danh sách giám sát', () => {
  it('hiện số đo mới nhất và trạng thái', async () => {
    storedSession('OPERATOR'); mockApi({ 'GET /api/core/rooms': () => json(ROOMS), 'GET /api/monitoring/rooms/r1/latest': () => json({ snapshot: { temperature: 33.2, humidity: 80, recordedAt: now() }, deviceOnline: true }), 'GET /api/monitoring/rooms/r2/latest': () => json({ snapshot: null, deviceOnline: false }), 'GET /api/monitoring/rooms/r1/thresholds': () => json(TH), 'GET /api/monitoring/rooms/r2/thresholds': () => json({ ...TH, configured: false }), 'GET /api/core/notifications': () => json([]) })
    renderApp('/giam-sat'); const a = (await screen.findByRole('heading', { name: 'Phòng A' })).closest('a')!; expect(await within(a).findByText('33,2°C')).toBeInTheDocument(); expect(within(a).getByText('Cao hơn ngưỡng')).toBeInTheDocument(); expect(within(a).getByText('Thiết bị trực tuyến')).toBeInTheDocument(); expect(await within(screen.getByRole('heading', { name: 'Phòng B' }).closest('a')!).findByText('Chưa có dữ liệu')).toBeInTheDocument()
  })
})

describe('chi tiết phòng', () => {
  const base = {
    'GET /api/core/rooms': () => json(ROOMS),
    'GET /api/core/notifications': () => json([]),
    'GET /api/monitoring/rooms/r1/latest': () => json({ snapshot: { temperature: 25, humidity: 80, recordedAt: now() }, deviceOnline: true }),
    'GET /api/monitoring/rooms/r1/chart': () => json([{ t: now(), temp: 25, hum: 80, tempMin: 24, tempMax: 26, humMin: 79, humMax: 81, n: 5 }]),
    'GET /api/monitoring/rooms/r1/camera/latest': () => apiError(404, 'NO_SNAPSHOT', 'Chưa có ảnh'),
    'GET /api/monitoring/rooms/r1/camera/snapshots': () => json({ items: [], page: 1, total: 0, totalPages: 0, retentionHours: 24 }),
  }
  it('hiện cảnh báo, biểu đồ và trạng thái chưa có ảnh', async () => {
    storedSession('OPERATOR')
    mockApi({ ...base, 'GET /api/monitoring/rooms/r1/thresholds': () => json({ ...TH, alerting: { temp: true, hum: false } }) })
    renderApp('/giam-sat/r1')
    expect(await screen.findByRole('heading', { name: 'Phòng A' })).toBeInTheDocument()
    expect(await screen.findByText(/Nhiệt độ đang vượt ngưỡng/)).toBeInTheDocument()
    expect(await screen.findByText('Camera 1 chưa có ảnh.')).toBeInTheDocument()
  })
  it('đổi khoảng thời gian thì gọi biểu đồ với số giờ mới', async () => { storedSession('OPERATOR'); const m = mockApi({ ...base, 'GET /api/monitoring/rooms/r1/thresholds': () => json(TH) }); renderApp('/giam-sat/r1'); await screen.findByText('Biểu đồ'); await userEvent.setup().click(screen.getByRole('button', { name: '7 ngày' })); await waitFor(() => expect(m.calls.some((c) => c.key.includes('hours=168'))).toBe(true)) })
})

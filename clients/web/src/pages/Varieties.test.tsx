import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { validate } from './catalog/VarietiesTab'
import { apiError, json, mockApi, renderApp, storedSession } from '../test/helpers'

const VAR = [
  { id: 'v1', name: 'Nấm bào ngư', description: 'Dễ trồng', growth_days: 35, temp_min: 20, temp_max: 28, hum_min: 80, hum_max: 90, is_active: true },
  { id: 'v2', name: 'Nấm cũ', description: '', growth_days: 40, temp_min: 18, temp_max: 25, hum_min: 70, hum_max: 85, is_active: false },
]
const ROOMS = [{ id: 'r1', name: 'Phòng A', status: 'ACTIVE' }]
const base = { 'GET /api/core/notifications': () => json([]), 'GET /api/core/rooms': () => json(ROOMS) }
const sent = (m: ReturnType<typeof mockApi>, key: string) => m.calls.filter((c) => c.key === key).map((c) => JSON.parse(String(c.init?.body ?? 'null')))

describe('validate giống nấm', () => {
  const ok = { name: ' Nấm A ', description: ' mô tả ', days: '30', tMin: '20,5', tMax: '28', hMin: '80', hMax: '90' }
  it('chuẩn hóa dấu phẩy, cắt khoảng trắng', () => {
    expect(validate(ok).body).toEqual({ name: 'Nấm A', description: 'mô tả', growthDays: 30, tempMin: 20.5, tempMax: 28, humMin: 80, humMax: 90 })
  })
  it('báo lỗi từng ô, kể cả min lớn hơn max', () => {
    const r = validate({ ...ok, name: ' ', days: '0', tMin: '30', tMax: '20', hMin: 'x' })
    expect(r.body).toBeNull()
    expect(Object.keys(r.errors).sort()).toEqual(['days', 'hMin', 'name', 'tMax'])
  })
})

describe('trang Giống nấm', () => {
  it('Operator cũng vào được, thấy mục Giống nấm trên thanh bên và sửa được giống', async () => {
    storedSession('OPERATOR')
    const m = mockApi({
      ...base,
      'GET /api/core/varieties/all': () => json(VAR),
      'PATCH /api/core/varieties/v1': () => json(VAR[0]),
    })
    renderApp('/giong-nam')
    const user = userEvent.setup()
    expect(await screen.findByRole('heading', { name: 'Giống nấm' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Giống nấm' })).toBeInTheDocument()
    expect(screen.queryByText('Không đủ quyền')).not.toBeInTheDocument()
    await user.click((await screen.findAllByRole('button', { name: 'Tắt giống' }))[0])
    await waitFor(() => expect(sent(m, 'PATCH /api/core/varieties/v1')).toEqual([{ isActive: false }]))
  })

  it('liệt kê cả giống đã tắt, kiểm form, gửi đúng body, bật/tắt giống', async () => {
    storedSession('ADMIN')
    const m = mockApi({
      ...base,
      'GET /api/core/varieties/all': () => json(VAR),
      'POST /api/core/varieties': () => json(VAR[0], 201),
      'PATCH /api/core/varieties/v1': () => json(VAR[0]),
    })
    renderApp('/giong-nam')
    const user = userEvent.setup()
    expect(await screen.findByText('Nấm cũ')).toBeInTheDocument()
    expect(screen.getByText('Đã tắt')).toBeInTheDocument()
    expect(screen.getByText(/35 ngày · 20–28 °C · độ ẩm 80–90 %/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thêm giống' }))
    expect(screen.getByText('Nhập tên giống.')).toBeInTheDocument()
    expect(m.calls.some((c) => c.key.startsWith('POST'))).toBe(false)
    await user.type(screen.getByLabelText('Tên giống'), 'Nấm mới')
    await user.type(screen.getByLabelText('Thời gian sinh trưởng (ngày)'), '45')
    await user.type(screen.getByLabelText('Nhiệt độ thấp nhất (°C)'), '22')
    await user.type(screen.getByLabelText('Nhiệt độ cao nhất (°C)'), '27,5')
    await user.type(screen.getByLabelText('Độ ẩm thấp nhất (%)'), '85')
    await user.type(screen.getByLabelText('Độ ẩm cao nhất (%)'), '95')
    await user.click(screen.getByRole('button', { name: 'Thêm giống' }))
    await waitFor(() => expect(sent(m, 'POST /api/core/varieties')).toEqual([{ name: 'Nấm mới', description: '', growthDays: 45, tempMin: 22, tempMax: 27.5, humMin: 85, humMax: 95 }]))
    await user.click(screen.getAllByRole('button', { name: 'Tắt giống' })[0])
    await waitFor(() => expect(sent(m, 'PATCH /api/core/varieties/v1')).toEqual([{ isActive: false }]))
  })

  it('tên trùng thì hiện lời của server', async () => {
    storedSession('ADMIN')
    mockApi({
      ...base,
      'GET /api/core/varieties/all': () => json([]),
      'POST /api/core/varieties': () => apiError(409, 'VARIETY_EXISTS', 'Đã có giống nấm trùng tên này'),
    })
    renderApp('/giong-nam')
    const user = userEvent.setup()
    expect(await screen.findByText(/Chưa có giống nào/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Tên giống'), 'Nấm A')
    await user.type(screen.getByLabelText('Thời gian sinh trưởng (ngày)'), '30')
    await user.type(screen.getByLabelText('Nhiệt độ thấp nhất (°C)'), '20')
    await user.type(screen.getByLabelText('Nhiệt độ cao nhất (°C)'), '28')
    await user.type(screen.getByLabelText('Độ ẩm thấp nhất (%)'), '80')
    await user.type(screen.getByLabelText('Độ ẩm cao nhất (%)'), '90')
    await user.click(screen.getByRole('button', { name: 'Thêm giống' }))
    expect(await screen.findByText(/Đã có giống nấm trùng tên này/)).toBeInTheDocument()
  })
})

describe('duyệt giống ở đợt nuôi', () => {
  const cy = (over: Record<string, unknown> = {}) => ({
    id: 'c1', rental_id: 'rt1', tray_id: 't1', stage: 'SEEDING', status: 'GROWING', variety: 'Nấm Lạ', variety_status: 'PENDING', variety_reject_reason: null,
    start_date: '2026-10-01', expected_harvest_date: null, harvested_at: null, weight_kg: null, discard_reason: null, note: null, tray_code: 'A-01',
    room_id: 'r1', customer_name: 'Khách Một', rental_status: 'ACTIVE', rental_end_date: '2026-11-01', ...over,
  })

  it('danh sách có nhãn Chờ duyệt và bộ lọc giống chờ duyệt gọi đúng tham số', async () => {
    storedSession('OPERATOR')
    const m = mockApi({ ...base, 'GET /api/core/cycles': () => json([cy()]) })
    renderApp('/dot-nuoi')
    expect(await screen.findByText('Chờ duyệt')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Giống chờ duyệt' }))
    await waitFor(() => expect(m.fn.mock.calls.some(([u]) => String(u).includes('varietyStatus=PENDING'))).toBe(true))
  })

  it('giống chờ duyệt: khóa nút chuyển giai đoạn, duyệt xong thì mở lại', async () => {
    storedSession('OPERATOR')
    let cur = { ...cy(), logs: [] }
    const m = mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json(cur),
      'POST /api/core/cycles/c1/variety/approve': () => { cur = { ...cy({ variety_status: 'APPROVED' }), logs: [] }; return json({ updated: 2, cycleIds: ['c1', 'c2'] }) },
    })
    renderApp('/dot-nuoi/c1')
    const user = userEvent.setup()
    expect(await screen.findByRole('heading', { name: /Giống chờ duyệt: Nấm Lạ/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chuyển sang Ủ tơ' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Duyệt giống' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chuyển sang Ủ tơ' })).toBeEnabled())
    expect(m.calls.filter((c) => c.key.endsWith('/variety/approve'))).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: /Giống chờ duyệt/ })).not.toBeInTheDocument()
  })

  it('từ chối bắt buộc có lý do và gửi đúng lý do', async () => {
    storedSession('OPERATOR')
    let cur = { ...cy(), logs: [] }
    const m = mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json(cur),
      'POST /api/core/cycles/c1/variety/reject': () => { cur = { ...cy({ variety_status: 'REJECTED', variety_reject_reason: 'Không hợp phòng' }), logs: [] }; return json({ updated: 1, cycleIds: ['c1'] }) },
    })
    renderApp('/dot-nuoi/c1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Từ chối...' }))
    expect(screen.getByRole('button', { name: 'Xác nhận từ chối' })).toBeDisabled()
    await user.type(screen.getByLabelText(/Lý do từ chối/), 'Không hợp phòng')
    await user.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }))
    expect(await screen.findByText(/đã bị từ chối: Không hợp phòng/)).toBeInTheDocument()
    expect(sent(m, 'POST /api/core/cycles/c1/variety/reject')).toEqual([{ reason: 'Không hợp phòng' }])
    expect(screen.getByRole('button', { name: 'Chuyển sang Ủ tơ' })).toBeDisabled()
  })

  it('duyệt và thêm vào danh mục: bắt nhập khoảng, gửi addToCatalog đúng số liệu', async () => {
    storedSession('OPERATOR')
    let cur = { ...cy(), logs: [] }
    const m = mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json(cur),
      'POST /api/core/cycles/c1/variety/approve': () => { cur = { ...cy({ variety_status: 'APPROVED' }), logs: [] }; return json({ updated: 2, cycleIds: ['c1', 'c2'], addedToCatalog: true }) },
    })
    renderApp('/dot-nuoi/c1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Duyệt và thêm vào danh mục...' }))
    await user.click(screen.getByRole('button', { name: 'Duyệt và thêm vào danh mục' }))
    expect(screen.getAllByText(/Nhập/).length).toBeGreaterThan(0)       // thiếu số liệu thì báo lỗi, chưa gọi API
    expect(m.calls.some((c) => c.key.endsWith('/variety/approve'))).toBe(false)
    await user.type(screen.getByLabelText('Thời gian sinh trưởng (ngày)'), '40')
    await user.type(screen.getByLabelText('Nhiệt độ thấp nhất (°C)'), '18')
    await user.type(screen.getByLabelText('Nhiệt độ cao nhất (°C)'), '26,5')
    await user.type(screen.getByLabelText('Độ ẩm thấp nhất (%)'), '85')
    await user.type(screen.getByLabelText('Độ ẩm cao nhất (%)'), '95')
    await user.click(screen.getByRole('button', { name: 'Duyệt và thêm vào danh mục' }))
    await waitFor(() => expect(sent(m, 'POST /api/core/cycles/c1/variety/approve')).toEqual([{ addToCatalog: { growthDays: 40, tempMin: 18, tempMax: 26.5, humMin: 85, humMax: 95, description: '' } }]))
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Giống chờ duyệt/ })).not.toBeInTheDocument())
  })

  it('duyệt thường không gửi khoảng', async () => {
    storedSession('OPERATOR')
    const m = mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json({ ...cy(), logs: [] }),
      'POST /api/core/cycles/c1/variety/approve': () => json({ updated: 1, cycleIds: ['c1'], addedToCatalog: false }),
    })
    renderApp('/dot-nuoi/c1')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Duyệt giống' }))
    await waitFor(() => expect(m.calls.some((c) => c.key.endsWith('/variety/approve'))).toBe(true))
    expect(m.calls.find((c) => c.key.endsWith('/variety/approve'))?.init?.body).toBeUndefined()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { apiError, json, mockApi, renderApp, storedSession } from '../test/helpers'

const ROOMS = [{ id: 'r1', name: 'Phòng A', status: 'ACTIVE' }]
const cy = (over: Record<string, unknown> = {}) => ({
  id: 'c1', rental_id: 'rt1', tray_id: 't1', stage: 'SEEDING', status: 'GROWING', variety: null, start_date: '2026-10-01',
  expected_harvest_date: null, harvested_at: null, weight_kg: null, discard_reason: null, note: null, tray_code: 'A-01', room_id: 'r1',
  customer_name: 'Khách Một', rental_status: 'ACTIVE', rental_end_date: '2026-11-01', ...over,
})
const base = { 'GET /api/core/notifications': () => json([]), 'GET /api/core/rooms': () => json(ROOMS) }

describe('danh sách đợt nuôi', () => {
  it('hiện khay kèm khách, giai đoạn, hạn thuê và nhãn hết hạn; đổi tab gọi lại với trạng thái mới', async () => {
    storedSession('OPERATOR')
    const m = mockApi({
      ...base,
      'GET /api/core/cycles': () => json([cy({ stage: 'FRUITING', variety: 'Sò', rental_status: 'EXPIRED' })]),
    })
    renderApp('/dot-nuoi')
    const row = (await screen.findByRole('link', { name: 'A-01' })).closest('tr')!
    expect(within(row).getByText('Khách Một')).toBeInTheDocument()
    expect(within(row).getByText('Ra quả thể')).toBeInTheDocument()
    expect(within(row).getByText('01/11/2026')).toBeInTheDocument()
    expect(within(row).getByText('Đã hết hạn')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Đã thu hoạch' }))
    await waitFor(() => expect(m.fn.mock.calls.some(([u]) => String(u).includes('status=HARVESTED'))).toBe(true))
  })

  it('trống thì giải thích khi nào có dữ liệu', async () => {
    storedSession('OPERATOR')
    mockApi({ ...base, 'GET /api/core/cycles': () => json([]) })
    renderApp('/dot-nuoi')
    expect(await screen.findByText(/Chưa có khay nào đang nuôi/)).toBeInTheDocument()
  })
})

describe('chi tiết đợt nuôi', () => {
  const detail = (over = {}) => ({ ...cy(over), logs: [{ from_stage: 'SEEDING', to_stage: 'INCUBATING', note: 'ổn', created_at: '2026-10-05T03:00:00Z' }] })

  it('chuyển sang giai đoạn kế tiếp gửi đúng PATCH và tải lại', async () => {
    storedSession('OPERATOR')
    let cur = detail()
    const m = mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json(cur),
      'PATCH /api/core/cycles/c1': () => { cur = detail({ stage: 'INCUBATING' }); return json(cy({ stage: 'INCUBATING' })) },
    })
    renderApp('/dot-nuoi/c1')
    const user = userEvent.setup()
    expect(await screen.findByRole('heading', { name: 'Khay A-01' })).toBeInTheDocument()
    expect(screen.getByText(/Chỉ thu hoạch được khi khay đã ra quả thể/)).toBeInTheDocument()     // chưa tới giai đoạn thu hoạch
    await user.type(screen.getByLabelText(/Ghi chú \(không bắt buộc\)/), 'đã ủ')
    await user.click(screen.getByRole('button', { name: 'Chuyển sang Ủ tơ' }))
    expect(await screen.findByRole('button', { name: 'Chuyển sang Ra quả thể' })).toBeInTheDocument()
    expect(JSON.parse(String(m.calls.find((c) => c.key.startsWith('PATCH'))!.init?.body))).toEqual({ stage: 'INCUBATING', note: 'đã ủ' })
  })

  it('thu hoạch: kiểm khối lượng trước khi gửi, gửi đúng số, rồi hết form thao tác', async () => {
    storedSession('OPERATOR')
    let cur = detail({ stage: 'FRUITING' })
    const m = mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json(cur),
      'POST /api/core/cycles/c1/harvest': () => { cur = detail({ stage: 'FRUITING', status: 'HARVESTED', weight_kg: 1.5, harvested_at: '2026-10-20' }); return json(cur) },
    })
    renderApp('/dot-nuoi/c1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Ghi nhận thu hoạch' }))
    expect(screen.getByText(/lớn hơn 0 và không quá 1000/)).toBeInTheDocument()
    expect(m.calls.some((c) => c.key.startsWith('POST'))).toBe(false)
    await user.type(screen.getByLabelText('Khối lượng (kg)'), '1,5')
    await user.click(screen.getByRole('button', { name: 'Ghi nhận thu hoạch' }))
    expect(await screen.findByText('Đã thu hoạch', { selector: 'span' })).toBeInTheDocument()
    expect(JSON.parse(String(m.calls.find((c) => c.key.startsWith('POST'))!.init?.body))).toEqual({ weightKg: 1.5 })
    expect(screen.queryByRole('button', { name: 'Ghi nhận thu hoạch' })).not.toBeInTheDocument()
  })

  it('loại bỏ cần lý do rồi xác nhận lần hai; hủy thì không gửi', async () => {
    storedSession('OPERATOR')
    const m = mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json(detail()),
      'POST /api/core/cycles/c1/discard': () => json(cy({ status: 'DISCARDED' })),
    })
    renderApp('/dot-nuoi/c1')
    const user = userEvent.setup()
    const open = await screen.findByRole('button', { name: 'Loại bỏ...' })
    expect(open).toBeDisabled()                                                                  // chưa có lý do
    await user.type(screen.getByLabelText('Lý do'), 'nấm mốc')
    await user.click(open)
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(m.calls.some((c) => c.key.startsWith('POST'))).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Loại bỏ...' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận loại bỏ' }))
    await waitFor(() => expect(m.calls.some((c) => c.key === 'POST /api/core/cycles/c1/discard')).toBe(true))
    expect(JSON.parse(String(m.calls.find((c) => c.key.endsWith('/discard'))!.init?.body))).toEqual({ reason: 'nấm mốc' })
  })

  it('lỗi từ server (409) hiện ngay tại chỗ; đơn hết hạn có lời nhắc; id lạ báo không tìm thấy', async () => {
    storedSession('OPERATOR')
    mockApi({
      ...base,
      'GET /api/core/cycles/c1': () => json(detail({ rental_status: 'EXPIRED' })),
      'PATCH /api/core/cycles/c1': () => apiError(409, 'CYCLE_NOT_GROWING', 'Đợt nuôi đã kết thúc (thu hoạch hoặc loại bỏ)'),
      'GET /api/core/cycles/zz': () => apiError(404, 'CYCLE_NOT_FOUND', 'x'),
    })
    renderApp('/dot-nuoi/c1')
    expect(await screen.findByText(/Đơn thuê đã hết hạn/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Chuyển sang Ủ tơ' }))
    expect(await screen.findByText(/Đợt nuôi đã kết thúc/)).toBeInTheDocument()
  })

  it('id lạ báo không tìm thấy', async () => {
    storedSession('OPERATOR')
    mockApi({ ...base, 'GET /api/core/cycles/zz': () => apiError(404, 'CYCLE_NOT_FOUND', 'x') })
    renderApp('/dot-nuoi/zz')
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy đợt nuôi' })).toBeInTheDocument()
  })
})

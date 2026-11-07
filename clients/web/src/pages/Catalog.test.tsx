import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { apiError, json, mockApi, renderApp, storedSession } from '../test/helpers'

const ROOMS = [{ id: 'r1', name: 'Phòng A', status: 'ACTIVE' }, { id: 'r2', name: 'Phòng cũ', status: 'INACTIVE' }]
const tray = (id: string, code: string, occ = 'AVAILABLE', room = 'r1') => ({ id, tray_code: code, room_id: room, location_row: 1, location_shelf: 2, location_slot: 3, occupancy_status: occ })
const base = { 'GET /api/core/notifications': () => json([]), 'GET /api/core/rooms': () => json(ROOMS), 'GET /api/core/trays': () => json([tray('t1', 'A-01', 'RENTED'), tray('t2', 'A-02')]) }
const sent = (m: ReturnType<typeof mockApi>, key: string) => m.calls.filter((c) => c.key === key).map((c) => JSON.parse(String(c.init?.body ?? 'null')))

describe('quyền truy cập', () => {
  it('Operator vào thẳng /danh-muc thì thấy "Không đủ quyền", không gọi API danh mục', async () => {
    storedSession('OPERATOR')
    const m = mockApi({ ...base })
    renderApp('/danh-muc')
    expect(await screen.findByRole('heading', { name: 'Không đủ quyền' })).toBeInTheDocument()
    expect(m.calls.some((c) => c.key.includes('packages'))).toBe(false)
  })
})

describe('phòng', () => {
  it('thêm phòng kiểm tên; hiện số khay đang thuê; ngừng phòng bị từ chối thì hiện lời server', async () => {
    storedSession('ADMIN')
    const m = mockApi({
      ...base,
      'POST /api/core/rooms': () => json({ id: 'r9' }, 201),
      'PATCH /api/core/rooms/r1': () => apiError(409, 'ROOM_HAS_RENTED_TRAYS', 'Phòng còn 1 khay đang được thuê, không thể ngừng'),
    })
    renderApp('/danh-muc')
    const user = userEvent.setup()
    expect(await screen.findByText('1/2 khay đang thuê')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thêm phòng' }))
    expect(screen.getByText('Nhập tên phòng.')).toBeInTheDocument()
    expect(m.calls.some((c) => c.key.startsWith('POST'))).toBe(false)
    await user.type(screen.getByLabelText('Tên phòng'), '  Phòng mới ')
    await user.click(screen.getByRole('button', { name: 'Thêm phòng' }))
    await waitFor(() => expect(sent(m, 'POST /api/core/rooms')).toEqual([{ name: 'Phòng mới' }]))
    await user.click(screen.getAllByRole('button', { name: 'Ngừng phòng' })[0])
    expect(await screen.findByText(/Phòng còn 1 khay đang được thuê/)).toBeInTheDocument()
  })
})

describe('khay', () => {
  it('thêm hàng loạt: sinh mã, ô tăng dần; lỗi ở khay giữa chừng thì dừng và báo đã tạo bao nhiêu', async () => {
    storedSession('ADMIN')
    let n = 0
    const m = mockApi({
      ...base,
      'POST /api/core/trays': () => (++n === 3 ? apiError(409, 'TRAY_CODE_EXISTS', 'Mã khay đã tồn tại') : json({ id: `n${n}` }, 201)),
    })
    renderApp('/danh-muc')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Khay' }))
    await user.click(screen.getByRole('button', { name: 'Thêm khay' }))
    expect(screen.getByText('Chọn phòng đặt khay.')).toBeInTheDocument()
    expect(screen.getByText('Nhập mã khay.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Phòng', { selector: '#t-room' }), 'r1')
    await user.type(screen.getByLabelText('Mã khay (hoặc tiền tố)'), 'K1')
    await user.clear(screen.getByLabelText('Số lượng'))
    await user.type(screen.getByLabelText('Số lượng'), '4')
    await user.clear(screen.getByLabelText('Ô (bắt đầu từ)'))
    await user.type(screen.getByLabelText('Ô (bắt đầu từ)'), '5')
    await user.click(screen.getByRole('button', { name: 'Thêm khay' }))
    expect(await screen.findByText(/Đã thêm 2\/4 khay, dừng ở K1-03: Mã khay đã tồn tại/)).toBeInTheDocument()
    expect(sent(m, 'POST /api/core/trays').map((b) => [b.trayCode, b.slot])).toEqual([['K1-01', 5], ['K1-02', 6], ['K1-03', 7]])
  })

  it('khay đang thuê không đổi phòng được; xóa cần xác nhận và hiện lý do khi bị từ chối', async () => {
    storedSession('ADMIN')
    mockApi({
      ...base,
      'DELETE /api/core/trays/t1': () => apiError(409, 'TRAY_HAS_HISTORY', 'Khay đã từng được thuê, không thể xóa'),
    })
    renderApp('/danh-muc')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Khay' }))
    await user.click(await screen.findByRole('button', { name: 'Sửa khay A-01' }))
    expect(screen.getByLabelText('Phòng', { selector: 'select[id^="r-"]' })).toBeDisabled()
    expect(screen.getByText(/đang được thuê nên chưa chuyển phòng được/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    await user.click(screen.getByRole('button', { name: 'Xóa khay A-01' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
    expect(await screen.findByText(/Khay đã từng được thuê, không thể xóa/)).toBeInTheDocument()
  })
})

describe('gói thuê', () => {
  const PK = [{ id: 'p1', name: 'Gói 30 ngày', duration_days: 30, price_per_tray: 50000, is_active: true }, { id: 'p2', name: 'Gói cũ', duration_days: 90, price_per_tray: 0, is_active: false }]

  it('liệt kê cả gói đã tắt, kiểm form, gửi giá đã chuẩn hóa, bật/tắt gói', async () => {
    storedSession('ADMIN')
    const m = mockApi({
      ...base,
      'GET /api/core/packages/all': () => json(PK),
      'POST /api/core/packages': () => json({ id: 'p9' }, 201),
      'PATCH /api/core/packages/p1': () => json(PK[0]),
    })
    renderApp('/danh-muc')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Gói thuê' }))
    expect(await screen.findByText('Gói cũ')).toBeInTheDocument()
    expect(screen.getByText('Đã tắt')).toBeInTheDocument()
    expect(screen.getByText(/50\.000/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thêm gói' }))
    expect(screen.getByText('Nhập tên gói.')).toBeInTheDocument()
    expect(screen.getByText(/Nhập giá từ 0 trở lên/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Tên gói'), 'Gói 60')
    await user.clear(screen.getByLabelText('Thời hạn (ngày)'))
    await user.type(screen.getByLabelText('Thời hạn (ngày)'), '60')
    await user.type(screen.getByLabelText('Giá mỗi khay (đ)'), '90.000')
    await user.click(screen.getByRole('button', { name: 'Thêm gói' }))
    await waitFor(() => expect(sent(m, 'POST /api/core/packages')).toEqual([{ name: 'Gói 60', durationDays: 60, pricePerTray: 90000 }]))
    await user.click(screen.getAllByRole('button', { name: 'Tắt gói' })[0])
    await waitFor(() => expect(sent(m, 'PATCH /api/core/packages/p1')).toEqual([{ isActive: false }]))
  })
})

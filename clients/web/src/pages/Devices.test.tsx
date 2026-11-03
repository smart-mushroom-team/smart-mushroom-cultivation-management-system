import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { parseInterval } from '../lib/device'
import { apiError, json, mockApi, renderApp, storedSession } from '../test/helpers'

const ROOMS = [{ id: 'r1', name: 'Phòng A', status: 'ACTIVE' }, { id: 'r2', name: 'Phòng cũ', status: 'INACTIVE' }]
const dev = (over: Record<string, unknown> = {}) => ({ id: 'd1', name: 'Cảm biến A', type: 'SENSOR_NODE', roomId: 'r1', status: 'ACTIVE', isSimulated: false, intervalSec: 30, online: true, lastSeenAt: new Date().toISOString(), ...over })
const base = { 'GET /api/core/notifications': () => json([]), 'GET /api/core/rooms': () => json(ROOMS) }
const body = (m: ReturnType<typeof mockApi>, key: string) => JSON.parse(String(m.calls.find((c) => c.key === key)!.init?.body))

describe('parseInterval', () => {
  it('số nguyên 5–3600', () => {
    expect(parseInterval('30')).toBe(30)
    for (const bad of ['', '4', '3601', '1.5', 'abc']) expect(parseInterval(bad)).toBeNull()
    expect(parseInterval('5')).toBe(5)
  })
})

describe('trang thiết bị', () => {
  it('liệt kê kèm trạng thái bằng chữ: trực tuyến, mất kết nối, đã tắt, chưa gửi', async () => {
    storedSession('OPERATOR')
    mockApi({
      ...base,
      'GET /api/monitoring/devices': () => json([
        dev(),
        dev({ id: 'd2', name: 'Camera A', type: 'CAMERA', online: false, lastSeenAt: '2026-10-01T00:00:00Z', isSimulated: true }),
        dev({ id: 'd3', name: 'Tắt', status: 'INACTIVE' }),
        dev({ id: 'd4', name: 'Mới', lastSeenAt: null, online: false }),
      ]),
    })
    renderApp('/thiet-bi')
    expect(await screen.findByText(/Trực tuyến/)).toBeInTheDocument()
    expect(screen.getByText(/Mất kết nối/)).toBeInTheDocument()
    expect(screen.getByText('Đã tắt')).toBeInTheDocument()
    expect(screen.getByText('Chưa gửi dữ liệu lần nào')).toBeInTheDocument()
    expect(screen.getByText('Mô phỏng')).toBeInTheDocument()
  })

  it('tạo thiết bị: kiểm form, chỉ phòng đang hoạt động, hiện khóa một lần, ẩn đi thì không còn trong trang hay localStorage', async () => {
    storedSession('OPERATOR')
    const m = mockApi({
      ...base,
      'GET /api/monitoring/devices': () => json([]),
      'POST /api/monitoring/devices': () => json({ id: 'd9', apiKey: 'mk_SECRET-KEY-123', note: 'x' }, 201),
    })
    renderApp('/thiet-bi')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị' }))
    expect(screen.queryByRole('option', { name: 'Phòng cũ' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tạo thiết bị' }))
    expect(screen.getByText('Nhập tên để phân biệt thiết bị.')).toBeInTheDocument()
    expect(screen.getByText('Chọn phòng đặt thiết bị.')).toBeInTheDocument()
    expect(m.calls.some((c) => c.key.startsWith('POST'))).toBe(false)

    await user.type(screen.getByLabelText('Tên thiết bị'), '  Cảm biến mới ')
    await user.selectOptions(screen.getByLabelText('Phòng'), 'r1')
    await user.clear(screen.getByLabelText('Chu kỳ gửi (giây)'))
    await user.type(screen.getByLabelText('Chu kỳ gửi (giây)'), '2')
    await user.click(screen.getByRole('button', { name: 'Tạo thiết bị' }))
    expect(screen.getByText('Nhập số nguyên từ 5 đến 3600.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Chu kỳ gửi (giây)'))
    await user.type(screen.getByLabelText('Chu kỳ gửi (giây)'), '60')
    await user.click(screen.getByRole('button', { name: 'Tạo thiết bị' }))

    expect(await screen.findByTestId('api-key')).toHaveTextContent('mk_SECRET-KEY-123')
    expect(body(m, 'POST /api/monitoring/devices')).toEqual({ name: 'Cảm biến mới', type: 'SENSOR_NODE', roomId: 'r1', intervalSec: 60, isSimulated: false })
    expect(JSON.stringify({ ...localStorage })).not.toContain('SECRET-KEY')                       // khóa không được lưu lại ở đâu
    await user.click(screen.getByRole('button', { name: 'Đã lưu khóa, ẩn đi' }))
    expect(screen.queryByText(/SECRET-KEY/)).not.toBeInTheDocument()
  })

  it('409 trùng loại trong phòng: hiện thông báo của server, form giữ nguyên để sửa', async () => {
    storedSession('OPERATOR')
    mockApi({
      ...base,
      'GET /api/monitoring/devices': () => json([]),
      'POST /api/monitoring/devices': () => apiError(409, 'DEVICE_EXISTS_IN_ROOM', 'Phòng này đã có thiết bị cùng loại đang hoạt động'),
    })
    renderApp('/thiet-bi')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Thêm thiết bị' }))
    await user.type(screen.getByLabelText('Tên thiết bị'), 'X')
    await user.selectOptions(screen.getByLabelText('Phòng'), 'r1')
    await user.click(screen.getByRole('button', { name: 'Tạo thiết bị' }))
    expect(await screen.findByText(/đã có thiết bị cùng loại/)).toBeInTheDocument()
    expect(screen.getByLabelText('Tên thiết bị')).toHaveValue('X')
  })

  it('sửa tên và chu kỳ gửi PATCH đúng; tắt thiết bị gửi status', async () => {
    storedSession('OPERATOR')
    const m = mockApi({
      ...base,
      'GET /api/monitoring/devices': () => json([dev()]),
      'PATCH /api/monitoring/devices/d1': () => json(dev()),
    })
    renderApp('/thiet-bi')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sửa' }))
    await user.clear(screen.getByLabelText('Tên'))
    await user.type(screen.getByLabelText('Tên'), 'Đổi tên')
    await user.clear(screen.getByLabelText('Chu kỳ gửi (giây)'))
    await user.type(screen.getByLabelText('Chu kỳ gửi (giây)'), '10')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(m.calls.some((c) => c.key === 'PATCH /api/monitoring/devices/d1')).toBe(true))
    expect(body(m, 'PATCH /api/monitoring/devices/d1')).toEqual({ name: 'Đổi tên', intervalSec: 10 })
    await user.click(await screen.findByRole('button', { name: 'Tắt thiết bị' }))
    await waitFor(() => expect(m.calls.filter((c) => c.key.startsWith('PATCH')).length).toBe(2))
    expect(JSON.parse(String(m.calls.filter((c) => c.key.startsWith('PATCH'))[1].init?.body))).toEqual({ status: 'INACTIVE' })
  })

  it('đổi khóa cần xác nhận; hủy thì không gọi; xác nhận thì hiện khóa mới', async () => {
    storedSession('OPERATOR')
    const m = mockApi({
      ...base,
      'GET /api/monitoring/devices': () => json([dev()]),
      'POST /api/monitoring/devices/d1/rotate-key': () => json({ id: 'd1', apiKey: 'mk_NEW-KEY' }),
    })
    renderApp('/thiet-bi')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Đổi khóa API' }))
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(m.calls.some((c) => c.key.startsWith('POST'))).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Đổi khóa API' }))
    await user.click(within(screen.getByRole('group', { name: 'Xác nhận đổi khóa' })).getByRole('button', { name: 'Đổi khóa' }))
    expect(await screen.findByTestId('api-key')).toHaveTextContent('mk_NEW-KEY')
    expect(screen.getByText(/Khóa cũ đã hết hiệu lực/)).toBeInTheDocument()
  })
})

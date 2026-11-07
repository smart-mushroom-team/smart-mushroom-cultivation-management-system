import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { apiError, json, mockApi, renderApp, storedSession } from '../test/helpers'

const u = (id: string, name: string, role: string, status = 'ACTIVE') => ({ id, name, email: `${id}@x.vn`, role, status, created_at: '2026-10-01T03:00:00Z' })
const USERS = [u('u1', 'Tôi Admin', 'ADMIN'), u('u2', 'Bình Operator', 'OPERATOR'), u('u3', 'Chi Khách', 'CUSTOMER', 'INACTIVE')]
const base = { 'GET /api/core/notifications': () => json([]) }
const bodies = (m: ReturnType<typeof mockApi>, key: string) => m.calls.filter((c) => c.key === key).map((c) => JSON.parse(String(c.init?.body ?? 'null')))

describe('người dùng', () => {
  it('Operator vào thẳng /nguoi-dung thì bị chặn', async () => {
    storedSession('OPERATOR')
    mockApi({ ...base })
    renderApp('/nguoi-dung')
    expect(await screen.findByRole('heading', { name: 'Không đủ quyền' })).toBeInTheDocument()
  })

  it('liệt kê, lọc theo vai trò và từ khóa, tài khoản của mình không khóa được', async () => {
    storedSession('ADMIN')
    mockApi({ ...base, 'GET /api/identity/users': () => json(USERS) })
    renderApp('/nguoi-dung')
    const user = userEvent.setup()
    expect(await screen.findByText('Tôi Admin')).toBeInTheDocument()
    expect(screen.getByText('Bạn')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Khóa Tôi Admin' })).toBeDisabled()
    expect(screen.getByText('Đã khóa')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Vai trò'), 'OPERATOR')
    expect(screen.queryByText('Tôi Admin')).not.toBeInTheDocument()
    expect(screen.getByText('Bình Operator')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Vai trò'), '')
    await user.type(screen.getByLabelText('Tìm'), 'u3@')
    expect(screen.getByText('Chi Khách')).toBeInTheDocument()
    expect(screen.queryByText('Bình Operator')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Tìm'))
    await user.type(screen.getByLabelText('Tìm'), 'không có ai')
    expect(screen.getByText(/Không có người dùng nào khớp/)).toBeInTheDocument()
  })

  it('tạo Operator: kiểm form, gửi đã cắt khoảng trắng, 409 trùng email hiện lời server', async () => {
    storedSession('ADMIN')
    let taken = true
    const m = mockApi({
      ...base,
      'GET /api/identity/users': () => json(USERS),
      'POST /api/identity/users/operators': () => (taken ? apiError(409, 'EMAIL_EXISTS', 'Email đã tồn tại') : json({ id: 'u9' }, 201)),
    })
    renderApp('/nguoi-dung')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Thêm Operator' }))
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    expect(screen.getByText('Nhập họ tên.')).toBeInTheDocument()
    expect(screen.getByText(/Nhập email hợp lệ/)).toBeInTheDocument()
    expect(screen.getByText(/ít nhất 8 ký tự\./)).toBeInTheDocument()
    expect(bodies(m, 'POST /api/identity/users/operators')).toHaveLength(0)
    await user.type(screen.getByLabelText('Họ tên'), ' Nhân Viên ')
    await user.type(screen.getByLabelText('Email'), ' nv@x.vn ')
    await user.type(screen.getByLabelText('Mật khẩu tạm'), 'matkhau-dai')
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    expect(await screen.findByText(/Email đã tồn tại/)).toBeInTheDocument()
    expect(screen.getByLabelText('Họ tên')).toHaveValue(' Nhân Viên ')                      // giữ nguyên để sửa
    taken = false
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Tạo tài khoản' })).not.toBeInTheDocument())
    expect(bodies(m, 'POST /api/identity/users/operators').at(-1)).toEqual({ name: 'Nhân Viên', email: 'nv@x.vn', password: 'matkhau-dai' })
  })

  it('khóa cần xác nhận và nói rõ phiên đang mở còn dùng được; mở lại thì gọi activate ngay', async () => {
    storedSession('ADMIN')
    const m = mockApi({
      ...base,
      'GET /api/identity/users': () => json(USERS),
      'POST /api/identity/users/u2/deactivate': () => json({ id: 'u2', status: 'INACTIVE' }),
      'POST /api/identity/users/u3/activate': () => json({ id: 'u3', status: 'ACTIVE' }),
    })
    renderApp('/nguoi-dung')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Khóa Bình Operator' }))
    const g = screen.getByRole('group', { name: 'Xác nhận khóa Bình Operator' })
    expect(within(g).getByText(/Phiên đang mở vẫn dùng được/)).toBeInTheDocument()
    await user.click(within(g).getByRole('button', { name: 'Hủy' }))
    expect(m.calls.some((c) => c.key.includes('deactivate'))).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Khóa Bình Operator' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận khóa' }))
    await waitFor(() => expect(m.calls.some((c) => c.key === 'POST /api/identity/users/u2/deactivate')).toBe(true))
    await user.click(screen.getByRole('button', { name: 'Mở lại Chi Khách' }))
    await waitFor(() => expect(m.calls.some((c) => c.key === 'POST /api/identity/users/u3/activate')).toBe(true))
  })
})

describe('chế độ demo', () => {
  it('đang tắt thì giải thích cách bật và không có nút thao tác', async () => {
    storedSession('ADMIN')
    mockApi({ ...base, 'GET /api/core/demo/status': () => json({ enabled: false, today: '2026-10-31', demoDate: null }) })
    renderApp('/demo')
    expect(await screen.findByText(/DEMO_MODE=true/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ngày/ })).not.toBeInTheDocument()
  })

  it('đặt ngày: +7 ngày tính từ hôm nay của hệ thống, ngày cụ thể, về ngày thật', async () => {
    storedSession('ADMIN')
    let st = { enabled: true, today: '2026-10-31', demoDate: null as string | null }
    const m: ReturnType<typeof mockApi> = mockApi({
      ...base,
      'GET /api/core/demo/status': () => json(st),
      'PUT /api/core/demo/date': async () => {
        const d = bodies(m, 'PUT /api/core/demo/date').at(-1)?.date as string | null
        st = d ? { enabled: true, today: d, demoDate: d } : { enabled: true, today: '2026-10-31', demoDate: null }
        return json({ today: st.today })
      },
    })
    renderApp('/demo')
    const user = userEvent.setup()
    expect(await screen.findByTestId('today')).toHaveTextContent('31/10/2026')
    expect(screen.getByRole('button', { name: 'Về ngày thật' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '+7 ngày' }))
    await waitFor(() => expect(bodies(m, 'PUT /api/core/demo/date')).toEqual([{ date: '2026-11-07' }]))
    expect(await screen.findByText('Đang dùng ngày giả lập.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Về ngày thật' }))
    await waitFor(() => expect(bodies(m, 'PUT /api/core/demo/date').at(-1)).toEqual({ date: null }))
    expect(screen.getByRole('button', { name: 'Đặt ngày' })).toBeDisabled()                  // chưa chọn ngày
  })

  it('chạy job hết hạn cần xác nhận, hiện kết quả; lỗi từng đơn được báo', async () => {
    storedSession('ADMIN')
    const m = mockApi({
      ...base,
      'GET /api/core/demo/status': () => json({ enabled: true, today: '2026-10-31', demoDate: null }),
      'POST /api/core/demo/run-expiry': () => json({ expired: 2, completed: 1, errors: 1 }),
    })
    renderApp('/demo')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Chạy job...' }))
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(m.calls.some((c) => c.key.includes('run-expiry'))).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Chạy job...' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận chạy' }))
    expect(await screen.findByText(/2 đơn hết hạn, 1 đơn hoàn tất, 1 đơn lỗi/)).toBeInTheDocument()
  })
})

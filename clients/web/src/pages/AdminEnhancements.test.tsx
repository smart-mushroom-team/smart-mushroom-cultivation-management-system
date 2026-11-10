import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockApi, renderApp, storedSession } from '../test/helpers'

const u = (n: number) => ({ id: `u${n}`, name: `Người ${n}`, email: `u${n}@x.vn`, role: n === 1 ? 'ADMIN' : 'CUSTOMER', status: n % 2 ? 'ACTIVE' : 'INACTIVE', created_at: '2026-10-01T00:00:00Z' })

describe('Admin nâng cấp', () => {
  it('lọc trạng thái và phân trang 10 user', async () => {
    storedSession('ADMIN')
    mockApi({ 'GET /api/identity/users': () => json(Array.from({ length: 23 }, (_, i) => u(i + 1))) })
    renderApp('/nguoi-dung')
    const user = userEvent.setup()
    expect(await screen.findByText('Người 1')).toBeInTheDocument()
    expect(screen.queryByText('Người 11')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sau' }))
    expect(screen.getByText('Người 11')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'INACTIVE')
    expect(screen.getByText('Người 2')).toBeInTheDocument()
    expect(screen.queryByText('Người 1')).not.toBeInTheDocument()
  })

  it('tạo Admin mới qua API riêng', async () => {
    storedSession('ADMIN')
    const m = mockApi({ 'GET /api/identity/users': () => json([u(1)]), 'POST /api/identity/users/admins': () => json({ id: 'new' }, 201) })
    renderApp('/nguoi-dung')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Thêm Admin' }))
    await user.type(screen.getByLabelText('Họ tên'), 'Admin mới')
    await user.type(screen.getByLabelText('Email'), 'admin2@x.vn')
    await user.type(screen.getByLabelText('Mật khẩu tạm'), 'pass-123456')
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    await waitFor(() => expect(m.calls.some((c) => c.key === 'POST /api/identity/users/admins')).toBe(true))
  })

  it('lọc thông báo theo loại, API có phân trang', async () => {
    storedSession('ADMIN')
    const m = mockApi({
      'GET /api/core/notifications/page': () => json({ items: [], total: 0, page: 1, limit: 10 }),
      'GET /api/core/rooms': () => json([]),
      'GET /api/core/notifications': () => json([]),
    })
    renderApp('/thong-bao')
    const user = userEvent.setup()
    const filter = await screen.findByLabelText('Loại thông báo')
    await user.selectOptions(filter, 'DEVICE_OFFLINE')
    await waitFor(() => expect(m.calls.some((c) => c.key.includes('/api/core/notifications/page?') && c.key.includes('type=DEVICE_OFFLINE'))).toBe(true))
  })
})

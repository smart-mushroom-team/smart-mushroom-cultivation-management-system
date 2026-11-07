import type { UserRole } from '../api/users'

export const ROLE_LABEL: Record<UserRole, string> = { ADMIN: 'Admin', OPERATOR: 'Operator', CUSTOMER: 'Khách hàng' }

export type OperatorErrors = Partial<Record<'name' | 'email' | 'password', string>>

/** Kiểm giống backend (tên, email có @ và dấu chấm ở tên miền, mật khẩu 8–128 ký tự) để báo lỗi ngay tại form. */
export function validateOperator(f: { name: string; email: string; password: string }): OperatorErrors {
  const e: OperatorErrors = {}
  if (!f.name.trim()) e.name = 'Nhập họ tên.'
  const email = f.email.trim()
  const [local, , domain] = [email.split('@')[0], '@', email.split('@')[1] ?? '']
  if (!email || !local || !domain.includes('.') || email.includes(' ') || email.split('@').length !== 2) e.email = 'Nhập email hợp lệ, ví dụ ten@congty.vn.'
  if (f.password.length < 8) e.password = 'Mật khẩu cần ít nhất 8 ký tự.'
  else if (f.password.length > 128) e.password = 'Mật khẩu tối đa 128 ký tự.'
  return e
}

/** Lọc theo vai trò và theo chữ gõ vào (tên hoặc email, không phân biệt hoa thường). */
export function filterUsers<T extends { name: string; email: string; role: string }>(users: T[], role: string, q: string): T[] {
  const needle = q.trim().toLowerCase()
  return users.filter((u) => (!role || u.role === role) && (!needle || u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)))
}

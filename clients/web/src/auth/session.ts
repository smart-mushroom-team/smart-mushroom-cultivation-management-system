import type { LoginResult, Role } from '../api/auth'

export type Session = { token: string; role: Role; name: string; expiresAt: number }

const KEY = 'mushroom.session'

/** Web này chỉ dành cho nhân viên. Customer dùng ứng dụng di động. */
export const STAFF: Role[] = ['ADMIN', 'OPERATOR']
export const isStaff = (role: string): role is 'ADMIN' | 'OPERATOR' => STAFF.includes(role as Role)

/** Đọc `exp` (giây) trong payload của JWT; không kiểm chữ ký (việc đó là của server), chỉ để biết khi nào token hết hạn. */
export function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = JSON.parse(json).exp
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

/** Đọc `sub` (id người dùng) trong JWT, để giao diện biết "đây là tài khoản của tôi". */
export function decodeJwtSub(token: string): string | null {
  try {
    const sub = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub
    return typeof sub === 'string' ? sub : null
  } catch {
    return null
  }
}

export function sessionFrom(r: LoginResult, now = Date.now()): Session {
  const exp = decodeJwtExp(r.accessToken)
  return { token: r.accessToken, role: r.role, name: r.name, expiresAt: exp ? exp * 1000 : now + r.expiresIn * 1000 }
}

export const isExpired = (s: Session, now = Date.now()) => s.expiresAt <= now

export function saveSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* chế độ riêng tư hoặc đầy bộ nhớ: vẫn dùng được trong phiên hiện tại */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* bỏ qua */
  }
}

export function loadSession(now = Date.now()): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    const ok = typeof s.token === 'string' && typeof s.expiresAt === 'number' && typeof s.name === 'string' && isStaff(s.role)
    if (!ok || isExpired(s, now)) {
      clearSession()
      return null
    }
    return s
  } catch {
    return null
  }
}

export const SESSION_KEY = KEY

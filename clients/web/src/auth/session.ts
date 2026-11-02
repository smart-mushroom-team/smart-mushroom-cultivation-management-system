import type { LoginResult, Role } from '../api/auth'
export type Session = { token: string; role: Exclude<Role, 'CUSTOMER'>; name: string; expiresAt: number }
export const SESSION_KEY = 'mushroom.session'
export const isStaff = (role: Role): role is Session['role'] => role === 'ADMIN' || role === 'OPERATOR'
function decodeJwtExp(token: string) { try { const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: unknown }; return typeof payload.exp === 'number' ? payload.exp * 1000 : null } catch { return null } }
export function sessionFrom(result: LoginResult, now = Date.now()): Session { return { token: result.accessToken, role: result.role as Session['role'], name: result.name, expiresAt: decodeJwtExp(result.accessToken) ?? now + result.expiresIn * 1000 } }
export function saveSession(session: Session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) }
export function clearSession() { localStorage.removeItem(SESSION_KEY) }
export function loadSession(now = Date.now()): Session | null { try { const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<Session> | null; if (!value || typeof value.token !== 'string' || typeof value.name !== 'string' || !isStaff(value.role as Role) || typeof value.expiresAt !== 'number' || value.expiresAt <= now) { clearSession(); return null }; return value as Session } catch { return null } }
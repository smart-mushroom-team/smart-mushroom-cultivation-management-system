import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { login as apiLogin } from '../api/auth'
import { ApiError, configureHttp } from '../api/http'
import { clearSession, isStaff, loadSession, saveSession, sessionFrom, SESSION_KEY, type Session } from './session'
export const CUSTOMER_NOTICE = 'Tài khoản khách hàng dùng ứng dụng di động. Trang này dành cho Operator và Admin.'
type AuthState = { session: Session | null; notice: string | null; login: (email: string, password: string) => Promise<void>; logout: () => void }
const Context = createContext<AuthState | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession()); const [notice, setNotice] = useState<string | null>(null); const token = useRef(session?.token ?? null); token.current = session?.token ?? null
  const logout = useCallback(() => { clearSession(); setSession(null); setNotice(null) }, [])
  const login = useCallback(async (email: string, password: string) => { const result = await apiLogin(email, password); if (!isStaff(result.role)) throw new ApiError(403, 'CUSTOMER_ACCOUNT', CUSTOMER_NOTICE); const next = sessionFrom(result); saveSession(next); setSession(next); setNotice(null) }, [])
  useLayoutEffect(() => configureHttp({ getToken: () => token.current, onUnauthorized: logout }), [logout])
  useEffect(() => { if (!session) return; const timer = window.setTimeout(logout, Math.max(0, session.expiresAt - Date.now())); return () => window.clearTimeout(timer) }, [session, logout])
  useEffect(() => { const onStorage = (event: StorageEvent) => { if (event.key === SESSION_KEY && event.newValue === null) setSession(null) }; window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage) }, [])
  return <Context.Provider value={useMemo(() => ({ session, notice, login, logout }), [session, notice, login, logout])}>{children}</Context.Provider>
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('useAuth phải nằm trong AuthProvider'); return value }
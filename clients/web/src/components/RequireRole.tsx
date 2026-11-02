import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Session } from '../auth/session'

export function RequireAuth() { return useAuth().session ? <Outlet /> : <Navigate to="/dang-nhap" replace /> }
export function RequireRole({ roles }: { roles: Session['role'][] }) { const session = useAuth().session; return session && roles.includes(session.role) ? <Outlet /> : <Navigate to="/" replace /> }

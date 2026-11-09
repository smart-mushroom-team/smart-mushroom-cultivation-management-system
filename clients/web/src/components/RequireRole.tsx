import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Session } from '../auth/session'

export function RequireAuth() {
  return useAuth().session ? <Outlet /> : <Navigate to="/dang-nhap" replace />
}

export function RequireRole({ roles }: { roles: Session['role'][] }) {
  const session = useAuth().session

  if (session && roles.includes(session.role)) {
    return <Outlet />
  }

  return (
    <section>
      <h1>Không đủ quyền</h1>
      <p>Tài khoản của bạn không có quyền truy cập chức năng này.</p>
    </section>
  )
}
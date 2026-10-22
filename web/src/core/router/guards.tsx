import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import type { Role } from '../../types/auth';
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="center-page">Đang khôi phục phiên...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="center-page">Đang khôi phục phiên...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return roles.includes(user.role) ? children : <Navigate to="/forbidden" replace />;
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/auth-context';
export function DashboardLayout() {
  const { user, logout, connectionState } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">🍄 Smart Mushroom</div>
        <nav>
          <NavLink to="/dashboard">Tổng quan</NavLink>
          <NavLink to="/rooms">Phòng trồng</NavLink>
          <NavLink to="/trays">Khay trồng</NavLink>
          <NavLink to="/cycles">Đợt nuôi</NavLink>
          <NavLink to="/rentals">Đơn thuê</NavLink>
          <NavLink to="/monitoring">Giám sát</NavLink>
          {user?.role === 'ADMIN' && <NavLink to="/users">Người dùng</NavLink>}
        </nav>
      </aside>
      <main className="main-content">
        {connectionState === 'connecting' && (
          <div className="connection-banner">Đang kết nối đến hệ thống…</div>
        )}
        {connectionState === 'error' && (
          <div className="connection-banner error">
            Không thể kết nối Gateway. Vui lòng thử lại.
          </div>
        )}
        <header className="topbar">
          <div>
            <strong>{user?.name}</strong>
            <span className="role">{user?.role}</span>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Đăng xuất
          </button>
        </header>
        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

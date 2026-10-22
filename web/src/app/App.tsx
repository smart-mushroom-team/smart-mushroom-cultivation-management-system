import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RequireAuth, RequireRole } from '../core/router/guards';

function Page({ title }: { title: string }) {
  return <div><h1>{title}</h1><p className="muted">Man hinh dang duoc trien khai.</p></div>;
}

const staffRoles = ['ADMIN', 'OPERATOR'] as const;

export function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireAuth />}>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<RequireRole roles={[...staffRoles]}><Page title="Tong quan" /></RequireRole>} />
        <Route path="/rooms" element={<RequireRole roles={[...staffRoles]}><Page title="Phong trong" /></RequireRole>} />
        <Route path="/trays" element={<RequireRole roles={[...staffRoles]}><Page title="Khay trong" /></RequireRole>} />
        <Route path="/cycles" element={<RequireRole roles={[...staffRoles]}><Page title="Dot nuoi" /></RequireRole>} />
        <Route path="/rentals" element={<RequireRole roles={[...staffRoles]}><Page title="Don thue" /></RequireRole>} />
        <Route path="/monitoring" element={<RequireRole roles={[...staffRoles]}><Page title="Giam sat" /></RequireRole>} />
        <Route path="/users" element={<RequireRole roles={['ADMIN']}><Page title="Nguoi dung" /></RequireRole>} />
      </Route>
    </Route>
    <Route path="/forbidden" element={<Page title="Khong co quyen truy cap" />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}

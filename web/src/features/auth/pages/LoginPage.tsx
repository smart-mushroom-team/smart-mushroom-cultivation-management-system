import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../../core/api/api-client';
import { useAuth } from '../../../core/auth/auth-context';
function messageFor(error: unknown) {
  if (!(error instanceof ApiError)) return 'Không thể kết nối Gateway. Vui lòng thử lại.';
  if (error.code === 'ACCOUNT_DISABLED') return 'Tài khoản đã bị vô hiệu hóa.';
  if (error.code === 'ACCOUNT_LOCKED') return 'Tài khoản đang bị khóa tạm thời 5 phút.';
  if (error.status === 401) return 'Email hoặc mật khẩu không đúng.';
  return error.message || 'Đăng nhập thất bại.';
}
export function LoginPage() {
  const { login, connectionState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from || '/dashboard', { replace: true });
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand">🍄 Smart Mushroom</div>
        <h1>Đăng nhập</h1>
        <p className="muted">Dành cho Admin và Operator</p>
        {connectionState === 'connecting' && (
          <div className="connection-banner">Đang kết nối đến hệ thống…</div>
        )}
        {error && <div className="form-error">{error}</div>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button className="primary-button" disabled={loading}>
          {loading ? 'Đang kiểm tra…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}

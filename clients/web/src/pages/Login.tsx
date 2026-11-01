import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { describeError } from '../api/http'
import { useAuth } from '../auth/AuthContext'
export function Login() {
  const { session, notice, login } = useAuth(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await login(email, password) } catch (reason) { setError(describeError(reason)); setBusy(false) } }
  return <div className="login-page"><form onSubmit={submit}><p className="eyebrow">MUSHROOM FARM</p><h1>Đăng nhập</h1><p>Dành cho Operator và Admin. Tài khoản Customer dùng ứng dụng di động.</p>{notice && <div className="notice">{notice}</div>}{error && <div className="error" role="alert">{error}</div>}<label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" /></label><label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label><button disabled={busy}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button></form></div>
}
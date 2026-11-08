import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { describeError } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { Notice } from '../components/Notice'

const INPUT = 'mt-1.5 block w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute/60 focus:border-spore focus:outline-none focus-visible:outline-2 focus-visible:outline-spore'

export function Login() {
  const { session, notice, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (reason) {
      setError(describeError(reason))
      setBusy(false)
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-bone px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-paper p-6 shadow-sm md:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-spore">MUSHROOM FARM</p>
          <h1 className="mt-2 text-3xl font-semibold text-spore-deep">Đăng nhập</h1>
          <p className="mt-2 text-sm text-mute">Dành cho Operator và Admin. Tài khoản Customer dùng ứng dụng di động.</p>
        </div>
        {notice && <Notice>{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <label className="block text-sm font-medium">
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" className={INPUT} />
        </label>
        <label className="block text-sm font-medium">
          Mật khẩu
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className={INPUT} />
        </label>
        <button
          disabled={busy}
          className="w-full rounded-md bg-spore px-4 py-2.5 text-sm font-medium text-paper hover:bg-spore-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  )
}

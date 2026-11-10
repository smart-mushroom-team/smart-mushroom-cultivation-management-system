import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { decodeJwtSub } from '../auth/session'
import { describeError } from '../api/http'
import { createAdmin, createOperator, listUsers, resetUserPassword, setUserActive, type AppUser } from '../api/users'
import { Notice } from '../components/Notice'
import { filterUsers, ROLE_LABEL, validateOperator } from '../lib/users'
import { dateVi } from '../lib/cycle'
import { btn, ghost, input, primary } from './catalog/ui'

export function Users() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const me = session ? decodeJwtSub(session.token) : null
  const q = useQuery({ queryKey: ['users'], queryFn: listUsers })
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<'ADMIN' | 'OPERATOR' | null>(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] })
  const list = filterUsers(q.data ?? [], role, search).filter((u) => !status || u.status === status)
  const pageCount = Math.max(1, Math.ceil(list.length / 10))
  const visible = list.slice((page - 1) * 10, page * 10)
  const changeFilters = () => setPage(1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Người dùng</h1>
          <p className="mt-1 text-mute">Tạo Admin/Operator, đặt lại mật khẩu, khóa hoặc mở lại đăng nhập. Không xóa tài khoản.</p>
        </div>
        {!adding && <div className="flex gap-2">
          <button type="button" onClick={() => setAdding('ADMIN')} className={primary}>Thêm Admin</button>
          <button type="button" onClick={() => setAdding('OPERATOR')} className={primary}>Thêm Operator</button>
        </div>}
      </div>

      {adding && <AddOperator role={adding} onCancel={() => setAdding(null)} onDone={() => { setAdding(null); void refresh() }} />}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Vai trò
          <select value={role} onChange={(e) => { setRole(e.target.value); changeFilters() }} className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm">
            <option value="">Tất cả</option>
            {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Tìm
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); changeFilters() }} placeholder="Tên hoặc email" className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Trạng thái
          <select value={status} onChange={(e) => { setStatus(e.target.value); changeFilters() }} className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm">
            <option value="">Tất cả</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      {q.error ? (
        <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>Không tải được danh sách người dùng. {describeError(q.error)}</Notice>
      ) : !q.data ? (
        <p className="text-mute" role="status">Đang tải...</p>
      ) : list.length === 0 ? (
        <p className="text-mute">Không có người dùng nào khớp. Bỏ bớt bộ lọc hoặc đổi từ khóa.</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{visible.map((u) => <UserRow key={u.id} u={u} isMe={u.id === me} onChanged={refresh} />)}</ul>
          <nav aria-label="Phân trang người dùng" className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>Trang {page}/{pageCount} · {list.length} người dùng</span>
            <div className="flex gap-2">
              <button type="button" className={ghost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
              <button type="button" className={ghost} disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Sau</button>
            </div>
          </nav>
        </>
      )}
    </div>
  )
}

function AddOperator({ role, onCancel, onDone }: { role: 'ADMIN' | 'OPERATOR'; onCancel: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [shown, setShown] = useState(false)
  const errors = validateOperator(f)
  const add = useMutation({ mutationFn: () => (role === 'ADMIN' ? createAdmin : createOperator)({ name: f.name.trim(), email: f.email.trim(), password: f.password }), onSuccess: onDone })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); add.reset() }
  function submit(e: FormEvent) {
    e.preventDefault()
    setShown(true)
    if (Object.keys(errors).length === 0) add.mutate()
  }
  const field = (k: keyof typeof f, label: string, type = 'text', hint?: string) => (
    <div>
      <label htmlFor={`op-${k}`} className="block text-sm font-medium">{label}</label>
      <input id={`op-${k}`} type={type} value={f[k]} onChange={set(k)} autoComplete={k === 'password' ? 'new-password' : 'off'} className={input} aria-invalid={shown && errors[k] ? true : undefined} aria-describedby={shown && errors[k] ? `op-${k}-e` : hint ? `op-${k}-h` : undefined} />
      {shown && errors[k] ? <p id={`op-${k}-e`} className="mt-1 text-sm text-brick">{errors[k]}</p> : hint ? <p id={`op-${k}-h`} className="mt-1 text-xs text-mute">{hint}</p> : null}
    </div>
  )
  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-paper p-4">
      <h2 className="font-display text-base font-semibold">{role === 'ADMIN' ? 'Admin mới' : 'Operator mới'}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {field('name', 'Họ tên')}
        {field('email', 'Email', 'email')}
        {field('password', 'Mật khẩu tạm', 'password', 'Ít nhất 8 ký tự. Gửi cho người đó qua kênh riêng.')}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={add.isPending} className={primary}>{add.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
        <button type="button" onClick={onCancel} className={`${btn} border border-line`}>Hủy</button>
      </div>
      {add.isError && <div className="mt-3"><Notice tone="error">Không tạo được. {describeError(add.error)}</Notice></div>}
    </form>
  )
}

function UserRow({ u, isMe, onChanged }: { u: AppUser; isMe: boolean; onChanged: () => unknown }) {
  const [confirm, setConfirm] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const reset = useMutation({ mutationFn: () => resetUserPassword(u.id, password), onSuccess: () => { setResetOpen(false); setPassword(''); setPasswordConfirm(''); return onChanged() } })
  const active = u.status === 'ACTIVE'
  const m = useMutation({ mutationFn: () => setUserActive(u.id, !active), onSuccess: () => { setConfirm(false); return onChanged() } })
  return (
    <li className="rounded-lg border border-line bg-paper px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-medium">{u.name}</span>
          {isMe && <span className="ml-2 rounded bg-spore-soft px-1.5 py-0.5 text-xs text-spore-deep">Bạn</span>}
          <div className="truncate text-sm text-mute">{u.email} · {ROLE_LABEL[u.role]} · tạo {dateVi(u.createdAt)}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${active ? 'bg-moss-soft text-moss' : 'bg-amber-soft text-amber'}`}>{active ? 'Đang hoạt động' : 'Đã khóa'}</span>
          {u.role !== 'ADMIN' && <button type="button" className={ghost} onClick={() => { setResetOpen((v) => !v); reset.reset() }}>Đặt lại mật khẩu</button>}
          {!confirm && (
            <button type="button" disabled={isMe && active} title={isMe && active ? 'Không thể khóa chính tài khoản đang đăng nhập' : undefined} onClick={() => (active ? setConfirm(true) : m.mutate())} className={ghost} aria-label={`${active ? 'Khóa' : 'Mở lại'} ${u.name}`}>
              {active ? 'Khóa' : 'Mở lại'}
            </button>
          )}
        </div>
      </div>
      {confirm && (
        <div role="group" aria-label={`Xác nhận khóa ${u.name}`} className="mt-2 space-y-2">
          <p className="text-sm">Khóa <strong>{u.name}</strong>? Người này sẽ không đăng nhập lại được. Phiên đang mở vẫn dùng được đến khi hết hạn (tối đa vài giờ).</p>
          <div className="flex gap-2">
            <button type="button" disabled={m.isPending} onClick={() => m.mutate()} className={`${btn} bg-brick text-paper`}>{m.isPending ? 'Đang khóa...' : 'Xác nhận khóa'}</button>
            <button type="button" onClick={() => { setConfirm(false); m.reset() }} className={`${btn} border border-line`}>Hủy</button>
          </div>
        </div>
      )}
      {resetOpen && <form className="mt-3 space-y-2 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); if (password.length >= 8 && password.length <= 72 && password === passwordConfirm) reset.mutate() }}>
        <p className="text-sm font-medium">Đặt lại mật khẩu cho {u.name}</p>
        <label className="block text-sm">Mật khẩu mới<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} minLength={8} maxLength={72} required /></label>
        <label className="block text-sm">Xác nhận mật khẩu<input type="password" autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={input} required /></label>
        {password && (password.length < 8 || password.length > 72 || password !== passwordConfirm) && <p className="text-sm text-brick">Mật khẩu cần 8–72 ký tự và hai ô phải trùng nhau.</p>}
        <div className="flex gap-2"><button type="submit" className={primary} disabled={reset.isPending || password.length < 8 || password.length > 72 || password !== passwordConfirm}>Lưu mật khẩu</button><button type="button" className={ghost} onClick={() => setResetOpen(false)}>Hủy</button></div>
        {reset.isError && <Notice tone="error">{describeError(reset.error)}</Notice>}
      </form>}
      {m.isError && <div className="mt-3"><Notice tone="error">Không thực hiện được. {describeError(m.error)}</Notice></div>}
    </li>
  )
}

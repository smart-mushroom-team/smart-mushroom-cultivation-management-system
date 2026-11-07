import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { decodeJwtSub } from '../auth/session'
import { describeError } from '../api/http'
import { createOperator, listUsers, setUserActive, type AppUser } from '../api/users'
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
  const [adding, setAdding] = useState(false)
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] })
  const list = filterUsers(q.data ?? [], role, search)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Người dùng</h1>
          <p className="mt-1 text-mute">Tạo tài khoản Operator, khóa hoặc mở lại đăng nhập. Tài khoản không bị xóa để giữ lịch sử.</p>
        </div>
        {!adding && <button type="button" onClick={() => setAdding(true)} className={primary}>Thêm Operator</button>}
      </div>

      {adding && <AddOperator onCancel={() => setAdding(false)} onDone={() => { setAdding(false); void refresh() }} />}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Vai trò
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm">
            <option value="">Tất cả</option>
            {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Tìm
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên hoặc email" className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm" />
        </label>
      </div>

      {q.error ? (
        <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>Không tải được danh sách người dùng. {describeError(q.error)}</Notice>
      ) : !q.data ? (
        <p className="text-mute" role="status">Đang tải...</p>
      ) : list.length === 0 ? (
        <p className="text-mute">Không có người dùng nào khớp. Bỏ bớt bộ lọc hoặc đổi từ khóa.</p>
      ) : (
        <ul className="space-y-2">{list.map((u) => <UserRow key={u.id} u={u} isMe={u.id === me} onChanged={refresh} />)}</ul>
      )}
    </div>
  )
}

function AddOperator({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [shown, setShown] = useState(false)
  const errors = validateOperator(f)
  const add = useMutation({ mutationFn: () => createOperator({ name: f.name.trim(), email: f.email.trim(), password: f.password }), onSuccess: onDone })
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
      <h2 className="font-display text-base font-semibold">Operator mới</h2>
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
      {m.isError && <div className="mt-3"><Notice tone="error">Không thực hiện được. {describeError(m.error)}</Notice></div>}
    </li>
  )
}

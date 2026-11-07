import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useNotifications } from '../pages/Notifications'

type Item = { to: string; label: string; ready: boolean; adminOnly?: boolean; badge?: boolean }

// `ready: false` là mục sẽ có ở các bước sau; hiện mờ để người dùng thấy chỗ của nó nhưng không bấm được.
const NAV: Item[] = [
  { to: '/', label: 'Tổng quan', ready: true },
  { to: '/giam-sat', label: 'Giám sát phòng', ready: true },
  { to: '/dot-nuoi', label: 'Đợt nuôi', ready: true },
  { to: '/thiet-bi', label: 'Thiết bị', ready: true },
  { to: '/thong-bao', label: 'Thông báo', ready: true, badge: true },
  { to: '/danh-muc', label: 'Phòng, khay, gói', ready: true, adminOnly: true },
  { to: '/nguoi-dung', label: 'Người dùng', ready: true, adminOnly: true },
  { to: '/demo', label: 'Chế độ demo', ready: true, adminOnly: true },
]

const ROLE_LABEL = { ADMIN: 'Admin', OPERATOR: 'Operator' } as const

export function Layout() {
  const { session, logout } = useAuth()
  const notes = useNotifications(true)
  const unread = (notes.data ?? []).filter((n) => !n.read).length
  if (!session) return null
  const items = NAV.filter((i) => !i.adminOnly || session.role === 'ADMIN')
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col gap-6 border-b border-line bg-paper px-4 py-4 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0 md:py-6">
        <div className="font-display text-lg leading-tight font-semibold text-spore-deep">Quản lý trại nấm</div>
        <nav aria-label="Chức năng" className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
          {items.map((i) =>
            i.ready ? (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ${isActive ? 'bg-spore-soft text-spore-deep' : 'text-ink hover:bg-bone'}`
                }
              >
                {i.label}
                {i.badge && unread > 0 && (
                  <span aria-label={`${unread} chưa đọc`} className="ml-2 rounded-full bg-spore px-1.5 py-0.5 text-[11px] font-medium text-paper">
                    {unread}
                  </span>
                )}
              </NavLink>
            ) : (
              <span key={i.to} aria-disabled="true" className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap text-mute/70">
                {i.label}
                <span className="rounded bg-bone px-1.5 py-0.5 text-[11px] text-mute">Sắp có</span>
              </span>
            ),
          )}
        </nav>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4 md:flex-col md:items-stretch">
          <div className="min-w-0 text-sm">
            <div className="truncate font-medium">{session.name}</div>
            <div className="text-mute">{ROLE_LABEL[session.role as 'ADMIN' | 'OPERATOR']}</div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-spore hover:text-spore-deep"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-10 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}

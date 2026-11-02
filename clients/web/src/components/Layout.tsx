import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
export function Layout() { const { session, logout } = useAuth(); if (!session) return null; return <main className="shell"><header><strong>Quản lý trại nấm</strong><span>{session.name} · {session.role}</span><button onClick={logout}>Đăng xuất</button></header><Outlet /></main> }
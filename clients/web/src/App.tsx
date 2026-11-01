import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
function RequireAuth() { return useAuth().session ? <Outlet /> : <Navigate to="/dang-nhap" replace /> }
export function App() { return <Routes><Route path="/dang-nhap" element={<Login />} /><Route element={<RequireAuth />}><Route element={<Layout />}><Route index element={<Home />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes> }
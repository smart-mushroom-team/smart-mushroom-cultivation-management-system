import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireRole'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Monitoring } from './pages/Monitoring'
import { Notifications } from './pages/Notifications'
import { RoomDetail } from './pages/RoomDetail'
import { NotFound } from './pages/NotFound'

export function App() {
	return <Routes><Route path="/dang-nhap" element={<Login />} /><Route element={<RequireAuth />}><Route element={<Layout />}><Route index element={<Home />} /><Route path="giam-sat" element={<Monitoring />} /><Route path="giam-sat/:roomId" element={<RoomDetail />} /><Route path="thong-bao" element={<Notifications />} /><Route path="*" element={<NotFound />} /></Route></Route></Routes>
}
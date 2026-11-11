import { api } from './http'

export type MonthTotals = { gross: number; refunds: number; net: number; orders: number }
export type DayRevenue = { date: string; gross: number; refunds: number }
/** Chỉ Admin nhận được khối này; Operator nhận null. */
export type Revenue = { thisMonth: MonthTotals; lastMonth: MonthTotals; daily: DayRevenue[]; monthStart: string }
export type ExpiringRental = { id: string; customerName: string; packageName: string; trayCount: number; endDate: string; daysLeft: number }

export type Dashboard = {
  today: string
  activeRentals: number
  pendingVarieties: { cycles: number; rentals: number }
  expiring: { days: number; total: number; items: ExpiringRental[] }
  /** Đơn đã hết hạn nhưng còn đợt nuôi dang dở: cần thu hoạch hoặc loại bỏ. */
  expiredGrowing: number
  /** Đơn đã hoàn tiền, chờ Operator xác nhận vệ sinh và bàn giao khay. */
  awaitingClearance: number
  terminations: { pendingReview: number; awaitingTransfer: number } | null
  revenue: Revenue | null
}

export const getDashboard = () => api<Dashboard>('/api/core/dashboard')

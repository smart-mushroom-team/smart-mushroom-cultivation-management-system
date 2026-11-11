/** Hàm thuần cho trang Tổng quan (có test riêng). */
import type { Room } from '../api/core'
import type { Dashboard } from '../api/dashboard'
import type { Device } from '../api/devices'
import type { Latest, ThresholdState } from '../api/monitoring'

export const money = (n: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n))}đ`

export type Health = 'loading' | 'inactive' | 'alert' | 'offline' | 'nodata' | 'ok'
export type RoomStatus = { health: Health; reasons: string[] }

/** Ngừng > mất kết nối > thiếu dữ liệu > cảnh báo ngưỡng phòng > bình thường.
 * Không hiển thị cảnh báo ngưỡng cũ như số đo trực tiếp khi thiết bị offline.
 * Đây là ngưỡng PHÒNG, không phải ngưỡng sinh trưởng của từng giống nấm.
 */
export function roomHealth(room: Room, latest: Latest | undefined, th: ThresholdState | undefined): RoomStatus {
  if (room.status === 'INACTIVE') return { health: 'inactive', reasons: [] }
  if (!latest) return { health: 'loading', reasons: [] }
  if (!latest.deviceOnline) return { health: 'offline', reasons: [] }
  if (!latest.snapshot) return { health: 'nodata', reasons: [] }
  const reasons = [th?.alerting.temp ? 'nhiệt độ' : '', th?.alerting.hum ? 'độ ẩm' : ''].filter(Boolean)
  if (reasons.length) return { health: 'alert', reasons }
  return { health: 'ok', reasons: [] }
}

/** KPI tỷ lệ lấp đầy chỉ tính khay có thể cho thuê, tránh chia cho 0. */
export function occupancyRate(rented: number, total: number): number {
  return total > 0 ? Math.round((rented / total) * 100) : 0
}

/** Chỉ SENSOR_NODE đang hoạt động mới tính trong KPI cảm biến. */
export function sensorSummary(devices: Device[]): { online: number; total: number } {
  const sensors = devices.filter((d) => d.status === 'ACTIVE' && d.type === 'SENSOR_NODE')
  return { online: sensors.filter((d) => d.online).length, total: sensors.length }
}

/** Thiết bị đang bật nhưng đã mất kết nối. Thiết bị mới thêm, chưa từng gửi dữ liệu, không bị coi là mất kết nối. */
export const offlineDevices = (devices: Device[]) => devices.filter((d) => d.status === 'ACTIVE' && d.lastSeenAt !== null && !d.online)

export type Todo = { key: string; label: string; count: number; to: string; tone: 'error' | 'warn' }

type TodoInput = { dash: Dashboard | undefined; rooms: { room: Room; status: RoomStatus }[]; offline: number }

/** Danh sách việc cần xử lý; mục nào bằng 0 thì không có trong kết quả. */
export function buildTodo({ dash, rooms, offline }: TodoInput): Todo[] {
  const out: Todo[] = []
  const alerting = rooms.filter((r) => r.status.health === 'alert')
  if (alerting.length) out.push({ key: 'alert', label: alerting.length === 1 ? `${alerting[0].room.name} đang cảnh báo ngưỡng phòng: ${alerting[0].status.reasons.join(' và ')}` : `${alerting.length} phòng đang cảnh báo ngưỡng phòng`, count: alerting.length, to: alerting.length === 1 ? `/giam-sat/${alerting[0].room.id}` : '/giam-sat', tone: 'error' })
  if (dash && dash.expiredGrowing > 0) out.push({ key: 'expired', label: `${dash.expiredGrowing} đơn đã hết hạn còn khay đang nuôi, cần thu hoạch hoặc loại bỏ`, count: dash.expiredGrowing, to: '/dot-nuoi', tone: 'error' })
  if (offline > 0) out.push({ key: 'offline', label: `${offline} thiết bị mất kết nối`, count: offline, to: '/thiet-bi', tone: 'warn' })
  if (dash && dash.pendingVarieties.rentals > 0) out.push({ key: 'variety', label: `${dash.pendingVarieties.rentals} đơn có giống nấm chờ duyệt (${dash.pendingVarieties.cycles} khay)`, count: dash.pendingVarieties.rentals, to: '/dot-nuoi?giong=cho-duyet', tone: 'warn' })
  if (dash && dash.awaitingClearance > 0) out.push({ key: 'clearance', label: `${dash.awaitingClearance} đơn đã hoàn tiền, chờ vệ sinh và bàn giao khay`, count: dash.awaitingClearance, to: '/ban-giao-khay', tone: 'warn' })
  const t = dash?.terminations
  if (t && t.pendingReview > 0) out.push({ key: 'review', label: `${t.pendingReview} yêu cầu kết thúc sớm chờ duyệt`, count: t.pendingReview, to: '/don-thue', tone: 'warn' })
  if (t && t.awaitingTransfer > 0) out.push({ key: 'transfer', label: `${t.awaitingTransfer} yêu cầu đã duyệt, chờ xác nhận chuyển khoản hoàn tiền`, count: t.awaitingTransfer, to: '/don-thue', tone: 'warn' })
  return out
}

export const daysLeftText = (n: number) => (n <= 0 ? 'Hết hạn hôm nay' : n === 1 ? 'Còn 1 ngày' : `Còn ${n} ngày`)

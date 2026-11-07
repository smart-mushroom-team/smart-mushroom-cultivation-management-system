import { api } from './http'

export type Room = { id: string; name: string; status: 'ACTIVE' | 'INACTIVE' }

export type Tray = {
  id: string
  code: string
  roomId: string
  row: number
  shelf: number
  slot: number
  occupancy: 'AVAILABLE' | 'RENTED'
}

// Backend trả khay theo snake_case còn phòng theo camelCase; chuẩn hóa ở đây để phần còn lại của giao diện dùng một kiểu.
type TrayDto = {
  id: string
  tray_code: string
  room_id: string
  location_row: number
  location_shelf: number
  location_slot: number
  occupancy_status: Tray['occupancy']
}

export const toTray = (t: TrayDto): Tray => ({
  id: t.id,
  code: t.tray_code,
  roomId: t.room_id,
  row: t.location_row,
  shelf: t.location_shelf,
  slot: t.location_slot,
  occupancy: t.occupancy_status,
})

export const listRooms = () => api<Room[]>('/api/core/rooms')
export const listTrays = async () => (await api<TrayDto[]>('/api/core/trays')).map(toTray)

export const createRoom = (name: string) => api<{ id: string }>('/api/core/rooms', { method: 'POST', body: { name } })
export const patchRoom = (id: string, body: { name?: string; status?: Room['status'] }) => api<Room>(`/api/core/rooms/${id}`, { method: 'PATCH', body })

export type TrayInput = { trayCode: string; roomId: string; row: number; shelf: number; slot: number }
export const createTray = (b: TrayInput) => api<{ id: string }>('/api/core/trays', { method: 'POST', body: b })
export const patchTray = (id: string, b: Partial<TrayInput>) => api<unknown>(`/api/core/trays/${id}`, { method: 'PATCH', body: b })
export const deleteTray = (id: string) => api<void>(`/api/core/trays/${id}`, { method: 'DELETE' })

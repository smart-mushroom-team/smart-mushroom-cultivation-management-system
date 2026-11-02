import { api } from './http'

export type Room = { id: string; name: string; status: 'ACTIVE' | 'INACTIVE' }
export const listRooms = () => api<Room[]>('/api/core/rooms')

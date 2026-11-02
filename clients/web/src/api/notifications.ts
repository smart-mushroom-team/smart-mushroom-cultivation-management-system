import { api } from './http'

export type AppNotification = {
  id: string
  type: string
  title: string
  content: string
  data: { roomId?: string | null; deviceId?: string | null; rentalId?: string | null } & Record<string, unknown>
  created_at: string
  read: boolean
}

export const listNotifications = () => api<AppNotification[]>('/api/core/notifications')
export const markRead = (id: string) => api<{ ok: boolean }>(`/api/core/notifications/${id}/read`, { method: 'POST' })

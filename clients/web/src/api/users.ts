import { api } from './http'

export type UserRole = 'ADMIN' | 'OPERATOR' | 'CUSTOMER'
export type AppUser = { id: string; name: string; email: string; role: UserRole; status: 'ACTIVE' | 'INACTIVE'; createdAt: string }
type Dto = { id: string; name: string; email: string; role: UserRole; status: AppUser['status']; created_at: string }

export const listUsers = async () =>
  (await api<Dto[]>('/api/identity/users')).map((u): AppUser => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, createdAt: u.created_at }))
export const createOperator = (b: { name: string; email: string; password: string }) => api<{ id: string }>('/api/identity/users/operators', { method: 'POST', body: b })
export const setUserActive = (id: string, active: boolean) => api<{ id: string; status: string }>(`/api/identity/users/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' })

import { api } from './http'

export type Pack = { id: string; name: string; durationDays: number; pricePerTray: number; active: boolean }
type Dto = { id: string; name: string; duration_days: number; price_per_tray: number; is_active: boolean }
const toPack = (d: Dto): Pack => ({ id: d.id, name: d.name, durationDays: d.duration_days, pricePerTray: d.price_per_tray, active: d.is_active })

export const listAllPackages = async () => (await api<Dto[]>('/api/core/packages/all')).map(toPack)
export const createPackage = (b: { name: string; durationDays: number; pricePerTray: number }) => api<{ id: string }>('/api/core/packages', { method: 'POST', body: b })
export const patchPackage = async (id: string, b: { name?: string; durationDays?: number; pricePerTray?: number; isActive?: boolean }) =>
  toPack(await api<Dto>(`/api/core/packages/${id}`, { method: 'PATCH', body: b }))

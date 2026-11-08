import { api } from './http'

export type Variety = {
  id: string
  name: string
  description: string
  growthDays: number
  tempMin: number
  tempMax: number
  humMin: number
  humMax: number
  active: boolean
}
type Dto = {
  id: string; name: string; description: string; growth_days: number
  temp_min: number; temp_max: number; hum_min: number; hum_max: number; is_active: boolean
}
export const toVariety = (d: Dto): Variety => ({
  id: d.id, name: d.name, description: d.description, growthDays: d.growth_days,
  tempMin: d.temp_min, tempMax: d.temp_max, humMin: d.hum_min, humMax: d.hum_max, active: d.is_active,
})

export type VarietyBody = { name: string; description: string; growthDays: number; tempMin: number; tempMax: number; humMin: number; humMax: number }

export const listAllVarieties = async () => (await api<Dto[]>('/api/core/varieties/all')).map(toVariety)
export const createVariety = async (b: VarietyBody) => toVariety(await api<Dto>('/api/core/varieties', { method: 'POST', body: b }))
export const patchVariety = async (id: string, b: Partial<VarietyBody> & { isActive?: boolean }) =>
  toVariety(await api<Dto>(`/api/core/varieties/${id}`, { method: 'PATCH', body: b }))

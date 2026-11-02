import { api } from './http'

export type Stage = 'SEEDING' | 'INCUBATING' | 'FRUITING' | 'READY'
export type CycleStatus = 'GROWING' | 'HARVESTED' | 'DISCARDED'

export type Cycle = {
  id: string
  rentalId: string
  trayId: string
  trayCode: string
  roomId: string
  stage: Stage
  status: CycleStatus
  variety: string | null
  startDate: string
  expectedHarvestDate: string | null
  harvestedAt: string | null
  weightKg: number | null
  discardReason: string | null
  note: string | null
  customerName: string
  rentalStatus: string
  rentalEndDate: string
}

export type CycleLog = { from: string | null; to: string; note: string | null; at: string }
export type CycleDetail = Cycle & { logs: CycleLog[] }

// Backend trả snake_case; chuẩn hóa tại đây như với khay.
type Dto = {
  id: string; rental_id: string; tray_id: string; tray_code: string; room_id: string; stage: Stage; status: CycleStatus
  variety: string | null; start_date: string; expected_harvest_date: string | null; harvested_at: string | null
  weight_kg: number | null; discard_reason: string | null; note: string | null
  customer_name: string; rental_status: string; rental_end_date: string
  logs?: { from_stage: string | null; to_stage: string; note: string | null; created_at: string }[]
}

export const toCycle = (d: Dto): Cycle => ({
  id: d.id, rentalId: d.rental_id, trayId: d.tray_id, trayCode: d.tray_code, roomId: d.room_id, stage: d.stage, status: d.status,
  variety: d.variety, startDate: d.start_date, expectedHarvestDate: d.expected_harvest_date, harvestedAt: d.harvested_at,
  weightKg: d.weight_kg, discardReason: d.discard_reason, note: d.note, customerName: d.customer_name,
  rentalStatus: d.rental_status, rentalEndDate: d.rental_end_date,
})
const toDetail = (d: Dto): CycleDetail => ({ ...toCycle(d), logs: (d.logs ?? []).map((l) => ({ from: l.from_stage, to: l.to_stage, note: l.note, at: l.created_at })) })

export const listCycles = async (status: CycleStatus | 'ALL', roomId?: string) =>
  (await api<Dto[]>('/api/core/cycles', { query: { status, roomId: roomId || undefined } })).map(toCycle)
export const getCycle = async (id: string) => toDetail(await api<Dto>(`/api/core/cycles/${id}`))

export type CyclePatch = { stage?: Stage; variety?: string; expectedHarvestDate?: string; note?: string }
export const patchCycle = async (id: string, body: CyclePatch) => toCycle(await api<Dto>(`/api/core/cycles/${id}`, { method: 'PATCH', body }))
export const harvestCycle = async (id: string, body: { weightKg: number; note?: string }) => toCycle(await api<Dto>(`/api/core/cycles/${id}/harvest`, { method: 'POST', body }))
export const discardCycle = async (id: string, reason: string) => toCycle(await api<Dto>(`/api/core/cycles/${id}/discard`, { method: 'POST', body: { reason } }))

import { api, apiBlob } from './http'

export type Snapshot = { temperature: number | null; humidity: number | null; recordedAt: string }
export type Latest = { snapshot: Snapshot | null; deviceOnline: boolean }

/** Một cửa sổ 5 phút do NiFi gộp: giá trị trung bình, nhỏ nhất, lớn nhất và số lần đo (n). */
export type ChartPoint = {
  t: string
  temp: number | null
  hum: number | null
  tempMin: number | null
  tempMax: number | null
  humMin: number | null
  humMax: number | null
  n: number
}

export type Thresholds = {
  tempMin: number
  tempMax: number
  humMin: number
  humMax: number
  consecutiveN: number
}
export type ThresholdState = Thresholds & { configured: boolean; alerting: { temp: boolean; hum: boolean } }

export type SnapshotItem = { id: string; capturedAt: string; sizeBytes: number }
export type SnapshotPage = { items: SnapshotItem[]; page: number; total: number; totalPages: number; retentionHours: number }

const room = (id: string) => `/api/monitoring/rooms/${id}`

export const getLatest = (roomId: string) => api<Latest>(`${room(roomId)}/latest`)
export const getChart = (roomId: string, hours: number) => api<ChartPoint[]>(`${room(roomId)}/chart`, { query: { hours } })
export const getThresholds = (roomId: string) => api<ThresholdState>(`${room(roomId)}/thresholds`)
export const putThresholds = (roomId: string, t: Thresholds) => api<{ ok: boolean }>(`${room(roomId)}/thresholds`, { method: 'PUT', body: t })

export const getSnapshotPage = (roomId: string, cameraSlot: 1 | 2, page = 1, limit = 16) =>
  api<SnapshotPage>(`${room(roomId)}/camera/snapshots`, { query: { cameraSlot, page, limit } })
export const getLatestImage = (roomId: string, cameraSlot: 1 | 2) =>
  apiBlob(`${room(roomId)}/camera/latest`, { query: { cameraSlot } })
export const getSnapshotImage = (roomId: string, id: string) => apiBlob(`${room(roomId)}/camera/snapshots/${id}`)

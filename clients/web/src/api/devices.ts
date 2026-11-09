import { api } from './http'

export type DeviceType = 'SENSOR_NODE' | 'CAMERA'
export type Device = {
  id: string
  name: string
  type: DeviceType
  roomId: string
  status: 'ACTIVE' | 'INACTIVE'
  isSimulated: boolean
  intervalSec: number
  online: boolean
  lastSeenAt: string | null
  cameraSlot: 1 | 2 | null
  coverageRows: number[] | null
}
export type NewDevice = { name: string; type: DeviceType; roomId: string; intervalSec: number; isSimulated: boolean; cameraSlot?: 1 | 2 }
export type DevicePatch = { name?: string; intervalSec?: number; status?: 'ACTIVE' | 'INACTIVE'; cameraSlot?: 1 | 2 }
export type KeyResult = { id: string; apiKey: string }

export const listDevices = () => api<Device[]>('/api/monitoring/devices')
export const createDevice = (b: NewDevice) => api<KeyResult>('/api/monitoring/devices', { method: 'POST', body: b })
export const patchDevice = (id: string, b: DevicePatch) => api<Device>(`/api/monitoring/devices/${id}`, { method: 'PATCH', body: b })
export const rotateKey = (id: string) => api<KeyResult>(`/api/monitoring/devices/${id}/rotate-key`, { method: 'POST' })

export const deleteDevice = (id: string) => api<{deleted: boolean}>(`/api/monitoring/devices/${id}`, {method: 'DELETE'})

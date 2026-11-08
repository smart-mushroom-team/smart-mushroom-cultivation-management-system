import { api } from './http'

export type DemoStatus = { enabled: boolean; today: string; demoDate: string | null }
export type ExpiryResult = { expired: number; completed: number; errors: number }

export const getDemoStatus = () => api<DemoStatus>('/api/core/demo/status')
/** date = null: quay về ngày thật */
export const setDemoDate = (date: string | null) => api<{ today: string }>('/api/core/demo/date', { method: 'PUT', body: { date } })
export const runExpiry = () => api<ExpiryResult>('/api/core/demo/run-expiry', { method: 'POST' })

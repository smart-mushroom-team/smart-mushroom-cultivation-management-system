export class ApiError extends Error { details?: unknown; constructor(public status: number, public code: string, message: string, details?: unknown) { super(message); this.name = 'ApiError'; this.details = details } }
type Hooks = { getToken: () => string | null; onUnauthorized: () => void }
let hooks: Hooks = { getToken: () => null, onUnauthorized: () => {} }
export function configureHttp(next: Hooks) { hooks = next }
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; query?: Record<string, string | number | boolean | undefined | null>; signal?: AbortSignal; anonymous?: boolean; accept?: string }
function buildUrl(path: string, query?: RequestOptions['query']) { const q = new URLSearchParams(); for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null) q.set(k, String(v)); const s = q.toString(); return `${base}${path}${s ? `?${s}` : ''}` }
async function apiRaw(path: string, options: RequestOptions = {}): Promise<Response> {
  const token = hooks.getToken(); const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.accept) headers.Accept = options.accept
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  let response: Response
  try { response = await fetch(buildUrl(path, options.query), { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: options.signal }) } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') throw e; throw new ApiError(0, 'NETWORK', 'Không kết nối được máy chủ.') }
  if (!response.ok) {
    if (response.status === 401 && token && !options.anonymous) hooks.onUnauthorized()
    let payload: { error?: { code?: string; message?: string; details?: unknown } } | null = null
    try { payload = await response.json() } catch { /* proxy may return an empty response */ }
    throw new ApiError(response.status, payload?.error?.code ?? 'ERROR', payload?.error?.message ?? `Yêu cầu thất bại (${response.status}).`, payload?.error?.details)
  }
  return response
}
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> { const response = await apiRaw(path, options); if (response.status === 204) return undefined as T; return (await response.json()) as T }
export async function apiBlob(path: string, options: RequestOptions = {}): Promise<{ blob: Blob; capturedAt: string | null }> { const response = await apiRaw(path, { ...options, accept: 'image/*' }); return { blob: await response.blob(), capturedAt: response.headers.get('X-Captured-At') } }
export function describeError(error: unknown) { return error instanceof Error ? error.message : 'Có lỗi không xác định.' }
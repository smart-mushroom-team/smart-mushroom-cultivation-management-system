export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); this.name = 'ApiError' } }
type Hooks = { getToken: () => string | null; onUnauthorized: () => void }
let hooks: Hooks = { getToken: () => null, onUnauthorized: () => {} }
export function configureHttp(next: Hooks) { hooks = next }
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; anonymous?: boolean }
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = hooks.getToken(); const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  let response: Response
  try { response = await fetch(`${base}${path}`, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) }) } catch { throw new ApiError(0, 'NETWORK', 'Không kết nối được máy chủ.') }
  if (!response.ok) {
    if (response.status === 401 && token && !options.anonymous) hooks.onUnauthorized()
    let payload: { error?: { code?: string; message?: string } } | null = null
    try { payload = await response.json() } catch { /* proxy may return an empty response */ }
    throw new ApiError(response.status, payload?.error?.code ?? 'ERROR', payload?.error?.message ?? `Yêu cầu thất bại (${response.status}).`)
  }
  return (await response.json()) as T
}
export function describeError(error: unknown) { return error instanceof Error ? error.message : 'Có lỗi không xác định.' }
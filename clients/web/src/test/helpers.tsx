import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { App } from '../App'
import { AuthProvider } from '../auth/AuthContext'

export function json(value: unknown, init: ResponseInit | number = {}) {
  const opts: ResponseInit = typeof init === 'number' ? { status: init } : init
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
}

export function apiError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function storedSession(role: 'ADMIN' | 'OPERATOR') {
  const payload = {
    sub: 'u1',
    role,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }

  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const token = [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode(payload),
    'test-signature',
  ].join('.')

  localStorage.setItem(
    'mushroom.session',
    JSON.stringify({
      token,
      role,
      name: 'Test',
      expiresAt: Date.now() + 3_600_000,
    }),
  )
}

export function mockApi(routes: Record<string, () => Response | Promise<Response>>) {
  const calls: { key: string; init?: RequestInit }[] = []
  const fn = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const key = `${init?.method ?? 'GET'} ${url.replace(/^https?:\/\/[^/]+/, '')}`
    calls.push({ key, init })
    const pathOnly = key.split('?')[0]

return (
  routes[key]?.() ??
  routes[pathOnly]?.() ??
  json(
    { error: { code: 'NOT_FOUND', message: key } },
    { status: 404 }
  )
)
  })
  return { fn, calls }
}

export function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
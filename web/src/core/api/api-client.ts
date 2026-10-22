import { BFF_BASE_URL, API_TIMEOUT_MS, RETRY_DELAYS_MS } from '../config/env';
import type { LoginResponse, User } from '../../types/auth';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
type ConnectionListener = (state: ConnectionState) => void;
let connectionState: ConnectionState = 'idle';
const listeners = new Set<ConnectionListener>();

export const connection = {
  get state() {
    return connectionState;
  },
  subscribe(listener: ConnectionListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
function setConnectionState(state: ConnectionState) {
  connectionState = state;
  listeners.forEach((listener) => listener(state));
}
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRetryable(status?: number) {
  return status === 502 || status === 503 || status === undefined;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message = 'Có lỗi xảy ra',
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, canRefresh = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const isPost = init.method?.toUpperCase() === 'POST';
  setConnectionState('connecting');
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(`${BFF_BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        setConnectionState('connected');
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string };
      };
      if (isRetryable(response.status) && attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      setConnectionState('error');
      throw new ApiError(response.status, body.error?.code, body.error?.message);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (error instanceof ApiError && !isRetryable(error.status)) throw error;
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      if (
        !isTimeout &&
        (!isPost || error instanceof TypeError) &&
        attempt < RETRY_DELAYS_MS.length
      ) {
        await wait(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      setConnectionState('error');
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối Gateway');
}

export const apiClient = {
  request,
  login: (email: string, password: string) =>
    request<LoginResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }) },
      false,
    ),
  me: () => request<User>('/auth/me', {}, false),
  logout: () => request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({}) }, false),
};

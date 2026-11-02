import { api } from './http'

export type Role = 'ADMIN' | 'OPERATOR' | 'CUSTOMER'
export type LoginResult = { accessToken: string; tokenType: string; expiresIn: number; role: Role; name: string }
export function login(email: string, password: string) { return api<LoginResult>('/api/identity/auth/login', { method: 'POST', body: { email: email.trim(), password }, anonymous: true }) }
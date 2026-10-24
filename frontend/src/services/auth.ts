import type { AuthState, AuthUser } from '../types/auth'

interface CsrfResponse {
  headerName: string
  token: string
}

function isUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false
  const user = value as Record<string, unknown>
  return typeof user.id === 'number'
    && typeof user.email === 'string'
    && typeof user.displayName === 'string'
    && (typeof user.profileImageUrl === 'string' || user.profileImageUrl === null)
    && (user.membershipTier === 'FREE' || user.membershipTier === 'PREMIUM')
}

export async function fetchAuthState(signal?: AbortSignal): Promise<AuthState> {
  const response = await fetch('/api/me', { credentials: 'include', signal })
  if (!response.ok) throw new Error(`Authentication request failed: ${response.status}`)
  const payload: unknown = await response.json()
  if (typeof payload !== 'object' || payload === null) throw new Error('Invalid authentication response')
  const value = payload as Record<string, unknown>
  if (value.authenticated === false && value.user === null) {
    return { status: 'anonymous', user: null, error: null }
  }
  if (value.authenticated === true && isUser(value.user)) {
    return { status: 'authenticated', user: value.user, error: null }
  }
  throw new Error('Invalid authentication response')
}

async function fetchCsrf(): Promise<CsrfResponse> {
  const response = await fetch('/api/csrf', { credentials: 'include' })
  if (!response.ok) throw new Error(`CSRF request failed: ${response.status}`)
  const payload: unknown = await response.json()
  if (typeof payload !== 'object' || payload === null) throw new Error('Invalid CSRF response')
  const value = payload as Record<string, unknown>
  if (typeof value.headerName !== 'string' || typeof value.token !== 'string') {
    throw new Error('Invalid CSRF response')
  }
  return { headerName: value.headerName, token: value.token }
}

async function authenticatedMutation(method: 'POST' | 'DELETE', path: string): Promise<void> {
  const csrf = await fetchCsrf()
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: { [csrf.headerName]: csrf.token },
  })
  if (!response.ok) throw new Error(`Authentication mutation failed: ${response.status}`)
}

export function logout(): Promise<void> {
  return authenticatedMutation('POST', '/api/logout')
}

export function deleteAccount(): Promise<void> {
  return authenticatedMutation('DELETE', '/api/me')
}

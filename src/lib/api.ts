import { API_URL } from './constants'
import { getMeta } from './db'

async function getAccessToken(): Promise<string | null> {
  try {
    return (await getMeta<string>('accessToken')) ?? null
  } catch {
    return null
  }
}

interface FetchOptions extends RequestInit {
  auth?: boolean
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = true, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (auth) {
    const token = await getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
    throw new ApiError(
      error.error?.code ?? 'FETCH_ERROR',
      error.error?.message ?? 'Error desconocido',
      res.status
    )
  }

  return res.json()
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body), auth: false }),

  login: (body: { email: string; password: string; remember: boolean }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body), auth: false }),

  me: () => apiFetch<{ user: unknown }>('/auth/me'),

  refresh: (refreshToken: string) =>
    apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      auth: false,
    }),
}

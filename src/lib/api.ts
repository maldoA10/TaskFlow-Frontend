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

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  const text = await res.text()
  if (!text) return undefined as T

  return JSON.parse(text) as T
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

// Auth endpoints

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

// Boards endpoints

export const boardsApi = {
  list: () => apiFetch<{ boards: import('@/types').Board[] }>('/boards'),

  get: (id: string) => apiFetch<{ board: import('@/types').BoardWithRelations }>(`/boards/${id}`),

  create: (body: { name: string; description?: string; color?: string }) =>
    apiFetch<{ board: import('@/types').Board }>('/boards', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<{ name: string; description: string; color: string }>) =>
    apiFetch<{ board: import('@/types').Board }>(`/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (id: string) => apiFetch<void>(`/boards/${id}`, { method: 'DELETE' }),
}

// Tasks endpoints

export const tasksApi = {
  listByBoard: (boardId: string) =>
    apiFetch<{ tasks: import('@/types').Task[] }>(`/boards/${boardId}/tasks`),

  create: (
    boardId: string,
    body: {
      title: string
      columnId: string
      description?: string
      priority?: string
      dueDate?: string
      tags?: string[]
      assigneeId?: string
    }
  ) =>
    apiFetch<{ task: import('@/types').Task }>(`/boards/${boardId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (
    id: string,
    body: Partial<{
      title: string
      description: string
      priority: string
      dueDate: string | null
      tags: string[]
      assigneeId: string | null
    }>
  ) =>
    apiFetch<{ task: import('@/types').Task }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  move: (id: string, body: { columnId: string; position: number }) =>
    apiFetch<{ task: import('@/types').Task }>(`/tasks/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (id: string) => apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
}

// Comments endpoints

export const commentsApi = {
  list: (taskId: string) =>
    apiFetch<{ comments: import('@/types').Comment[] }>(`/tasks/${taskId}/comments`),

  create: (taskId: string, content: string) =>
    apiFetch<{ comment: import('@/types').Comment }>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
}

// Attachments endpoints

export const attachmentsApi = {
  list: (taskId: string) =>
    apiFetch<{ attachments: import('@/types').Attachment[] }>(`/tasks/${taskId}/attachments`),

  // Upload from base64 (camera capture or file reader)
  uploadBase64: (taskId: string, data: string, mimeType: string, originalName?: string) =>
    apiFetch<{ attachment: import('@/types').Attachment }>(`/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ data, mimeType, originalName }),
    }),

  // Upload file using FormData
  uploadFile: async (taskId: string, file: File) => {
    const token = await getMeta<string>('accessToken')
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
      throw new ApiError(
        error.error?.code ?? 'UPLOAD_ERROR',
        error.error?.message ?? 'Error al subir archivo',
        res.status
      )
    }

    return res.json() as Promise<{ attachment: import('@/types').Attachment }>
  },

  // Get attachment URL
  getUrl: (taskId: string, attachmentId: string) =>
    `${API_URL}/tasks/${taskId}/attachments/${attachmentId}`,

  delete: (taskId: string, attachmentId: string) =>
    apiFetch<void>(`/tasks/${taskId}/attachments/${attachmentId}`, { method: 'DELETE' }),
}

// Invitations endpoints

export const invitationsApi = {
  list: () => apiFetch<{ invitations: import('@/types').Invitation[] }>('/invitations'),

  invite: (boardId: string, email: string) =>
    apiFetch<{ invitation: import('@/types').Invitation }>(`/boards/${boardId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  accept: (id: string) =>
    apiFetch<{ invitation: import('@/types').Invitation }>(`/invitations/${id}/accept`, {
      method: 'POST',
    }),

  reject: (id: string) =>
    apiFetch<{ invitation: import('@/types').Invitation }>(`/invitations/${id}/reject`, {
      method: 'POST',
    }),
}

/**
 * @file src/tests/lib/api.test.ts
 * Tests para ApiError y apiFetch de lib/api.ts.
 * Se mockea fetch globalmente para no depender de red real.
 */

import { ApiError, apiFetch, authApi } from '@/lib/api'

// Mock de lib/db para evitar IndexedDB en tests
jest.mock('@/lib/db', () => ({
  getMeta: jest.fn().mockResolvedValue(null),
}))

// Mock de fetch global
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper para crear una respuesta ok con headers simulados
const okResponse = (payload: unknown) => ({
  ok: true,
  status: 200,
  headers: { get: jest.fn().mockReturnValue(null) },
  json: async () => payload,
  text: async () => JSON.stringify(payload),
})

// Helper para crear una respuesta de error
const errorResponse = (status: number, error: { code: string; message: string }) => ({
  ok: false,
  status,
  headers: { get: jest.fn().mockReturnValue(null) },
  json: async () => ({ error }),
})

beforeEach(() => {
  mockFetch.mockReset()
})

// ApiError

describe('ApiError', () => {
  it('crea una instancia con code, message y status correctos', () => {
    const err = new ApiError('NOT_FOUND', 'Recurso no encontrado', 404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Recurso no encontrado')
    expect(err.status).toBe(404)
  })

  it('es instancia de Error', () => {
    const err = new ApiError('ERR', 'msg', 500)
    expect(err).toBeInstanceOf(Error)
  })

  it('tiene name "ApiError"', () => {
    const err = new ApiError('ERR', 'msg', 500)
    expect(err.name).toBe('ApiError')
  })
})

// apiFetch

describe('apiFetch', () => {
  it('resuelve con los datos JSON cuando la respuesta es ok', async () => {
    const payload = { id: '1', name: 'Test' }
    mockFetch.mockResolvedValueOnce(okResponse(payload))

    const result = await apiFetch('/test', { auth: false })
    expect(result).toEqual(payload)
  })

  it('lanza ApiError cuando la respuesta no es ok', async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(401, { code: 'UNAUTHORIZED', message: 'No autorizado' })
    )

    await expect(apiFetch('/protected', { auth: false })).rejects.toBeInstanceOf(ApiError)
  })

  it('el ApiError contiene el código y status del servidor', async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(403, { code: 'FORBIDDEN', message: 'Acceso denegado' })
    )

    try {
      await apiFetch('/admin', { auth: false })
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).code).toBe('FORBIDDEN')
      expect((err as ApiError).status).toBe(403)
    }
  })

  it('lanza ApiError con fallback cuando el body no es JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: async () => {
        throw new Error('invalid json')
      },
    })

    await expect(apiFetch('/broken', { auth: false })).rejects.toBeInstanceOf(ApiError)
  })

  it('incluye el header Authorization cuando auth=true y hay token', async () => {
    const { getMeta } = await import('@/lib/db')
    ;(getMeta as jest.Mock).mockResolvedValueOnce('my-token')

    mockFetch.mockResolvedValueOnce(okResponse({}))

    await apiFetch('/secure')

    const [, options] = mockFetch.mock.calls[0]
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token')
  })

  it('NO incluye Authorization cuando auth=false', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}))

    await apiFetch('/public', { auth: false })

    const [, options] = mockFetch.mock.calls[0]
    expect((options.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })
})

// authApi

describe('authApi', () => {
  it('authApi.login llama a /auth/login con POST', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({ user: {}, accessToken: 'tok', refreshToken: 'ref' })
    )

    await authApi.login({ email: 'a@b.com', password: '123456', remember: false })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/auth/login')
    expect(options.method).toBe('POST')
  })

  it('authApi.register llama a /auth/register con POST', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({ user: {}, accessToken: 'tok', refreshToken: 'ref' })
    )

    await authApi.register({ name: 'Juan', email: 'j@b.com', password: 'pass' })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/auth/register')
    expect(options.method).toBe('POST')
  })

  it('authApi.refresh llama a /auth/refresh con POST', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({ accessToken: 'new', refreshToken: 'new-ref' })
    )

    await authApi.refresh('old-refresh-token')

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/auth/refresh')
    expect(options.method).toBe('POST')
  })
})
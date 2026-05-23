/**
 * Tests for authStore (src/stores/authStore.ts)
 */

// ─── Mock IDB ─────────────────────────────────────────────────────────────────
const mockGetMeta = jest.fn()
const mockSetMeta = jest.fn()
const mockDeleteMeta = jest.fn()

jest.mock('@/lib/db', () => ({
  getMeta: (...a: unknown[]) => mockGetMeta(...a),
  setMeta: (...a: unknown[]) => mockSetMeta(...a),
  deleteMeta: (...a: unknown[]) => mockDeleteMeta(...a),
}))

// ─── Mock API ─────────────────────────────────────────────────────────────────
const mockLogin = jest.fn()
const mockRegister = jest.fn()
const mockMe = jest.fn()
const mockRefresh = jest.fn()

// ApiError must be defined inside the factory to avoid hoisting issues
jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code = code
      this.status = status
      this.name = 'ApiError'
    }
  }
  return {
    authApi: {
      login: (...a: unknown[]) => mockLogin(...a),
      register: (...a: unknown[]) => mockRegister(...a),
      me: (...a: unknown[]) => mockMe(...a),
      refresh: (...a: unknown[]) => mockRefresh(...a),
    },
    ApiError,
  }
})

// Re-export the class so tests can use `new MockApiError()`
const { ApiError: MockApiError } = jest.requireMock('@/lib/api') as {
  ApiError: new (
    code: string,
    message: string,
    status: number
  ) => Error & { code: string; status: number }
}

import { act } from 'react'
import { useAuthStore } from '../authStore'

const fakeUser = {
  id: 'user-1',
  name: 'Juan',
  email: 'juan@example.com',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

const fakeTokens = {
  user: fakeUser,
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
}

describe('authStore — login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    mockSetMeta.mockResolvedValue(undefined)
    mockDeleteMeta.mockResolvedValue(undefined)
  })

  it('sets user and token on successful login', async () => {
    mockLogin.mockResolvedValue(fakeTokens)

    await act(async () => {
      await useAuthStore.getState().login('juan@example.com', 'password', false)
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.name).toBe('Juan')
    expect(state.accessToken).toBe('access-token-123')
    expect(state.error).toBeNull()
  })

  it('saves tokens to IDB on successful login', async () => {
    mockLogin.mockResolvedValue(fakeTokens)

    await act(async () => {
      await useAuthStore.getState().login('juan@example.com', 'password', false)
    })

    expect(mockSetMeta).toHaveBeenCalledWith('accessToken', 'access-token-123')
    expect(mockSetMeta).toHaveBeenCalledWith('refreshToken', 'refresh-token-456')
    expect(mockSetMeta).toHaveBeenCalledWith('user', fakeUser)
  })

  it('shows friendly message on UNAUTHORIZED error', async () => {
    mockLogin.mockRejectedValue(new MockApiError('UNAUTHORIZED', 'No autorizado.', 401))

    await act(async () => {
      try {
        await useAuthStore.getState().login('bad@email.com', 'wrong', false)
      } catch {
        // expected
      }
    })

    expect(useAuthStore.getState().error).toBe('Email o contraseña incorrectos')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('shows friendly message on TOO_MANY_REQUESTS error', async () => {
    mockLogin.mockRejectedValue(new MockApiError('TOO_MANY_REQUESTS', 'Rate limit exceeded', 429))

    await act(async () => {
      try {
        await useAuthStore.getState().login('juan@example.com', 'pass', false)
      } catch {
        // expected
      }
    })

    expect(useAuthStore.getState().error).toBe('Demasiados intentos. Intenta más tarde')
  })

  it('resets isLoading to false after login failure', async () => {
    mockLogin.mockRejectedValue(new MockApiError('UNAUTHORIZED', 'No autorizado.', 401))

    await act(async () => {
      try {
        await useAuthStore.getState().login('x@x.com', 'wrong', false)
      } catch {
        // expected
      }
    })

    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

describe('authStore — register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    mockSetMeta.mockResolvedValue(undefined)
  })

  it('sets user and token on successful register', async () => {
    mockRegister.mockResolvedValue(fakeTokens)

    await act(async () => {
      await useAuthStore.getState().register('Juan', 'juan@example.com', 'password')
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.name).toBe('Juan')
  })

  it('shows "Ya existe una cuenta" on CONFLICT error', async () => {
    mockRegister.mockRejectedValue(
      new MockApiError('CONFLICT', 'Ya existe una cuenta con ese email', 409)
    )

    await act(async () => {
      try {
        await useAuthStore.getState().register('Juan', 'existing@email.com', 'pass')
      } catch {
        // expected
      }
    })

    expect(useAuthStore.getState().error).toBe('Ya existe una cuenta con ese email')
  })
})

describe('authStore — logout', () => {
  beforeEach(() => {
    mockDeleteMeta.mockResolvedValue(undefined)
    useAuthStore.setState({
      user: fakeUser,
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    })
  })

  it('clears user and token state', async () => {
    await act(async () => {
      await useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('deletes tokens from IDB', async () => {
    await act(async () => {
      await useAuthStore.getState().logout()
    })

    expect(mockDeleteMeta).toHaveBeenCalledWith('accessToken')
    expect(mockDeleteMeta).toHaveBeenCalledWith('refreshToken')
    expect(mockDeleteMeta).toHaveBeenCalledWith('user')
  })
})

describe('authStore — clearError', () => {
  it('clears the error field', () => {
    useAuthStore.setState({ error: 'Some error' })
    useAuthStore.getState().clearError()
    expect(useAuthStore.getState().error).toBeNull()
  })
})

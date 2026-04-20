/**
 * @file src/tests/stores/authStore.test.ts
 * Tests para el authStore de Zustand.
 * Se mockean lib/db y lib/api para aislar la lógica del store.
 */

import { act } from '@testing-library/react'

// Mocks

const mockGetMeta = jest.fn()
const mockSetMeta = jest.fn()
const mockDeleteMeta = jest.fn()

jest.mock('@/lib/db', () => ({
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
  setMeta: (...args: unknown[]) => mockSetMeta(...args),
  deleteMeta: (...args: unknown[]) => mockDeleteMeta(...args),
}))

const mockAuthApiLogin = jest.fn()
const mockAuthApiRegister = jest.fn()
const mockAuthApiMe = jest.fn()
const mockAuthApiRefresh = jest.fn()

jest.mock('@/lib/api', () => ({
  authApi: {
    login: (...args: unknown[]) => mockAuthApiLogin(...args),
    register: (...args: unknown[]) => mockAuthApiRegister(...args),
    me: (...args: unknown[]) => mockAuthApiMe(...args),
    refresh: (...args: unknown[]) => mockAuthApiRefresh(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

// Importación del store

import { useAuthStore } from '@/stores/authStore'

// Fixture de usuario de prueba
const mockUser = { id: 'u1', name: 'Ana García', email: 'ana@test.com' }

function resetStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  resetStore()
})

// Estado inicial

describe('authStore — estado inicial', () => {
  it('comienza sin usuario autenticado', () => {
    const { user, isAuthenticated, accessToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
    expect(accessToken).toBeNull()
  })

  it('isLoading empieza en false', () => {
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

// clearError

describe('clearError', () => {
  it('limpia el error del estado', () => {
    useAuthStore.setState({ error: 'Algo salió mal' })
    act(() => useAuthStore.getState().clearError())
    expect(useAuthStore.getState().error).toBeNull()
  })
})

// login

describe('login', () => {
  it('establece user, accessToken e isAuthenticated tras login exitoso', async () => {
    mockAuthApiLogin.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'access-tok',
      refreshToken: 'refresh-tok',
    })
    mockSetMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().login('ana@test.com', 'password', false)
    })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('access-tok')
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('guarda tokens en IDB tras login exitoso', async () => {
    mockAuthApiLogin.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'tok',
      refreshToken: 'ref',
    })
    mockSetMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().login('ana@test.com', 'pass', true)
    })

    expect(mockSetMeta).toHaveBeenCalledWith('accessToken', 'tok')
    expect(mockSetMeta).toHaveBeenCalledWith('refreshToken', 'ref')
    expect(mockSetMeta).toHaveBeenCalledWith('user', mockUser)
  })

  it('establece error y lanza excepción si el login falla', async () => {
    const { ApiError } = await import('@/lib/api')
    mockAuthApiLogin.mockRejectedValueOnce(new ApiError('INVALID_CREDENTIALS', 'Credenciales inválidas', 401))

    await expect(
      act(async () => {
        await useAuthStore.getState().login('bad@test.com', 'wrong', false)
      })
    ).rejects.toBeDefined()

    expect(useAuthStore.getState().error).toBe('Credenciales inválidas')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('isLoading vuelve a false después del login (exitoso o fallido)', async () => {
    mockAuthApiLogin.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'tok',
      refreshToken: 'ref',
    })
    mockSetMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().login('ana@test.com', 'pass', false)
    })

    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

// register

describe('register', () => {
  it('establece user e isAuthenticated tras registro exitoso', async () => {
    mockAuthApiRegister.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'tok',
      refreshToken: 'ref',
    })
    mockSetMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().register('Ana', 'ana@test.com', 'pass')
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('establece error si el registro falla', async () => {
    const { ApiError } = await import('@/lib/api')
    mockAuthApiRegister.mockRejectedValueOnce(new ApiError('EMAIL_TAKEN', 'Email en uso', 409))

    await expect(
      act(async () => {
        await useAuthStore.getState().register('Ana', 'taken@test.com', 'pass')
      })
    ).rejects.toBeDefined()

    expect(useAuthStore.getState().error).toBe('Email en uso')
  })
})

// logout

describe('logout', () => {
  it('limpia el estado de autenticación', async () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok', isAuthenticated: true })
    mockDeleteMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('elimina los tokens de IDB al hacer logout', async () => {
    mockDeleteMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().logout()
    })

    expect(mockDeleteMeta).toHaveBeenCalledWith('accessToken')
    expect(mockDeleteMeta).toHaveBeenCalledWith('refreshToken')
    expect(mockDeleteMeta).toHaveBeenCalledWith('user')
  })
})

// loadFromStorage

describe('loadFromStorage', () => {
  it('no hace nada si no hay tokens en IDB', async () => {
    mockGetMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().loadFromStorage()
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('autentica al usuario si el token sigue válido', async () => {
    mockGetMeta.mockImplementation(async (key: string) => {
      if (key === 'accessToken') return 'valid-token'
      if (key === 'user') return mockUser
      return undefined
    })
    mockAuthApiMe.mockResolvedValueOnce({ user: mockUser })
    mockSetMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().loadFromStorage()
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('limpia el estado si el token expiró y no hay refreshToken', async () => {
    mockGetMeta.mockImplementation(async (key: string) => {
      if (key === 'accessToken') return 'expired-token'
      if (key === 'user') return mockUser
      if (key === 'refreshToken') return undefined
      return undefined
    })
    mockAuthApiMe.mockRejectedValueOnce(new Error('Token expirado'))
    mockDeleteMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().loadFromStorage()
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('isLoading vuelve a false al terminar loadFromStorage', async () => {
    mockGetMeta.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().loadFromStorage()
    })

    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
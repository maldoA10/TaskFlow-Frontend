/**
 * @file src/tests/hooks/useAuth.test.ts
 * Tests para el hook useAuth.
 * Se mockea el authStore para aislar el hook de sus dependencias.
 */

import { renderHook } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

// Mock del store — controlamos su estado en cada test
const mockLoadFromStorage = jest.fn()
const mockStore = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  accessToken: null,
  error: null,
  loadFromStorage: mockLoadFromStorage,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  clearError: jest.fn(),
}

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(() => mockStore),
}))

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStore.isAuthenticated = false
    mockStore.isLoading = false
  })

  it('llama a loadFromStorage al montar si el usuario no está autenticado y no está cargando', () => {
    renderHook(() => useAuth())
    expect(mockLoadFromStorage).toHaveBeenCalledTimes(1)
  })

  it('NO llama a loadFromStorage si ya está autenticado', () => {
    mockStore.isAuthenticated = true
    renderHook(() => useAuth())
    expect(mockLoadFromStorage).not.toHaveBeenCalled()
  })

  it('NO llama a loadFromStorage si ya está cargando', () => {
    mockStore.isLoading = true
    renderHook(() => useAuth())
    expect(mockLoadFromStorage).not.toHaveBeenCalled()
  })

  it('devuelve el estado del store completo', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('expone las acciones del store', () => {
    const { result } = renderHook(() => useAuth())
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
    expect(typeof result.current.register).toBe('function')
    expect(typeof result.current.clearError).toBe('function')
  })
})
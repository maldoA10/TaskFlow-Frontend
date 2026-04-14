'use client'

import { create } from 'zustand'
import type { User } from '@/types'
import { getMeta, setMeta, deleteMeta } from '@/lib/db'
import { authApi, ApiError } from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (_email: string, _password: string, _remember: boolean) => Promise<void>
  register: (_name: string, _email: string, _password: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadFromStorage: async () => {
    if (typeof window === 'undefined') return
    set({ isLoading: true })
    try {
      const accessToken = await getMeta<string>('accessToken')
      const user = await getMeta<User>('user')
      if (accessToken && user) {
        // Validar que el token sigue siendo válido
        try {
          const { user: freshUser } = (await authApi.me()) as { user: User }
          await setMeta('user', freshUser)
          set({ user: freshUser, accessToken, isAuthenticated: true })
        } catch {
          // Token expirado — intentar refresh
          const refreshToken = await getMeta<string>('refreshToken')
          if (refreshToken) {
            try {
              const tokens = (await authApi.refresh(refreshToken)) as {
                accessToken: string
                refreshToken: string
              }
              await setMeta('accessToken', tokens.accessToken)
              await setMeta('refreshToken', tokens.refreshToken)
              set({ user, accessToken: tokens.accessToken, isAuthenticated: true })
            } catch {
              await clearTokens()
              set({ user: null, accessToken: null, isAuthenticated: false })
            }
          } else {
            await clearTokens()
            set({ user: null, accessToken: null, isAuthenticated: false })
          }
        }
      }
    } finally {
      set({ isLoading: false })
    }
  },

  login: async (email, password, remember) => {
    set({ isLoading: true, error: null })
    try {
      const result = (await authApi.login({ email, password, remember })) as {
        user: User
        accessToken: string
        refreshToken: string
      }
      // Guardar en IDB — sólo disponible en cliente
      if (typeof window !== 'undefined') {
        await setMeta('accessToken', result.accessToken)
        await setMeta('refreshToken', result.refreshToken)
        await setMeta('user', result.user)
      }
      set({ user: result.user, accessToken: result.accessToken, isAuthenticated: true })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al iniciar sesión'
      set({ error: msg })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const result = (await authApi.register({ name, email, password })) as {
        user: User
        accessToken: string
        refreshToken: string
      }
      // Guardar en IDB — sólo disponible en cliente
      if (typeof window !== 'undefined') {
        await setMeta('accessToken', result.accessToken)
        await setMeta('refreshToken', result.refreshToken)
        await setMeta('user', result.user)
      }
      set({ user: result.user, accessToken: result.accessToken, isAuthenticated: true })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al registrarse'
      set({ error: msg })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    await clearTokens()
    set({ user: null, accessToken: null, isAuthenticated: false, error: null })
  },
}))

async function clearTokens() {
  await deleteMeta('accessToken')
  await deleteMeta('refreshToken')
  await deleteMeta('user')
}

// Helper para acceder al token fuera de React
export function getStoreToken(): string | null {
  return useAuthStore.getState().accessToken
}

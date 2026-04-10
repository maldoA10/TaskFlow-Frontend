'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { OnlineStatusDot } from '@/components/layout/OfflineIndicator'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, loadFromStorage, user, logout } = useAuthStore()

  useEffect(() => {
    loadFromStorage().then(() => {
      const { isAuthenticated: auth } = useAuthStore.getState()
      if (!auth) router.push('/login')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent-indigo animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <header className="h-12 border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded bg-accent-indigo flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="3" width="10" height="1.8" rx="0.9" fill="white" />
              <rect x="2" y="6" width="7" height="1.8" rx="0.9" fill="white" fillOpacity="0.7" />
              <rect x="2" y="9" width="4" height="1.8" rx="0.9" fill="white" fillOpacity="0.4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-text-primary">TaskFlow</span>
        </div>

        <div className="flex-1" />

        {/* Status + User */}
        <OnlineStatusDot />
        <div className="flex items-center gap-2 pl-3 border-l border-border-subtle">
          <div className="w-7 h-7 rounded-full bg-accent-indigo/20 border border-accent-indigo/30 flex items-center justify-center text-xs font-semibold text-accent-indigo">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  )
}

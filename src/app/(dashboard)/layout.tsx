'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { useBoardStore } from '@/stores/boardStore'
import { OnlineStatusDot } from '@/components/layout/OfflineIndicator'
import { Loader2, LayoutGrid, Plus, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { clsx } from 'clsx'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, loadFromStorage, user, logout } = useAuthStore()
  const { boards, fetchBoards } = useBoardStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadFromStorage().then(() => {
      const { isAuthenticated: auth } = useAuthStore.getState()
      if (!auth) router.push('/login')
      else fetchBoards()
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

  const activeBoardId = pathname.startsWith('/board/') ? pathname.split('/')[2] : null

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Top header */}
      <header className="h-12 border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 gap-3">
        {/* Logo */}
        <Link href="/boards" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="w-6 h-6 rounded bg-accent-indigo flex items-center justify-center group-hover:bg-accent-indigo/90 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="3" width="10" height="1.8" rx="0.9" fill="white" />
              <rect x="2" y="6" width="7" height="1.8" rx="0.9" fill="white" fillOpacity="0.7" />
              <rect x="2" y="9" width="4" height="1.8" rx="0.9" fill="white" fillOpacity="0.4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-text-primary">TaskFlow</span>
        </Link>

        <div className="flex-1" />

        <OnlineStatusDot />

        {/* User menu */}
        <div className="flex items-center gap-2 pl-3 border-l border-border-subtle">
          <div className="w-7 h-7 rounded-full bg-accent-indigo/20 border border-accent-indigo/30 flex items-center justify-center text-xs font-semibold text-accent-indigo">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-xs text-text-secondary hidden sm:block max-w-[120px] truncate">
            {user?.name}
          </span>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-accent-rose hover:bg-accent-rose/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={clsx(
            'flex-shrink-0 bg-bg-secondary border-r border-border-subtle flex flex-col transition-all duration-200 overflow-hidden',
            sidebarOpen ? 'w-56' : 'w-12'
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-11 px-3 border-b border-border-subtle flex-shrink-0">
            {sidebarOpen && (
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Tableros
              </span>
            )}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={clsx(
                'w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors',
                !sidebarOpen && 'mx-auto'
              )}
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Board list */}
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            <Link
              href="/boards"
              className={clsx(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors group',
                pathname === '/boards'
                  ? 'bg-accent-indigo/15 text-accent-indigo'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              )}
              title={!sidebarOpen ? 'Todos los tableros' : undefined}
            >
              <LayoutGrid className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">Todos los tableros</span>}
            </Link>

            {sidebarOpen && boards.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border-subtle space-y-0.5">
                {boards.map((board) => (
                  <Link
                    key={board.id}
                    href={`/board/${board.id}`}
                    className={clsx(
                      'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors group',
                      activeBoardId === board.id
                        ? 'bg-bg-elevated text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: board.color }}
                    />
                    <span className="truncate">{board.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {!sidebarOpen &&
              boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className={clsx(
                    'flex items-center justify-center py-1.5 rounded-lg transition-colors mt-0.5',
                    activeBoardId === board.id ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'
                  )}
                  title={board.name}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: board.color }}
                  />
                </Link>
              ))}
          </nav>

          {/* Create board shortcut */}
          <div className="flex-shrink-0 p-2 border-t border-border-subtle">
            <Link
              href="/boards"
              onClick={() => {
                // Trigger create modal via URL or state
                setTimeout(() => {
                  const btn = document.querySelector<HTMLButtonElement>('[data-create-board]')
                  btn?.click()
                }, 100)
              }}
              className={clsx(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors',
                !sidebarOpen && 'justify-center'
              )}
              title={!sidebarOpen ? 'Nuevo tablero' : undefined}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>Nuevo tablero</span>}
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

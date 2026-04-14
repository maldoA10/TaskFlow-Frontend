'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus()

  if (isOnline && !wasOffline) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300',
        isOnline
          ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
          : 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          isOnline ? 'bg-accent-emerald animate-pulse' : 'bg-accent-amber'
        )}
      />
      <span>{isOnline ? 'Sincronizando...' : 'Sin conexión'}</span>
    </div>
  )
}

// Versión compacta para header
export function OnlineStatusDot() {
  const { isOnline } = useOnlineStatus()

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          isOnline ? 'bg-accent-emerald' : 'bg-accent-amber animate-pulse'
        )}
      />
      <span className="hidden sm:inline">{isOnline ? 'En línea' : 'Sin conexión'}</span>
    </div>
  )
}

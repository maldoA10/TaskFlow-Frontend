'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { onSyncStateChange, type SyncState } from '@/lib/sync'
import { clsx } from 'clsx'

export function SyncIndicator() {
  const [state, setState] = useState<SyncState>('idle')
  const [applied, setApplied] = useState<number | null>(null)
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    const unsub = onSyncStateChange((s: SyncState, count?: number) => {
      setState(s)
      if (s === 'idle' && count !== undefined && count > 0) {
        setApplied(count)
        setShowBadge(true)
        // Ocultar después de 3s
        setTimeout(() => setShowBadge(false), 3000)
      }
      if (s === 'error') {
        setShowBadge(true)
      }
    })
    return () => {
      unsub()
    }
  }, [])

  if (state === 'idle' && !showBadge) return null

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all',
        state === 'syncing' && 'text-text-secondary border-border-subtle bg-bg-elevated',
        state === 'idle' &&
          showBadge &&
          'text-accent-emerald border-accent-emerald/30 bg-accent-emerald/10',
        state === 'error' && 'text-accent-rose border-accent-rose/30 bg-accent-rose/10'
      )}
    >
      {state === 'syncing' && (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Sincronizando</span>
        </>
      )}
      {state === 'idle' && showBadge && (
        <>
          <CheckCircle2 className="w-3 h-3" />
          <span>
            {applied} cambio{applied !== 1 ? 's' : ''} sincronizado{applied !== 1 ? 's' : ''}
          </span>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>Error de sync</span>
        </>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Check, X, Clock } from 'lucide-react'
import type { Invitation } from '@/types'
import { invitationsApi } from '@/lib/api'
import { useBoardStore } from '@/stores/boardStore'
import { clsx } from 'clsx'

export default function InvitationsPage() {
  const router = useRouter()
  const { fetchBoards } = useBoardStore()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    invitationsApi
      .list()
      .then(({ invitations: inv }) => setInvitations(inv))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handle = async (id: string, action: 'accept' | 'reject') => {
    setProcessingId(id)
    try {
      if (action === 'accept') {
        const { invitation } = await invitationsApi.accept(id)
        // Refresh boards list and navigate to the new board
        await fetchBoards()
        router.push(`/board/${invitation.boardId}`)
        return
      } else {
        await invitationsApi.reject(id)
      }
      setInvitations((prev) => prev.filter((i) => i.id !== id))
    } catch {
      // silent
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-accent-indigo/20 border border-accent-indigo/30 flex items-center justify-center">
          <Mail className="w-4.5 h-4.5 text-accent-indigo" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Invitaciones</h1>
          <p className="text-sm text-text-secondary">Tableros a los que has sido invitado</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-accent-indigo/40 border-t-accent-indigo rounded-full animate-spin" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-10 h-10 text-text-secondary/30 mb-3" />
          <p className="text-text-secondary text-sm">No tienes invitaciones pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="bg-bg-secondary border border-border-subtle rounded-xl p-4 flex items-center gap-4"
            >
              {/* Board color swatch */}
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0"
                style={{ background: inv.board?.color ?? '#6366F1' }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {inv.board?.name ?? 'Tablero desconocido'}
                </p>
                <p className="text-xs text-text-secondary">
                  Invitado por{' '}
                  <span className="text-text-primary">
                    {inv.inviter?.name ?? inv.inviter?.email ?? 'alguien'}
                  </span>
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Expira el{' '}
                  {new Date(inv.expiresAt).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handle(inv.id, 'reject')}
                  disabled={processingId === inv.id}
                  className={clsx(
                    'w-8 h-8 rounded-lg border flex items-center justify-center transition-colors',
                    'border-border-subtle text-text-secondary hover:text-accent-rose hover:border-accent-rose/40',
                    'disabled:opacity-40'
                  )}
                  title="Rechazar"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handle(inv.id, 'accept')}
                  disabled={processingId === inv.id}
                  className={clsx(
                    'w-8 h-8 rounded-lg border flex items-center justify-center transition-colors',
                    'border-accent-emerald/40 text-accent-emerald hover:bg-accent-emerald/10',
                    'disabled:opacity-40'
                  )}
                  title="Aceptar"
                >
                  {processingId === inv.id ? (
                    <div className="w-3 h-3 border border-accent-emerald/40 border-t-accent-emerald rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

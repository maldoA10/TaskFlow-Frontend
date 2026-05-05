'use client'

import { useState } from 'react'
import { X, UserPlus, Crown, User } from 'lucide-react'
import type { BoardMember } from '@/types'
import { invitationsApi } from '@/lib/api'
import { clsx } from 'clsx'

interface MembersPanelProps {
  boardId: string
  members: (BoardMember & {
    user?: { id: string; name: string; email: string; avatarUrl?: string }
  })[]
  onClose: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function MembersPanel({ boardId, members, onClose }: MembersPanelProps) {
  const [email, setEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsInviting(true)
    setMessage(null)
    try {
      await invitationsApi.invite(boardId, email.trim())
      setMessage({ type: 'ok', text: `Invitación enviada a ${email.trim()}` })
      setEmail('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar invitación'
      setMessage({ type: 'err', text: msg })
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-bg-secondary border-l border-border-subtle shadow-2xl shadow-black/40 flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Miembros del tablero</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-elevated border border-border-subtle"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-accent-indigo/20 border border-accent-indigo/30 flex items-center justify-center flex-shrink-0">
                {m.user?.avatarUrl ? (
                  <img
                    src={m.user.avatarUrl}
                    alt={m.user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-accent-indigo">
                    {m.user ? getInitials(m.user.name) : <User className="w-3.5 h-3.5" />}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {m.user?.name ?? 'Usuario desconocido'}
                </p>
                <p className="text-xs text-text-secondary truncate">{m.user?.email}</p>
              </div>

              {/* Role badge */}
              {m.role === 'OWNER' && (
                <span className="flex items-center gap-1 text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-full px-2 py-0.5 flex-shrink-0">
                  <Crown className="w-3 h-3" /> Owner
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Invite form */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border-subtle space-y-3">
          <p className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Invitar por email
          </p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="flex-1 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo transition-colors"
            />
            <button
              type="submit"
              disabled={isInviting || !email.trim()}
              className="px-3 py-2 bg-accent-indigo hover:bg-accent-indigo/90 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isInviting ? '…' : 'Invitar'}
            </button>
          </form>
          {message && (
            <p
              className={clsx(
                'text-xs px-2 py-1.5 rounded',
                message.type === 'ok'
                  ? 'text-accent-emerald bg-accent-emerald/10'
                  : 'text-accent-rose bg-accent-rose/10'
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

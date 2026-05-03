'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { ConflictItem } from '@/lib/sync'
import { resolveConflict } from '@/lib/sync'
import { clsx } from 'clsx'

interface ConflictModalProps {
  conflicts: ConflictItem[]
  onClose: () => void
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

export function ConflictModal({ conflicts, onClose }: ConflictModalProps) {
  const [index, setIndex] = useState(0)
  const [resolved, setResolved] = useState<Record<string, 'keep-local' | 'use-server'>>({})
  const [isResolving, setIsResolving] = useState(false)

  const conflict = conflicts[index]
  const serverTask = conflict?.serverData as Record<string, unknown> | null

  const resolve = async (choice: 'keep-local' | 'use-server') => {
    setResolved((r) => ({ ...r, [conflict.entityId]: choice }))
    await resolveConflict(conflict, choice)
    if (index < conflicts.length - 1) {
      setIndex((i) => i + 1)
    }
  }

  const finish = async () => {
    setIsResolving(true)
    // Resolver todos los que quedan sin resolver como "use-server"
    for (const c of conflicts) {
      if (!resolved[c.entityId]) {
        await resolveConflict(c, 'use-server')
      }
    }
    onClose()
  }

  const allResolved = conflicts.every((c) => resolved[c.entityId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-bg-secondary border border-accent-amber/40 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle bg-accent-amber/5">
          <AlertTriangle className="w-5 h-5 text-accent-amber flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-text-primary">
              Conflicto de sincronización
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {conflicts.length} conflicto{conflicts.length !== 1 ? 's' : ''} detectado
              {conflicts.length !== 1 ? 's' : ''} — tu versión difiere del servidor
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!allResolved && conflict && (
          <div className="p-5 space-y-4">
            {/* Contador */}
            {conflicts.length > 1 && (
              <div className="flex gap-1">
                {conflicts.map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'h-1 flex-1 rounded-full transition-colors',
                      i < index
                        ? 'bg-accent-emerald'
                        : i === index
                          ? 'bg-accent-amber'
                          : 'bg-border-subtle'
                    )}
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-text-secondary">
              Entidad:{' '}
              <span className="font-mono text-text-primary">{conflict.entityId.slice(0, 8)}…</span>
              {' · '}Tipo: <span className="text-text-primary">{conflict.entityType}</span>
            </p>

            {/* Comparación lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-accent-indigo">Tu versión (local)</p>
                <div className="bg-bg-elevated rounded-lg p-3 text-xs font-mono text-text-secondary overflow-auto max-h-40 space-y-1">
                  {Object.entries(conflict.localPayload).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-accent-indigo/70">{k}:</span>{' '}
                      <span className="text-text-primary">{formatValue(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-accent-emerald">Versión del servidor</p>
                <div className="bg-bg-elevated rounded-lg p-3 text-xs font-mono text-text-secondary overflow-auto max-h-40 space-y-1">
                  {serverTask ? (
                    Object.entries(serverTask)
                      .filter(([k]) => Object.keys(conflict.localPayload).includes(k))
                      .map(([k, v]) => (
                        <div key={k}>
                          <span className="text-accent-emerald/70">{k}:</span>{' '}
                          <span className="text-text-primary">{formatValue(v)}</span>
                        </div>
                      ))
                  ) : (
                    <span className="text-text-secondary/50">Sin datos</span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                onClick={() => resolve('use-server')}
                className="flex-1 py-2 rounded-lg text-sm border border-accent-emerald/40 text-accent-emerald hover:bg-accent-emerald/10 transition-colors"
              >
                Usar servidor
              </button>
              <button
                onClick={() => resolve('keep-local')}
                className="flex-1 py-2 rounded-lg text-sm border border-accent-indigo/40 text-accent-indigo hover:bg-accent-indigo/10 transition-colors"
              >
                Mantener local
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            {Object.keys(resolved).length}/{conflicts.length} resueltos
          </p>
          <button
            onClick={finish}
            disabled={isResolving}
            className="px-4 py-2 bg-accent-indigo hover:bg-accent-indigo/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isResolving
              ? 'Aplicando…'
              : allResolved
                ? 'Cerrar'
                : 'Resolver restantes con servidor'}
          </button>
        </div>
      </div>
    </div>
  )
}

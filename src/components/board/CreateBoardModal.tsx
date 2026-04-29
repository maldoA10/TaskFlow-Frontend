'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

const BOARD_COLORS = [
  '#6366F1', // indigo
  '#10B981', // emerald
  '#F59E0B', // amber
  '#F43F5E', // rose
  '#38BDF8', // sky
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
]

interface CreateBoardModalProps {
  onClose: () => void
  onSubmit: (data: { name: string; description?: string; color: string }) => Promise<void>
}

export function CreateBoardModal({ onClose, onSubmit }: CreateBoardModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(BOARD_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined, color })
      onClose()
    } catch {
      setError('No se pudo crear el tablero')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">Nuevo Tablero</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Preview banner */}
          <div
            className="h-16 rounded-lg flex items-center justify-center transition-colors duration-200"
            style={{ backgroundColor: color + '22', borderLeft: `4px solid ${color}` }}
          >
            <span className="text-sm font-semibold" style={{ color }}>
              {name || 'Mi Tablero'}
            </span>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Nombre</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Proyecto Alpha"
              maxLength={60}
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata este proyecto?"
              rows={2}
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo transition-colors resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    'w-8 h-8 rounded-full transition-all',
                    color === c
                      ? 'ring-2 ring-offset-2 ring-offset-bg-secondary scale-110'
                      : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c, ['--tw-ring-color' as string]: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-accent-rose">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-accent-indigo/40 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                isSubmitting || !name.trim()
                  ? 'bg-accent-indigo/40 text-white/50 cursor-not-allowed'
                  : 'bg-accent-indigo hover:bg-accent-indigo/90 text-white'
              )}
            >
              {isSubmitting ? 'Creando…' : 'Crear Tablero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

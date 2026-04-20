'use client'

import { useState } from 'react'
import { X, Plus, Tag } from 'lucide-react'
import type { Column } from '@/types'
import { clsx } from 'clsx'

interface CreateTaskModalProps {
  columns: Column[]
  defaultColumnId: string
  onClose: () => void
  onSubmit: (data: {
    title: string
    columnId: string
    description?: string
    priority: string
    dueDate?: string
    tags: string[]
  }) => Promise<void>
}

const PRIORITIES = [
  { value: 'LOW', label: 'Baja', color: 'text-text-secondary' },
  { value: 'MEDIUM', label: 'Media', color: 'text-accent-sky' },
  { value: 'HIGH', label: 'Alta', color: 'text-accent-amber' },
  { value: 'URGENT', label: 'Urgente', color: 'text-accent-rose' },
]

export function CreateTaskModal({ columns, defaultColumnId, onClose, onSubmit }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [columnId, setColumnId] = useState(defaultColumnId)
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags((p) => [...p, t])
    setTagInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('El título es requerido'); return }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit({
        title: title.trim(),
        columnId,
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        tags,
      })
      onClose()
    } catch {
      setError('No se pudo crear la tarea')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">Nueva Tarea</h2>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea…"
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo transition-colors"
            />
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo transition-colors resize-none"
          />

          {/* Column + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Columna</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-indigo transition-colors"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-indigo transition-colors"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Fecha límite (opcional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-indigo transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Etiquetas</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Añadir etiqueta…"
                className="flex-1 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo transition-colors"
              />
              <button type="button" onClick={addTag} className="px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-indigo transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-accent-indigo/10 text-accent-indigo/80 border border-accent-indigo/20">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                    <button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="ml-0.5 hover:text-accent-rose transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-accent-rose">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-accent-indigo/40 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                isSubmitting || !title.trim()
                  ? 'bg-accent-indigo/40 text-white/50 cursor-not-allowed'
                  : 'bg-accent-indigo hover:bg-accent-indigo/90 text-white'
              )}
            >
              {isSubmitting ? 'Creando…' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

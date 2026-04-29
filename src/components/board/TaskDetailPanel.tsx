'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Tag, AlertTriangle, Trash2, Check, Plus } from 'lucide-react'
import type { Task, Column } from '@/types'
import { clsx } from 'clsx'

const PRIORITIES: { value: Task['priority']; label: string; color: string; bg: string }[] = [
  { value: 'LOW', label: 'Baja', color: 'text-text-secondary', bg: 'bg-border-subtle' },
  { value: 'MEDIUM', label: 'Media', color: 'text-accent-sky', bg: 'bg-accent-sky/20' },
  { value: 'HIGH', label: 'Alta', color: 'text-accent-amber', bg: 'bg-accent-amber/20' },
  { value: 'URGENT', label: 'Urgente', color: 'text-accent-rose', bg: 'bg-accent-rose/20' },
]

interface TaskDetailPanelProps {
  task: Task
  columns: Column[]
  onClose: () => void
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export function TaskDetailPanel({
  task,
  columns,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState<Task['priority']>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '')
  const [tags, setTags] = useState<string[]>(task.tags)
  const [tagInput, setTagInput] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
  }, [title])

  const markDirty = () => setIsDirty(true)

  const save = async () => {
    if (!isDirty) return
    setIsSaving(true)
    try {
      await onUpdate(task.id, {
        title: title.trim() || task.title,
        description: description || undefined,
        priority,
        dueDate: dueDate || undefined,
        tags,
      })
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBlur = () => {
    if (isDirty) save()
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) {
      const next = [...tags, t]
      setTags(next)
      setIsDirty(true)
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags((p) => p.filter((t) => t !== tag))
    setIsDirty(true)
  }

  const handleDelete = async () => {
    await onDelete(task.id)
    onClose()
  }

  const currentColumn = columns.find((c) => c.id === task.columnId)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => {
          save()
          onClose()
        }}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-bg-secondary border-l border-border-subtle shadow-2xl shadow-black/40 flex flex-col h-full animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentColumn && (
              <span className="text-xs text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-full">
                {currentColumn.name}
              </span>
            )}
            {isSaving && (
              <span className="text-xs text-text-secondary animate-pulse">Guardando…</span>
            )}
            {isDirty && !isSaving && (
              <button
                onClick={save}
                className="flex items-center gap-1 text-xs text-accent-indigo hover:text-accent-indigo/80 transition-colors"
              >
                <Check className="w-3 h-3" /> Guardar
              </button>
            )}
          </div>
          <button
            onClick={() => {
              save()
              onClose()
            }}
            className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div>
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                markDirty()
              }}
              onBlur={handleBlur}
              className="w-full bg-transparent text-lg font-semibold text-text-primary resize-none focus:outline-none leading-snug min-h-[2rem]"
              rows={1}
            />
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">Prioridad</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPriority(p.value)
                    setIsDirty(true)
                  }}
                  className={clsx(
                    'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    priority === p.value
                      ? `${p.color} ${p.bg} border-current`
                      : 'text-text-secondary border-border-subtle hover:border-accent-indigo/40'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                markDirty()
              }}
              onBlur={handleBlur}
              placeholder="Agrega una descripción…"
              rows={4}
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo transition-colors resize-none"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs text-text-secondary mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Fecha límite
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value)
                markDirty()
              }}
              onBlur={handleBlur}
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-indigo transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-text-secondary mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Etiquetas
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Nueva etiqueta…"
                className="flex-1 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo transition-colors"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-indigo transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-accent-indigo/10 text-accent-indigo/80 border border-accent-indigo/20"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-accent-rose transition-colors text-sm leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-2 border-t border-border-subtle">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Versión</span>
                <span className="font-mono text-text-secondary">v{task.version}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Creada</span>
                <span className="text-text-secondary">
                  {new Date(task.createdAt).toLocaleDateString('es')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — delete */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-border-subtle">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-accent-rose flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> ¿Eliminar esta tarea?
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded border border-border-subtle transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-white bg-accent-rose hover:bg-accent-rose/90 px-3 py-1.5 rounded transition-colors"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent-rose transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar tarea
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

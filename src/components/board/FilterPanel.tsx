'use client'

import { X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Priority, BoardMember } from '@/types'

export interface ActiveFilters {
  priorities: Priority[]
  assigneeIds: string[]
  tags: string[]
}

export const EMPTY_FILTERS: ActiveFilters = {
  priorities: [],
  assigneeIds: [],
  tags: [],
}

export function hasActiveFilters(f: ActiveFilters): boolean {
  return f.priorities.length > 0 || f.assigneeIds.length > 0 || f.tags.length > 0
}

/**
 * Returns true if the task passes all active filters (intersection logic).
 */
export function taskPassesFilters(
  task: { priority: Priority; assigneeId?: string; tags: string[] },
  filters: ActiveFilters
): boolean {
  if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false
  if (filters.assigneeIds.length > 0) {
    if (!task.assigneeId || !filters.assigneeIds.includes(task.assigneeId)) return false
  }
  if (filters.tags.length > 0) {
    const taskTagSet = new Set(task.tags)
    if (!filters.tags.some((t) => taskTagSet.has(t))) return false
  }
  return true
}

// ─── Priority chip config ────────────────────────────────────────────────────

const PRIORITIES: { value: Priority; label: string; color: string; ring: string }[] = [
  {
    value: 'URGENT',
    label: 'Urgente',
    color: 'bg-accent-rose/10 text-accent-rose border-accent-rose/30',
    ring: 'ring-accent-rose',
  },
  {
    value: 'HIGH',
    label: 'Alta',
    color: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
    ring: 'ring-accent-amber',
  },
  {
    value: 'MEDIUM',
    label: 'Media',
    color: 'bg-accent-sky/10 text-accent-sky border-accent-sky/30',
    ring: 'ring-accent-sky',
  },
  {
    value: 'LOW',
    label: 'Baja',
    color: 'bg-border-subtle/30 text-text-secondary border-border-subtle',
    ring: 'ring-border-active',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface FilterPanelProps {
  members: (BoardMember & {
    user: { id: string; name: string; email: string; avatarUrl?: string }
  })[]
  allTags: string[]
  filters: ActiveFilters
  onChange: (filters: ActiveFilters) => void
}

export function FilterPanel({ members, allTags, filters, onChange }: FilterPanelProps) {
  function togglePriority(p: Priority) {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p]
    onChange({ ...filters, priorities: next })
  }

  function toggleAssignee(id: string) {
    const next = filters.assigneeIds.includes(id)
      ? filters.assigneeIds.filter((x) => x !== id)
      : [...filters.assigneeIds, id]
    onChange({ ...filters, assigneeIds: next })
  }

  function toggleTag(tag: string) {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((x) => x !== tag)
      : [...filters.tags, tag]
    onChange({ ...filters, tags: next })
  }

  const active = hasActiveFilters(filters)

  return (
    <div className="flex items-center gap-3 flex-wrap px-6 pb-3">
      {/* Priority chips */}
      <div className="flex items-center gap-1.5">
        {PRIORITIES.map(({ value, label, color, ring }) => {
          const isActive = filters.priorities.includes(value)
          return (
            <button
              key={value}
              onClick={() => togglePriority(value)}
              className={clsx(
                'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-100',
                color,
                isActive && `ring-1 ${ring} ring-offset-1 ring-offset-bg-primary`
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Assignee avatars */}
      {members.length > 0 && (
        <div className="flex items-center gap-1">
          {members.map((m) => {
            const isActive = filters.assigneeIds.includes(m.user.id)
            return (
              <button
                key={m.user.id}
                onClick={() => toggleAssignee(m.user.id)}
                title={m.user.name}
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-100',
                  isActive
                    ? 'bg-accent-indigo text-white ring-2 ring-accent-indigo ring-offset-1 ring-offset-bg-primary'
                    : 'bg-accent-indigo/20 text-accent-indigo border border-border-subtle hover:bg-accent-indigo/30'
                )}
              >
                {m.user.name[0].toUpperCase()}
              </button>
            )
          })}
        </div>
      )}

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {allTags.map((tag) => {
            const isActive = filters.tags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'text-[10px] font-mono px-2 py-0.5 rounded border transition-all duration-100',
                  isActive
                    ? 'bg-accent-indigo/20 text-accent-indigo border-accent-indigo/40 ring-1 ring-accent-indigo/40'
                    : 'bg-bg-elevated text-text-secondary border-border-subtle hover:border-accent-indigo/30 hover:text-accent-indigo/70'
                )}
              >
                #{tag}
              </button>
            )
          })}
        </div>
      )}

      {/* Clear button */}
      {active && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-accent-rose transition-colors ml-1"
        >
          <X className="w-3 h-3" />
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

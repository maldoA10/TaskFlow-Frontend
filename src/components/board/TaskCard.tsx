'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, Tag } from 'lucide-react'
import type { Task } from '@/types'
import { clsx } from 'clsx'

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  LOW: 'bg-border-subtle',
  MEDIUM: 'bg-accent-sky',
  HIGH: 'bg-accent-amber',
  URGENT: 'bg-accent-rose',
}

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
  isDragging?: boolean
  dimmed?: boolean
}

export function TaskCard({ task, onClick, isDragging, dimmed }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dueSoon = task.dueDate
    ? new Date(task.dueDate) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    : false
  const overdue = task.dueDate ? new Date(task.dueDate) < new Date() : false

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={clsx(
        'group relative bg-bg-secondary border border-border-subtle rounded-lg p-3 cursor-pointer',
        'hover:border-accent-indigo/40 hover:bg-bg-elevated transition-all duration-150',
        'select-none touch-none',
        isSortableDragging && 'opacity-40',
        isDragging && 'scale-[1.02] shadow-lg shadow-black/30 border-accent-indigo/60 rotate-1',
        dimmed && !isSortableDragging && 'opacity-30 pointer-events-none'
      )}
    >
      {/* Priority bar */}
      <div
        className={clsx(
          'absolute left-0 top-2 bottom-2 w-0.5 rounded-full',
          PRIORITY_COLORS[task.priority]
        )}
      />

      <div className="pl-2">
        {/* Title */}
        <p className="text-sm text-text-primary font-medium leading-snug line-clamp-2 mb-2">
          {task.title}
        </p>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-indigo/10 text-accent-indigo/80 border border-accent-indigo/20"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px] text-text-secondary">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: priority + due date */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-text-secondary/70">
            {PRIORITY_LABEL[task.priority]}
          </span>

          {task.dueDate && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-[10px]',
                overdue ? 'text-accent-rose' : dueSoon ? 'text-accent-amber' : 'text-text-secondary'
              )}
            >
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString('es', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Overlay clone shown during drag
export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="relative bg-bg-secondary border border-accent-indigo/60 rounded-lg p-3 shadow-xl shadow-black/40 scale-[1.02] rotate-1 w-64">
      <div
        className={clsx(
          'absolute left-0 top-2 bottom-2 w-0.5 rounded-full',
          PRIORITY_COLORS[task.priority]
        )}
      />
      <div className="pl-2">
        <p className="text-sm text-text-primary font-medium leading-snug line-clamp-2">
          {task.title}
        </p>
      </div>
    </div>
  )
}

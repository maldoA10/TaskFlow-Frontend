'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { Column, Task } from '@/types'
import { TaskCard } from './TaskCard'
import { clsx } from 'clsx'

const COLUMN_ACCENT: Record<string, string> = {
  'Por Hacer': 'text-accent-sky border-accent-sky/30',
  'En Progreso': 'text-accent-amber border-accent-amber/30',
  Completado: 'text-accent-emerald border-accent-emerald/30',
}

const COLUMN_DOT: Record<string, string> = {
  'Por Hacer': 'bg-accent-sky',
  'En Progreso': 'bg-accent-amber',
  Completado: 'bg-accent-emerald',
}

interface KanbanColumnProps {
  column: Column & { tasks: Task[] }
  onTaskClick: (task: Task) => void
  onAddTask: (columnId: string) => void
  dimmedTaskIds?: Set<string>
}

export function KanbanColumn({ column, onTaskClick, onAddTask, dimmedTaskIds }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column', column } })
  const taskIds = column.tasks.map((t) => t.id)

  const accent = COLUMN_ACCENT[column.name] ?? 'text-text-secondary border-border-subtle'
  const dot = COLUMN_DOT[column.name] ?? 'bg-border-active'

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div
        className={clsx(
          'flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 mb-0',
          'backdrop-blur-sm bg-bg-secondary/60',
          accent
        )}
      >
        <div className="flex items-center gap-2">
          <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', dot)} />
          <span className="text-sm font-semibold">{column.name}</span>
          <span className="text-xs font-mono text-text-secondary bg-bg-elevated px-1.5 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>

        <button
          onClick={() => onAddTask(column.id)}
          className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          title="Agregar tarea"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 rounded-b-xl border border-t-0 p-2 min-h-[120px] flex flex-col gap-2 transition-colors duration-150',
          accent.split(' ').find((c) => c.startsWith('border-')) ?? 'border-border-subtle',
          isOver ? 'bg-bg-elevated/80' : 'bg-bg-secondary/30'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              dimmed={dimmedTaskIds ? dimmedTaskIds.has(task.id) : false}
            />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-text-secondary/40 italic">Sin tareas</p>
          </div>
        )}
      </div>
    </div>
  )
}

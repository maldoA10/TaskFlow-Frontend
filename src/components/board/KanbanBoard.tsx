'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Task, BoardWithRelations, Column } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { TaskCardOverlay } from './TaskCard'
import { TaskDetailPanel } from './TaskDetailPanel'
import { CreateTaskModal } from './CreateTaskModal'
import { useBoardStore } from '@/stores/boardStore'

interface KanbanBoardProps {
  board: BoardWithRelations
}

export function KanbanBoard({ board }: KanbanBoardProps) {
  const { moveTask, updateTask, createTask, deleteTask } = useBoardStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [createColumnId, setCreateColumnId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Track columns locally during drag to enable visual reordering
  const [localColumns, setLocalColumns] = useState<null | (Column & { tasks: Task[] })[]>(null)
  const columns = localColumns ?? board.columns

  function findColumn(id: string): (Column & { tasks: Task[] }) | undefined {
    // id might be a task id or column id
    for (const col of columns) {
      if (col.id === id) return col
      if (col.tasks.find((t) => t.id === id)) return col
    }
    return undefined
  }

  function onDragStart({ active }: DragStartEvent) {
    const task = active.data.current?.task as Task | undefined
    if (task) {
      setActiveTask(task)
      setLocalColumns(columns.map((c) => ({ ...c, tasks: [...c.tasks] })))
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !localColumns) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const activeCol = findColumnInLocal(activeId)
    const overCol = findColumnInLocal(overId) ?? findColumnByIdInLocal(overId)
    if (!activeCol || !overCol) return

    if (activeCol.id === overCol.id) {
      // Same column reorder
      const oldIndex = activeCol.tasks.findIndex((t) => t.id === activeId)
      const newIndex = overCol.tasks.findIndex((t) => t.id === overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        setLocalColumns((prev) =>
          prev!.map((col) =>
            col.id === activeCol.id
              ? { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) }
              : col
          )
        )
      }
    } else {
      // Cross-column move
      const task = activeCol.tasks.find((t) => t.id === activeId)!
      const overIndex = overCol.tasks.findIndex((t) => t.id === overId)
      const insertAt = overIndex === -1 ? overCol.tasks.length : overIndex

      setLocalColumns((prev) =>
        prev!.map((col) => {
          if (col.id === activeCol.id) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) }
          }
          if (col.id === overCol.id) {
            const newTasks = [...col.tasks]
            newTasks.splice(insertAt, 0, { ...task, columnId: col.id })
            return { ...col, tasks: newTasks }
          }
          return col
        })
      )
    }
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)

    if (!over || !localColumns) {
      setLocalColumns(null)
      return
    }

    const activeId = active.id as string
    const overCol = findColumnInLocal(activeId)

    if (overCol) {
      const newIndex = overCol.tasks.findIndex((t) => t.id === activeId)
      const targetPosition = newIndex === -1 ? overCol.tasks.length : newIndex
      moveTask(activeId, overCol.id, targetPosition)
    }

    setLocalColumns(null)
  }

  function findColumnInLocal(taskId: string) {
    if (!localColumns) return undefined
    return localColumns.find((col) => col.tasks.find((t) => t.id === taskId))
  }

  function findColumnByIdInLocal(colId: string) {
    if (!localColumns) return undefined
    return localColumns.find((c) => c.id === colId)
  }

  // Keep selectedTask in sync with board updates
  const currentSelectedTask = selectedTask
    ? (columns.flatMap((c) => c.tasks).find((t) => t.id === selectedTask.id) ?? selectedTask)
    : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 h-full px-6 pb-6 pt-4 overflow-x-auto">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              onTaskClick={setSelectedTask}
              onAddTask={(colId) => setCreateColumnId(colId)}
            />
          ))}
        </div>

        <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      {/* Task detail panel */}
      {currentSelectedTask && (
        <TaskDetailPanel
          task={currentSelectedTask}
          columns={board.columns}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={async (id) => {
            await deleteTask(id)
            setSelectedTask(null)
          }}
        />
      )}

      {/* Create task modal */}
      {createColumnId && (
        <CreateTaskModal
          columns={board.columns}
          defaultColumnId={createColumnId}
          onClose={() => setCreateColumnId(null)}
          onSubmit={async (data) => {
            await createTask(data)
            setCreateColumnId(null)
          }}
        />
      )}
    </>
  )
}

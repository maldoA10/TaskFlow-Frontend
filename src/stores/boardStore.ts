'use client'

import { create } from 'zustand'
import type { Board, BoardWithRelations, Column, Task } from '@/types'
import { dbGetAll, dbGetById, dbGetByIndex, dbPut, dbDelete, enqueueSyncOp } from '@/lib/db'
import { boardsApi, tasksApi, ApiError } from '@/lib/api'

interface BoardState {
  boards: Board[]
  activeBoard: BoardWithRelations | null
  isLoadingBoards: boolean
  isLoadingBoard: boolean
  error: string | null

  // Board actions
  fetchBoards: () => Promise<void>
  createBoard: (data: { name: string; description?: string; color?: string }) => Promise<Board>
  deleteBoard: (id: string) => Promise<void>

  // Active board actions
  fetchBoard: (id: string) => Promise<void>
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>
  moveTask: (taskId: string, targetColumnId: string, targetPosition: number) => Promise<void>
  createTask: (data: {
    title: string
    columnId: string
    description?: string
    priority?: string
    dueDate?: string
    tags?: string[]
  }) => Promise<Task>
  deleteTask: (taskId: string) => Promise<void>

  clearError: () => void
  setActiveBoard: (board: BoardWithRelations | null) => void
  refreshFromIDB: (boardId: string) => Promise<void>
}

function sortedByPosition<T extends { position: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.position - b.position)
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  isLoadingBoards: false,
  isLoadingBoard: false,
  error: null,

  clearError: () => set({ error: null }),

  setActiveBoard: (board) => set({ activeBoard: board }),

  refreshFromIDB: async (boardId) => {
    const cachedBoard = await dbGetById<Board>('boards', boardId)
    const cachedColumns = await dbGetByIndex<Column>('columns', 'boardId', boardId)
    const cachedTasks = await dbGetByIndex<Task>('tasks', 'boardId', boardId)
    if (!cachedBoard || cachedColumns.length === 0) return
    const cols = sortedByPosition(cachedColumns).map((col) => ({
      ...col,
      tasks: sortedByPosition(cachedTasks.filter((t) => t.columnId === col.id)),
    }))
    set((s) => ({
      activeBoard:
        s.activeBoard?.id === boardId
          ? { ...cachedBoard, columns: cols, members: s.activeBoard.members }
          : s.activeBoard,
    }))
  },

  // Boards list

  fetchBoards: async () => {
    set({ isLoadingBoards: true, error: null })
    try {
      // Read from IDB first (instant)
      const cached = await dbGetAll<Board>('boards')
      if (cached.length > 0) set({ boards: cached })

      // Fetch from API and update IDB
      const { boards } = await boardsApi.list()
      for (const b of boards) await dbPut('boards', b)
      set({ boards })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al cargar tableros'
      set({ error: msg })
    } finally {
      set({ isLoadingBoards: false })
    }
  },

  createBoard: async (data) => {
    const { board } = await boardsApi.create(data)
    await dbPut('boards', board)
    set((s) => ({ boards: [...s.boards, board] }))
    return board
  },

  deleteBoard: async (id) => {
    await boardsApi.delete(id)
    await dbDelete('boards', id)
    set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }))
    if (get().activeBoard?.id === id) set({ activeBoard: null })
  },

  // Active board

  fetchBoard: async (id) => {
    set({ isLoadingBoard: true, error: null })
    try {
      // Load from IDB for instant render
      const cachedBoard = await dbGetById<Board>('boards', id)
      const cachedColumns = await dbGetByIndex<Column>('columns', 'boardId', id)
      const cachedTasks = await dbGetByIndex<Task>('tasks', 'boardId', id)

      if (cachedBoard && cachedColumns.length > 0) {
        const cols = sortedByPosition(cachedColumns).map((col) => ({
          ...col,
          tasks: sortedByPosition(cachedTasks.filter((t) => t.columnId === col.id)),
        }))
        set({
          activeBoard: { ...cachedBoard, columns: cols, members: [] },
        })
      }

      // Fetch fresh from API
      const { board } = await boardsApi.get(id)
      // Persist to IDB
      await dbPut('boards', {
        id: board.id,
        name: board.name,
        description: board.description,
        color: board.color,
        ownerId: board.ownerId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      })
      for (const col of board.columns) {
        await dbPut('columns', {
          id: col.id,
          boardId: col.boardId,
          name: col.name,
          position: col.position,
          createdAt: col.createdAt,
        })
        for (const task of col.tasks) {
          await dbPut('tasks', task)
        }
      }

      const cols = sortedByPosition(board.columns).map((col) => ({
        ...col,
        tasks: sortedByPosition(col.tasks),
      }))
      set({ activeBoard: { ...board, columns: cols } })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al cargar el tablero'
      set({ error: msg })
    } finally {
      set({ isLoadingBoard: false })
    }
  },

  createTask: async (data) => {
    const board = get().activeBoard
    if (!board) throw new Error('No hay tablero activo')

    const { task } = await tasksApi.create(board.id, data)
    await dbPut('tasks', task)

    // Optimistically add to active board state
    set((s) => {
      if (!s.activeBoard) return s
      const cols = s.activeBoard.columns.map((col) =>
        col.id === task.columnId ? { ...col, tasks: sortedByPosition([...col.tasks, task]) } : col
      )
      return { activeBoard: { ...s.activeBoard, columns: cols } }
    })
    return task
  },

  updateTask: async (taskId, data) => {
    const board = get().activeBoard
    if (!board) return

    // IDB-first: update locally before API
    const existing = await dbGetById<Task>('tasks', taskId)
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() }
      await dbPut('tasks', updated)
      set((s) => {
        if (!s.activeBoard) return s
        const cols = s.activeBoard.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === taskId ? updated : t)),
        }))
        return { activeBoard: { ...s.activeBoard, columns: cols } }
      })
    }

    // Fire API in background; enqueue on failure
    try {
      const { task } = await tasksApi.update(taskId, data)
      await dbPut('tasks', task)
      set((s) => {
        if (!s.activeBoard) return s
        const cols = s.activeBoard.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === taskId ? task : t)),
        }))
        return { activeBoard: { ...s.activeBoard, columns: cols } }
      })
    } catch {
      await enqueueSyncOp({
        entityType: 'task',
        entityId: taskId,
        operation: 'UPDATE',
        payload: data as Record<string, unknown>,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        version: existing?.version ?? 1,
      })
    }
  },

  moveTask: async (taskId, targetColumnId, targetPosition) => {
    const board = get().activeBoard
    if (!board) return

    // Find the task
    let movingTask: Task | undefined
    for (const col of board.columns) {
      movingTask = col.tasks.find((t) => t.id === taskId)
      if (movingTask) break
    }
    if (!movingTask) return

    const sourceColumnId = movingTask.columnId

    // Optimistic UI update
    set((s) => {
      if (!s.activeBoard) return s
      const cols = s.activeBoard.columns.map((col) => {
        if (col.id === sourceColumnId && col.id !== targetColumnId) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
        }
        if (col.id === targetColumnId) {
          const withoutSelf = col.tasks.filter((t) => t.id !== taskId)
          const updated = { ...movingTask!, columnId: targetColumnId, position: targetPosition }
          withoutSelf.splice(targetPosition, 0, updated)
          return {
            ...col,
            tasks: withoutSelf.map((t, i) => ({ ...t, position: i })),
          }
        }
        return col
      })
      // same-column move handled by targetColumnId === sourceColumnId
      return { activeBoard: { ...s.activeBoard, columns: cols } }
    })

    // IDB update
    const updatedTask = { ...movingTask, columnId: targetColumnId, position: targetPosition }
    await dbPut('tasks', updatedTask)

    // API
    try {
      await tasksApi.move(taskId, { columnId: targetColumnId, position: targetPosition })
    } catch {
      await enqueueSyncOp({
        entityType: 'task',
        entityId: taskId,
        operation: 'MOVE',
        payload: { columnId: targetColumnId, position: targetPosition },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        version: movingTask.version,
      })
    }
  },

  deleteTask: async (taskId) => {
    const board = get().activeBoard
    if (!board) return

    // Optimistic removal
    set((s) => {
      if (!s.activeBoard) return s
      const cols = s.activeBoard.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }))
      return { activeBoard: { ...s.activeBoard, columns: cols } }
    })

    await dbDelete('tasks', taskId)

    try {
      await tasksApi.delete(taskId)
    } catch {
      await enqueueSyncOp({
        entityType: 'task',
        entityId: taskId,
        operation: 'DELETE',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        version: 1,
      })
    }
  },
}))

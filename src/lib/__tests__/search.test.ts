/**
 * Tests for search logic (src/lib/search.ts)
 * Uses fake-indexeddb to test IDB queries without a real browser.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

// Reset IDB between tests
beforeEach(() => {
  ;(globalThis as Record<string, unknown>).indexedDB = new IDBFactory()
})

// The db module caches dbPromise; reset it so each test gets a fresh DB
jest.mock('@/lib/constants', () => ({
  DB_NAME: 'taskflow-test',
  DB_VERSION: 2,
  API_URL: 'http://localhost:4000/api',
}))

import { searchTasks } from '../search'
import { dbPut } from '../db'
import type { Board, Column, Task } from '@/types'

const board: Board = {
  id: 'board-1',
  name: 'Mi Tablero',
  description: undefined,
  color: '#6366F1',
  ownerId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const column: Column = {
  id: 'col-1',
  boardId: 'board-1',
  name: 'Por Hacer',
  position: 0,
  createdAt: '2024-01-01T00:00:00Z',
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    columnId: 'col-1',
    boardId: 'board-1',
    title: 'Tarea de prueba',
    description: undefined,
    priority: 'MEDIUM',
    dueDate: undefined,
    position: 0,
    assigneeId: undefined,
    createdById: 'user-1',
    tags: [],
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

async function seedData(tasks: Task[]) {
  await dbPut('boards', board)
  await dbPut('columns', column)
  for (const t of tasks) {
    await dbPut('tasks', t)
  }
}

describe('searchTasks', () => {
  it('returns empty array for empty query', async () => {
    const results = await searchTasks('')
    expect(results).toEqual([])
  })

  it('returns empty array for whitespace-only query', async () => {
    const results = await searchTasks('   ')
    expect(results).toEqual([])
  })

  it('finds tasks by title substring (case-insensitive)', async () => {
    await seedData([
      makeTask({ id: 'task-1', title: 'Implementar autenticación JWT' }),
      makeTask({ id: 'task-2', title: 'Diseñar la interfaz de usuario' }),
    ])

    const results = await searchTasks('autenticación')
    expect(results).toHaveLength(1)
    expect(results[0].task.id).toBe('task-1')
  })

  it('is case-insensitive for title search', async () => {
    await seedData([makeTask({ id: 'task-1', title: 'Configurar Base de Datos' })])

    const results = await searchTasks('BASE DE DATOS')
    expect(results).toHaveLength(1)
  })

  it('finds tasks by exact tag match', async () => {
    await seedData([
      makeTask({ id: 'task-1', title: 'Algo', tags: ['backend', 'api'] }),
      makeTask({ id: 'task-2', title: 'Otro', tags: ['frontend'] }),
    ])

    const results = await searchTasks('backend')
    expect(results.some((r) => r.task.id === 'task-1')).toBe(true)
  })

  it('returns board and column info for each result', async () => {
    await seedData([makeTask({ id: 'task-1', title: 'Tarea con info' })])

    const results = await searchTasks('Tarea con info')
    expect(results[0].board.name).toBe('Mi Tablero')
    expect(results[0].column.name).toBe('Por Hacer')
  })

  it('limits results to 20 items', async () => {
    const tasks = Array.from({ length: 25 }, (_, i) =>
      makeTask({ id: `task-${i}`, title: `Tarea número ${i}` })
    )
    await seedData(tasks)

    const results = await searchTasks('Tarea')
    expect(results.length).toBeLessThanOrEqual(20)
  })

  it('prioritizes title matches over tag matches', async () => {
    await seedData([
      makeTask({ id: 'tag-match', title: 'Sin coincidencia', tags: ['búsqueda'] }),
      makeTask({ id: 'title-match', title: 'Esto es búsqueda directa', tags: [] }),
    ])

    const results = await searchTasks('búsqueda')
    // Title match should come first
    expect(results[0].task.id).toBe('title-match')
  })

  it('returns no results when query does not match anything', async () => {
    await seedData([makeTask({ id: 'task-1', title: 'Nada relevante', tags: [] })])
    const results = await searchTasks('xyzzy-no-match')
    expect(results).toHaveLength(0)
  })
})

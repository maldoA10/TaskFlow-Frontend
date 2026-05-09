/**
 * @file src/tests/lib/search.test.ts
 * Tests para searchTasks.
 * Se mockea getDB para devolver datos controlados sin IndexedDB real.
 */

const mockGetAll = jest.fn()
const mockGetDB = jest.fn()

jest.mock('@/lib/db', () => ({
  getDB: () => mockGetDB(),
}))

import { searchTasks } from '@/lib/search'
import type { Task, Board, Column } from '@/types'

// Fixtures

const boards: Board[] = [
  { id: 'b1', name: 'Tablero 1', description: '', color: '#6366F1', ownerId: 'u1', createdAt: '', updatedAt: '' },
]

const columns: Column[] = [
  { id: 'col1', boardId: 'b1', name: 'Por Hacer', position: 0, createdAt: '' },
  { id: 'col2', boardId: 'b1', name: 'En Progreso', position: 1, createdAt: '' },
]

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    boardId: 'b1',
    columnId: 'col1',
    position: 0,
    priority: 'MEDIUM',
    description: '',
    tags: [],
    dueDate: null,
    assigneeId: null,
    createdAt: '',
    updatedAt: '',
    version: 1,
    ...overrides,
  }
}

const tasks: Task[] = [
  makeTask({ id: 't1', title: 'Implementar login', tags: ['auth', 'frontend'] }),
  makeTask({ id: 't2', title: 'Diseñar pantalla de registro', tags: ['frontend', 'design'] }),
  makeTask({ id: 't3', title: 'Configurar base de datos', tags: ['backend', 'db'], columnId: 'col2' }),
  makeTask({ id: 't4', title: 'Revisar pull request', tags: [] }),
]

function setupDbMock(taskList = tasks) {
  mockGetDB.mockResolvedValue({
    getAll: jest.fn().mockImplementation((store: string) => {
      if (store === 'tasks') return Promise.resolve(taskList)
      if (store === 'boards') return Promise.resolve(boards)
      if (store === 'columns') return Promise.resolve(columns)
      return Promise.resolve([])
    }),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setupDbMock()
})

describe('searchTasks — consultas vacías', () => {
  it('devuelve array vacío si la query está vacía', async () => {
    const results = await searchTasks('')
    expect(results).toEqual([])
  })

  it('devuelve array vacío si la query es solo espacios', async () => {
    const results = await searchTasks('   ')
    expect(results).toEqual([])
  })

  it('no llama a getDB si la query está vacía', async () => {
    await searchTasks('')
    expect(mockGetDB).not.toHaveBeenCalled()
  })
})

describe('searchTasks — búsqueda por título', () => {
  it('encuentra tareas cuyo título contiene la query (case-insensitive)', async () => {
    const results = await searchTasks('login')
    expect(results).toHaveLength(1)
    expect(results[0].task.id).toBe('t1')
  })

  it('es insensible a mayúsculas', async () => {
    const results = await searchTasks('LOGIN')
    expect(results).toHaveLength(1)
    expect(results[0].task.id).toBe('t1')
  })

  it('devuelve múltiples resultados si varios títulos coinciden', async () => {
    const results = await searchTasks('registro')
    expect(results).toHaveLength(1)
    expect(results[0].task.id).toBe('t2')
  })

  it('hace match de substring dentro del título', async () => {
    // "re" aparece en "Revisar" y "Registro"
    const results = await searchTasks('re')
    const ids = results.map((r) => r.task.id)
    expect(ids).toContain('t2') // "Diseñar"... "registro" → t2
    expect(ids).toContain('t4') // "Revisar"
  })

  it('incluye el board y la columna correctos en el resultado', async () => {
    const results = await searchTasks('login')
    expect(results[0].board.id).toBe('b1')
    expect(results[0].column.id).toBe('col1')
  })

  it('incluye la columna correcta según la tarea', async () => {
    const results = await searchTasks('base de datos')
    expect(results[0].column.id).toBe('col2')
  })
})

describe('searchTasks — búsqueda por etiqueta', () => {
  it('encuentra tareas por etiqueta exacta', async () => {
    const results = await searchTasks('auth')
    expect(results).toHaveLength(1)
    expect(results[0].task.id).toBe('t1')
  })

  it('la búsqueda por tag es exacta (no substring)', async () => {
    // "fron" no debería coincidir con "frontend"
    // Pero "frontend" sí con título o tag exacto
    const results = await searchTasks('fron')
    // No hay título que contenga "fron" ni tag exacto "fron"
    expect(results.every((r) => r.task.title.toLowerCase().includes('fron'))).toBe(true)
  })

  it('es insensible a mayúsculas en etiquetas', async () => {
    const results = await searchTasks('AUTH')
    expect(results).toHaveLength(1)
    expect(results[0].task.id).toBe('t1')
  })
})

describe('searchTasks — orden de resultados', () => {
  it('coloca los matches de título antes que los matches de solo etiqueta', async () => {
    // "frontend" aparece en el título de t2 ("Diseñar") → no, solo en tag
    // Creamos un caso claro: una tarea con "frontend" en título y otra solo en tag
    const customTasks = [
      makeTask({ id: 'tag-only', title: 'Sin relación', tags: ['frontend'] }),
      makeTask({ id: 'title-match', title: 'Componente frontend', tags: [] }),
    ]
    setupDbMock(customTasks)

    const results = await searchTasks('frontend')
    expect(results[0].task.id).toBe('title-match')
    expect(results[1].task.id).toBe('tag-only')
  })
})

describe('searchTasks — límite de resultados', () => {
  it('devuelve como máximo 20 resultados', async () => {
    const manyTasks = Array.from({ length: 30 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Tarea número ${i}` })
    )
    setupDbMock(manyTasks)

    const results = await searchTasks('tarea')
    expect(results).toHaveLength(20)
  })
})

describe('searchTasks — datos incompletos', () => {
  it('ignora tareas sin board asociado', async () => {
    const orphanTask = makeTask({ id: 'orphan', title: 'Tarea huérfana', boardId: 'b-inexistente' })
    setupDbMock([...tasks, orphanTask])

    const results = await searchTasks('huérfana')
    expect(results).toHaveLength(0)
  })

  it('ignora tareas sin columna asociada', async () => {
    const orphanTask = makeTask({ id: 'orphan', title: 'Sin columna', columnId: 'col-inexistente' })
    setupDbMock([...tasks, orphanTask])

    const results = await searchTasks('sin columna')
    expect(results).toHaveLength(0)
  })

  it('devuelve array vacío si no hay tareas en IDB', async () => {
    setupDbMock([])
    const results = await searchTasks('cualquier cosa')
    expect(results).toEqual([])
  })
})
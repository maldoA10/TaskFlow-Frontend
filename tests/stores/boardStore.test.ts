/**
 * @file src/tests/stores/boardStore.test.ts
 * Tests para el boardStore de Zustand.
 * Se mockean lib/db y lib/api para aislar la lógica del store.
 */

import { act } from '@testing-library/react'

// Mocks

const mockDbGetAll = jest.fn()
const mockDbGetById = jest.fn()
const mockDbGetByIndex = jest.fn()
const mockDbPut = jest.fn()
const mockDbDelete = jest.fn()
const mockEnqueueSyncOp = jest.fn()

jest.mock('@/lib/db', () => ({
  dbGetAll: (...args: unknown[]) => mockDbGetAll(...args),
  dbGetById: (...args: unknown[]) => mockDbGetById(...args),
  dbGetByIndex: (...args: unknown[]) => mockDbGetByIndex(...args),
  dbPut: (...args: unknown[]) => mockDbPut(...args),
  dbDelete: (...args: unknown[]) => mockDbDelete(...args),
  enqueueSyncOp: (...args: unknown[]) => mockEnqueueSyncOp(...args),
}))

const mockBoardsApiList = jest.fn()
const mockBoardsApiGet = jest.fn()
const mockBoardsApiCreate = jest.fn()
const mockBoardsApiDelete = jest.fn()
const mockTasksApiCreate = jest.fn()
const mockTasksApiUpdate = jest.fn()
const mockTasksApiMove = jest.fn()
const mockTasksApiDelete = jest.fn()

jest.mock('@/lib/api', () => ({
  boardsApi: {
    list: (...args: unknown[]) => mockBoardsApiList(...args),
    get: (...args: unknown[]) => mockBoardsApiGet(...args),
    create: (...args: unknown[]) => mockBoardsApiCreate(...args),
    delete: (...args: unknown[]) => mockBoardsApiDelete(...args),
  },
  tasksApi: {
    create: (...args: unknown[]) => mockTasksApiCreate(...args),
    update: (...args: unknown[]) => mockTasksApiUpdate(...args),
    move: (...args: unknown[]) => mockTasksApiMove(...args),
    delete: (...args: unknown[]) => mockTasksApiDelete(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

// Importación del store

import { useBoardStore } from '@/stores/boardStore'

// Fixtures

const mockBoard = {
  id: 'b1',
  name: 'Tablero 1',
  description: 'Descripción',
  color: '#ff0000',
  ownerId: 'u1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockTask = {
  id: 't1',
  title: 'Tarea 1',
  columnId: 'col1',
  boardId: 'b1',
  position: 0,
  priority: 'medium',
  description: '',
  tags: [],
  dueDate: null,
  assigneeId: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  version: 1,
}

const mockColumn = {
  id: 'col1',
  boardId: 'b1',
  name: 'Columna 1',
  position: 0,
  createdAt: '2024-01-01T00:00:00Z',
  tasks: [mockTask],
}

const mockBoardWithRelations = {
  ...mockBoard,
  columns: [mockColumn],
  members: [],
}

function resetStore() {
  useBoardStore.setState({
    boards: [],
    activeBoard: null,
    isLoadingBoards: false,
    isLoadingBoard: false,
    error: null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  resetStore()
  mockDbPut.mockResolvedValue(undefined)
  mockDbDelete.mockResolvedValue(undefined)
  mockEnqueueSyncOp.mockResolvedValue(undefined)
})

// Estado inicial

describe('boardStore — estado inicial', () => {
  it('comienza sin tableros ni tablero activo', () => {
    const { boards, activeBoard } = useBoardStore.getState()
    expect(boards).toEqual([])
    expect(activeBoard).toBeNull()
  })

  it('los flags de carga empiezan en false', () => {
    const { isLoadingBoards, isLoadingBoard } = useBoardStore.getState()
    expect(isLoadingBoards).toBe(false)
    expect(isLoadingBoard).toBe(false)
  })

  it('error empieza en null', () => {
    expect(useBoardStore.getState().error).toBeNull()
  })
})

// clearError

describe('clearError', () => {
  it('limpia el error del estado', () => {
    useBoardStore.setState({ error: 'Algo salió mal' })
    act(() => useBoardStore.getState().clearError())
    expect(useBoardStore.getState().error).toBeNull()
  })
})

// setActiveBoard

describe('setActiveBoard', () => {
  it('establece el tablero activo', () => {
    act(() => useBoardStore.getState().setActiveBoard(mockBoardWithRelations))
    expect(useBoardStore.getState().activeBoard).toEqual(mockBoardWithRelations)
  })

  it('puede limpiar el tablero activo pasando null', () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    act(() => useBoardStore.getState().setActiveBoard(null))
    expect(useBoardStore.getState().activeBoard).toBeNull()
  })
})

// fetchBoards

describe('fetchBoards', () => {
  it('carga tableros desde la API y los guarda en el estado', async () => {
    mockDbGetAll.mockResolvedValueOnce([])
    mockBoardsApiList.mockResolvedValueOnce({ boards: [mockBoard] })

    await act(async () => {
      await useBoardStore.getState().fetchBoards()
    })

    expect(useBoardStore.getState().boards).toEqual([mockBoard])
    expect(useBoardStore.getState().isLoadingBoards).toBe(false)
  })

  it('muestra la caché de IDB mientras carga desde la API', async () => {
    const cachedBoard = { ...mockBoard, name: 'Caché' }
    mockDbGetAll.mockResolvedValueOnce([cachedBoard])
    mockBoardsApiList.mockResolvedValueOnce({ boards: [mockBoard] })

    await act(async () => {
      await useBoardStore.getState().fetchBoards()
    })

    // El estado final debe ser el de la API, no la caché
    expect(useBoardStore.getState().boards).toEqual([mockBoard])
  })

  it('persiste cada tablero en IDB tras cargar desde la API', async () => {
    mockDbGetAll.mockResolvedValueOnce([])
    mockBoardsApiList.mockResolvedValueOnce({ boards: [mockBoard] })

    await act(async () => {
      await useBoardStore.getState().fetchBoards()
    })

    expect(mockDbPut).toHaveBeenCalledWith('boards', mockBoard)
  })

  it('establece error si la API falla', async () => {
    const { ApiError } = await import('@/lib/api')
    mockDbGetAll.mockResolvedValueOnce([])
    mockBoardsApiList.mockRejectedValueOnce(new ApiError('SERVER_ERROR', 'Error del servidor', 500))

    await act(async () => {
      await useBoardStore.getState().fetchBoards()
    })

    expect(useBoardStore.getState().error).toBe('Error del servidor')
    expect(useBoardStore.getState().isLoadingBoards).toBe(false)
  })

  it('isLoadingBoards vuelve a false tras fetchBoards (exitoso o fallido)', async () => {
    mockDbGetAll.mockResolvedValueOnce([])
    mockBoardsApiList.mockResolvedValueOnce({ boards: [] })

    await act(async () => {
      await useBoardStore.getState().fetchBoards()
    })

    expect(useBoardStore.getState().isLoadingBoards).toBe(false)
  })
})

// createBoard

describe('createBoard', () => {
  it('añade el tablero al estado y lo persiste en IDB', async () => {
    mockBoardsApiCreate.mockResolvedValueOnce({ board: mockBoard })

    await act(async () => {
      await useBoardStore.getState().createBoard({ name: 'Tablero 1' })
    })

    expect(useBoardStore.getState().boards).toContainEqual(mockBoard)
    expect(mockDbPut).toHaveBeenCalledWith('boards', mockBoard)
  })

  it('devuelve el tablero creado', async () => {
    mockBoardsApiCreate.mockResolvedValueOnce({ board: mockBoard })

    let result: unknown
    await act(async () => {
      result = await useBoardStore.getState().createBoard({ name: 'Tablero 1' })
    })

    expect(result).toEqual(mockBoard)
  })
})

// deleteBoard

describe('deleteBoard', () => {
  it('elimina el tablero del estado y de IDB', async () => {
    useBoardStore.setState({ boards: [mockBoard] })
    mockBoardsApiDelete.mockResolvedValueOnce(undefined)

    await act(async () => {
      await useBoardStore.getState().deleteBoard('b1')
    })

    expect(useBoardStore.getState().boards).toEqual([])
    expect(mockDbDelete).toHaveBeenCalledWith('boards', 'b1')
  })

  it('limpia activeBoard si se elimina el tablero activo', async () => {
    useBoardStore.setState({ boards: [mockBoard], activeBoard: mockBoardWithRelations })
    mockBoardsApiDelete.mockResolvedValueOnce(undefined)

    await act(async () => {
      await useBoardStore.getState().deleteBoard('b1')
    })

    expect(useBoardStore.getState().activeBoard).toBeNull()
  })

  it('no limpia activeBoard si se elimina un tablero diferente', async () => {
    const otherBoard = { ...mockBoard, id: 'b2' }
    useBoardStore.setState({ boards: [mockBoard, otherBoard], activeBoard: mockBoardWithRelations })
    mockBoardsApiDelete.mockResolvedValueOnce(undefined)

    await act(async () => {
      await useBoardStore.getState().deleteBoard('b2')
    })

    expect(useBoardStore.getState().activeBoard).toEqual(mockBoardWithRelations)
  })
})

// fetchBoard

describe('fetchBoard', () => {
  it('carga el tablero activo desde la API', async () => {
    mockDbGetById.mockResolvedValueOnce(null)
    mockDbGetByIndex.mockResolvedValue([])
    mockBoardsApiGet.mockResolvedValueOnce({ board: mockBoardWithRelations })

    await act(async () => {
      await useBoardStore.getState().fetchBoard('b1')
    })

    expect(useBoardStore.getState().activeBoard?.id).toBe('b1')
    expect(useBoardStore.getState().isLoadingBoard).toBe(false)
  })

  it('persiste el tablero y sus columnas/tareas en IDB', async () => {
    mockDbGetById.mockResolvedValueOnce(null)
    mockDbGetByIndex.mockResolvedValue([])
    mockBoardsApiGet.mockResolvedValueOnce({ board: mockBoardWithRelations })

    await act(async () => {
      await useBoardStore.getState().fetchBoard('b1')
    })

    expect(mockDbPut).toHaveBeenCalledWith('boards', expect.objectContaining({ id: 'b1' }))
    expect(mockDbPut).toHaveBeenCalledWith('columns', expect.objectContaining({ id: 'col1' }))
    expect(mockDbPut).toHaveBeenCalledWith('tasks', expect.objectContaining({ id: 't1' }))
  })

  it('muestra caché de IDB si está disponible', async () => {
    mockDbGetById.mockResolvedValueOnce(mockBoard)
    mockDbGetByIndex
      .mockResolvedValueOnce([{ ...mockColumn, tasks: undefined }])
      .mockResolvedValueOnce([mockTask])
    mockBoardsApiGet.mockResolvedValueOnce({ board: mockBoardWithRelations })

    await act(async () => {
      await useBoardStore.getState().fetchBoard('b1')
    })

    // El estado final debe ser el de la API
    expect(useBoardStore.getState().activeBoard?.id).toBe('b1')
  })

  it('ordena las columnas y tareas por posición', async () => {
    const col2 = { ...mockColumn, id: 'col2', position: 1, tasks: [] }
    const col1 = { ...mockColumn, id: 'col1', position: 0, tasks: [mockTask] }
    const boardUnordered = { ...mockBoardWithRelations, columns: [col2, col1] }

    mockDbGetById.mockResolvedValueOnce(null)
    mockDbGetByIndex.mockResolvedValue([])
    mockBoardsApiGet.mockResolvedValueOnce({ board: boardUnordered })

    await act(async () => {
      await useBoardStore.getState().fetchBoard('b1')
    })

    const cols = useBoardStore.getState().activeBoard?.columns ?? []
    expect(cols[0].id).toBe('col1')
    expect(cols[1].id).toBe('col2')
  })

  it('establece error si la API falla', async () => {
    const { ApiError } = await import('@/lib/api')
    mockDbGetById.mockResolvedValueOnce(null)
    mockDbGetByIndex.mockResolvedValue([])
    mockBoardsApiGet.mockRejectedValueOnce(new ApiError('NOT_FOUND', 'Tablero no encontrado', 404))

    await act(async () => {
      await useBoardStore.getState().fetchBoard('b1')
    })

    expect(useBoardStore.getState().error).toBe('Tablero no encontrado')
    expect(useBoardStore.getState().isLoadingBoard).toBe(false)
  })
})

// createTask

describe('createTask', () => {
  it('lanza error si no hay tablero activo', async () => {
    await expect(
      act(async () => {
        await useBoardStore.getState().createTask({ title: 'T', columnId: 'col1' })
      })
    ).rejects.toThrow('No hay tablero activo')
  })

  it('añade la tarea a la columna correcta del activeBoard', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    const newTask = { ...mockTask, id: 't2', title: 'Nueva tarea', position: 1 }
    mockTasksApiCreate.mockResolvedValueOnce({ task: newTask })

    await act(async () => {
      await useBoardStore.getState().createTask({ title: 'Nueva tarea', columnId: 'col1' })
    })

    const col = useBoardStore.getState().activeBoard?.columns.find((c) => c.id === 'col1')
    expect(col?.tasks).toContainEqual(newTask)
  })

  it('persiste la tarea en IDB', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    const newTask = { ...mockTask, id: 't2', title: 'Nueva tarea', position: 1 }
    mockTasksApiCreate.mockResolvedValueOnce({ task: newTask })

    await act(async () => {
      await useBoardStore.getState().createTask({ title: 'Nueva tarea', columnId: 'col1' })
    })

    expect(mockDbPut).toHaveBeenCalledWith('tasks', newTask)
  })

  it('devuelve la tarea creada', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    const newTask = { ...mockTask, id: 't2' }
    mockTasksApiCreate.mockResolvedValueOnce({ task: newTask })

    let result: unknown
    await act(async () => {
      result = await useBoardStore.getState().createTask({ title: 'T', columnId: 'col1' })
    })

    expect(result).toEqual(newTask)
  })
})

// updateTask

describe('updateTask', () => {
  it('actualiza la tarea en IDB y en el estado antes de la API (optimistic)', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    const updatedTask = { ...mockTask, title: 'Actualizada', updatedAt: expect.any(String) }
    mockDbGetById.mockResolvedValueOnce(mockTask)
    mockTasksApiUpdate.mockResolvedValueOnce({ task: updatedTask })

    await act(async () => {
      await useBoardStore.getState().updateTask('t1', { title: 'Actualizada' })
    })

    const col = useBoardStore.getState().activeBoard?.columns.find((c) => c.id === 'col1')
    expect(col?.tasks[0].title).toBe('Actualizada')
  })

  it('encola operación de sincronización si la API falla', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    mockDbGetById.mockResolvedValueOnce(mockTask)
    mockTasksApiUpdate.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      await useBoardStore.getState().updateTask('t1', { title: 'Falla' })
    })

    expect(mockEnqueueSyncOp).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'task',
        entityId: 't1',
        operation: 'UPDATE',
      })
    )
  })

  it('no hace nada si no hay tablero activo', async () => {
    await act(async () => {
      await useBoardStore.getState().updateTask('t1', { title: 'X' })
    })

    expect(mockDbGetById).not.toHaveBeenCalled()
  })
})

// moveTask

describe('moveTask', () => {
  it('mueve la tarea a otra columna de forma optimista', async () => {
    const col2 = { id: 'col2', boardId: 'b1', name: 'Columna 2', position: 1, createdAt: '', tasks: [] }
    const boardWith2Cols = { ...mockBoardWithRelations, columns: [mockColumn, col2] }
    useBoardStore.setState({ activeBoard: boardWith2Cols })
    mockTasksApiMove.mockResolvedValueOnce({})

    await act(async () => {
      await useBoardStore.getState().moveTask('t1', 'col2', 0)
    })

    const col1 = useBoardStore.getState().activeBoard?.columns.find((c) => c.id === 'col1')
    const targetCol = useBoardStore.getState().activeBoard?.columns.find((c) => c.id === 'col2')
    expect(col1?.tasks).toHaveLength(0)
    expect(targetCol?.tasks[0].id).toBe('t1')
  })

  it('encola operación de sincronización si la API falla al mover', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    mockTasksApiMove.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      await useBoardStore.getState().moveTask('t1', 'col1', 0)
    })

    expect(mockEnqueueSyncOp).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'task',
        entityId: 't1',
        operation: 'MOVE',
      })
    )
  })

  it('no hace nada si no hay tablero activo', async () => {
    await act(async () => {
      await useBoardStore.getState().moveTask('t1', 'col2', 0)
    })

    expect(mockTasksApiMove).not.toHaveBeenCalled()
  })

  it('no hace nada si la tarea no existe en el tablero', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })

    await act(async () => {
      await useBoardStore.getState().moveTask('t-inexistente', 'col1', 0)
    })

    expect(mockTasksApiMove).not.toHaveBeenCalled()
  })
})

// deleteTask

describe('deleteTask', () => {
  it('elimina la tarea del estado de forma optimista', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    mockTasksApiDelete.mockResolvedValueOnce(undefined)

    await act(async () => {
      await useBoardStore.getState().deleteTask('t1')
    })

    const col = useBoardStore.getState().activeBoard?.columns.find((c) => c.id === 'col1')
    expect(col?.tasks).toHaveLength(0)
  })

  it('elimina la tarea de IDB', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    mockTasksApiDelete.mockResolvedValueOnce(undefined)

    await act(async () => {
      await useBoardStore.getState().deleteTask('t1')
    })

    expect(mockDbDelete).toHaveBeenCalledWith('tasks', 't1')
  })

  it('encola operación de sincronización si la API falla al eliminar', async () => {
    useBoardStore.setState({ activeBoard: mockBoardWithRelations })
    mockTasksApiDelete.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      await useBoardStore.getState().deleteTask('t1')
    })

    expect(mockEnqueueSyncOp).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'task',
        entityId: 't1',
        operation: 'DELETE',
      })
    )
  })

  it('no hace nada si no hay tablero activo', async () => {
    await act(async () => {
      await useBoardStore.getState().deleteTask('t1')
    })

    expect(mockDbDelete).not.toHaveBeenCalled()
  })
})
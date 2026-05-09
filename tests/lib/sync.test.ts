/**
 * @file src/tests/lib/sync.test.ts
 * Tests para processSyncQueue, pullRemoteChanges y resolveConflict.
 */

// Mocks de db
const mockGetPendingSyncOps = jest.fn()
const mockUpdateSyncOpStatus = jest.fn()
const mockGetMeta = jest.fn()
const mockSetMeta = jest.fn()
const mockDbPut = jest.fn()
const mockClearStaleOps = jest.fn()
const mockGetDB = jest.fn()

jest.mock('@/lib/db', () => ({
  getPendingSyncOps: (...args: unknown[]) => mockGetPendingSyncOps(...args),
  updateSyncOpStatus: (...args: unknown[]) => mockUpdateSyncOpStatus(...args),
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
  setMeta: (...args: unknown[]) => mockSetMeta(...args),
  dbPut: (...args: unknown[]) => mockDbPut(...args),
  clearStaleOps: (...args: unknown[]) => mockClearStaleOps(...args),
  getDB: (...args: unknown[]) => mockGetDB(...args),
}))

// Mock de apiFetch
const mockApiFetch = jest.fn()
jest.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

import { 
  processSyncQueue, 
  pullRemoteChanges, 
  resolveConflict, 
  onSyncStateChange, 
  type ConflictItem 
} from '@/lib/sync'

// Fixture de op pendiente
function makePendingOp(overrides = {}) {
  return {
    id: 'op1',
    entityType: 'task',
    entityId: 't1',
    operation: 'UPDATE',
    payload: { title: 'Actualizado' },
    timestamp: Date.now(),
    status: 'pending' as const,
    retryCount: 0,
    version: 1,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateSyncOpStatus.mockResolvedValue(undefined)
  mockDbPut.mockResolvedValue(undefined)
  mockSetMeta.mockResolvedValue(undefined)
  // Asegurar que navigator.onLine esté en true por defecto
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
})

// --- processSyncQueue ---

describe('processSyncQueue — sin operaciones pendientes', () => {
  it('no emite estado syncing si no hay operaciones', async () => {
    mockGetPendingSyncOps.mockResolvedValueOnce([])
    const listener = jest.fn()
    const unsub = onSyncStateChange(listener)

    await processSyncQueue()

    expect(listener).not.toHaveBeenCalled()
    unsub()
  })

  it('no llama a apiFetch si no hay operaciones pendientes', async () => {
    mockGetPendingSyncOps.mockResolvedValueOnce([])
    await processSyncQueue()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('processSyncQueue — online con operaciones', () => {
  it('emite estado "syncing" al iniciar', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValueOnce([op])
    mockApiFetch.mockResolvedValueOnce({
      results: [{ entityId: 't1', status: 'applied' }],
    })

    const states: string[] = []
    const unsub = onSyncStateChange((s) => states.push(s))

    await processSyncQueue()

    expect(states).toContain('syncing')
    unsub()
  })

  it('emite estado "idle" al terminar correctamente', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValueOnce([op])
    mockApiFetch.mockResolvedValueOnce({
      results: [{ entityId: 't1', status: 'applied' }],
    })

    const states: string[] = []
    const unsub = onSyncStateChange((s) => states.push(s))

    await processSyncQueue()

    expect(states[states.length - 1]).toBe('idle')
    unsub()
  })

  it('marca las ops como "in-progress" antes de enviar', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValueOnce([op])
    mockApiFetch.mockResolvedValueOnce({
      results: [{ entityId: 't1', status: 'applied' }],
    })

    await processSyncQueue()

    expect(mockUpdateSyncOpStatus).toHaveBeenCalledWith('op1', 'in-progress')
  })

  it('marca las ops como "completed" tras una respuesta "applied"', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValueOnce([op])
    mockApiFetch.mockResolvedValueOnce({
      results: [{ entityId: 't1', status: 'applied' }],
    })

    await processSyncQueue()

    expect(mockUpdateSyncOpStatus).toHaveBeenCalledWith('op1', 'completed')
  })

  it('marca las ops como "failed" si el servidor responde "conflict"', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValueOnce([op])
    mockApiFetch.mockResolvedValueOnce({
      results: [{ entityId: 't1', status: 'conflict', serverData: { title: 'Servidor' } }],
    })

    await processSyncQueue()

    expect(mockUpdateSyncOpStatus).toHaveBeenCalledWith('op1', 'failed')
  })

  it('informa el número de ops aplicadas al emitir "idle"', async () => {
    const ops = [makePendingOp({ id: 'op1', entityId: 't1' }), makePendingOp({ id: 'op2', entityId: 't2' })]
    mockGetPendingSyncOps.mockResolvedValueOnce(ops)
    mockApiFetch.mockResolvedValueOnce({
      results: [
        { entityId: 't1', status: 'applied' },
        { entityId: 't2', status: 'applied' },
      ],
    })

    let appliedCount: number | undefined
    const unsub = onSyncStateChange((_, applied) => { appliedCount = applied })

    await processSyncQueue()

    expect(appliedCount).toBe(2)
    unsub()
  })
})

// --- pullRemoteChanges ---

describe('pullRemoteChanges', () => {
  it('devuelve null si navigator.onLine es false', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    const result = await pullRemoteChanges()
    expect(result).toBeNull()
  })

  it('llama al endpoint con el lastSyncTime almacenado', async () => {
    mockGetMeta.mockResolvedValueOnce(1700000000000)
    mockApiFetch.mockResolvedValueOnce({ boards: [], columns: [], tasks: [], timestamp: 1700000001000 })

    await pullRemoteChanges()

    // Corregido: Solo se pasa un argumento en el código fuente
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('since=1700000000000')
    )
  })

  it('usa since=0 si no hay lastSyncTime guardado', async () => {
    mockGetMeta.mockResolvedValueOnce(null)
    mockApiFetch.mockResolvedValueOnce({ boards: [], columns: [], tasks: [], timestamp: 123 })

    await pullRemoteChanges()

    // Corregido: Solo se pasa un argumento en el código fuente
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('since=0')
    )
  })

  it('persiste los datos recibidos en IDB', async () => {
    mockGetMeta.mockResolvedValueOnce(0)
    const board = { id: 'b1', name: 'B' }
    const column = { id: 'col1', boardId: 'b1' }
    const task = { id: 't1', boardId: 'b1' }
    mockApiFetch.mockResolvedValueOnce({
      boards: [board],
      columns: [column],
      tasks: [task],
      timestamp: 999,
    })

    await pullRemoteChanges()

    expect(mockDbPut).toHaveBeenCalledWith('boards', board)
    expect(mockDbPut).toHaveBeenCalledWith('columns', column)
    expect(mockDbPut).toHaveBeenCalledWith('tasks', task)
  })

  it('actualiza lastSyncTime con el timestamp del servidor', async () => {
    mockGetMeta.mockResolvedValueOnce(0)
    mockApiFetch.mockResolvedValueOnce({ boards: [], columns: [], tasks: [], timestamp: 9999 })

    await pullRemoteChanges()

    expect(mockSetMeta).toHaveBeenCalledWith('lastSyncTime', 9999)
  })
})

// --- resolveConflict ---

describe('resolveConflict', () => {
  const conflict: ConflictItem = {
    entityId: 't1',
    entityType: 'task',
    operation: 'UPDATE',
    localPayload: { title: 'Local' },
    serverData: { title: 'Servidor' },
  }

  function setupResolveConflictMocks(failedOps = [makePendingOp()]) {
    mockGetPendingSyncOps.mockResolvedValue([])
    mockGetDB.mockResolvedValue({
      getAllFromIndex: jest.fn().mockResolvedValue(failedOps),
    })
  }

  it('"keep-local" llama a apiFetch PATCH para UPDATE', async () => {
    setupResolveConflictMocks()
    mockApiFetch.mockResolvedValueOnce({})

    await resolveConflict(conflict, 'keep-local')

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/tasks/t1`,
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('"keep-local" llama a apiFetch PATCH /move para MOVE', async () => {
    setupResolveConflictMocks([makePendingOp({ operation: 'MOVE' })])
    mockApiFetch.mockResolvedValueOnce({})

    await resolveConflict({ ...conflict, operation: 'MOVE' }, 'keep-local')

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/tasks/t1/move`,
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('marca todas las ops del entityId como "completed" en ambos casos', async () => {
    setupResolveConflictMocks([makePendingOp({ id: 'op-fail' })])
    mockApiFetch.mockResolvedValueOnce({})

    await resolveConflict(conflict, 'keep-local')

    expect(mockUpdateSyncOpStatus).toHaveBeenCalledWith('op-fail', 'completed')
  })
})
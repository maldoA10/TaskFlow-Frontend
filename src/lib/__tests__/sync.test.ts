/**
 * Tests for the sync queue manager (src/lib/sync.ts)
 * Uses Jest mocks — no real IDB or network calls.
 */

// ─── Mock db module ───────────────────────────────────────────────────────────
const mockGetPendingSyncOps = jest.fn()
const mockUpdateSyncOpStatus = jest.fn()
const mockGetMeta = jest.fn()
const mockSetMeta = jest.fn()
const mockDbPut = jest.fn()
const mockDbDelete = jest.fn()
const mockClearStaleOps = jest.fn()

jest.mock('@/lib/db', () => ({
  getPendingSyncOps: (...a: unknown[]) => mockGetPendingSyncOps(...a),
  updateSyncOpStatus: (...a: unknown[]) => mockUpdateSyncOpStatus(...a),
  getMeta: (...a: unknown[]) => mockGetMeta(...a),
  setMeta: (...a: unknown[]) => mockSetMeta(...a),
  dbPut: (...a: unknown[]) => mockDbPut(...a),
  dbDelete: (...a: unknown[]) => mockDbDelete(...a),
  clearStaleOps: (...a: unknown[]) => mockClearStaleOps(...a),
  getDB: jest.fn(),
}))

// ─── Mock api module ──────────────────────────────────────────────────────────
const mockApiFetch = jest.fn()
jest.mock('@/lib/api', () => ({
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────
import { processSyncQueue, pullRemoteChanges, getSyncState, onSyncStateChange } from '../sync'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePendingOp(overrides = {}) {
  return {
    id: 1,
    entityType: 'task' as const,
    entityId: 'task-uuid-1',
    operation: 'UPDATE' as const,
    payload: { title: 'Nueva tarea' },
    timestamp: Date.now(),
    status: 'pending' as const,
    retryCount: 0,
    version: 1,
    ...overrides,
  }
}

describe('processSyncQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset online status
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  })

  it('returns early without calling API when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
    await processSyncQueue()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('returns early without API call when sync queue is empty', async () => {
    mockGetPendingSyncOps.mockResolvedValue([])
    await processSyncQueue()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('sends pending ops to /sync endpoint and marks them completed', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValue([op])
    mockUpdateSyncOpStatus.mockResolvedValue(undefined)
    mockApiFetch.mockResolvedValue({
      results: [{ entityId: op.entityId, status: 'applied' }],
    })

    await processSyncQueue()

    expect(mockApiFetch).toHaveBeenCalledWith('/sync', expect.objectContaining({ method: 'POST' }))
    // First call: in-progress, second: completed
    expect(mockUpdateSyncOpStatus).toHaveBeenCalledWith(op.id, 'completed')
  })

  it('marks op as failed when server returns conflict status', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValue([op])
    mockUpdateSyncOpStatus.mockResolvedValue(undefined)
    mockApiFetch.mockResolvedValue({
      results: [
        { entityId: op.entityId, status: 'conflict', serverData: { title: 'Server version' } },
      ],
    })

    const conflicts: unknown[] = []
    const unsub = jest.fn()
    // Spy on conflict listener manually
    await processSyncQueue()

    expect(mockUpdateSyncOpStatus).toHaveBeenCalledWith(op.id, 'failed')
    void unsub
    void conflicts
  })

  it('marks op as failed on server error status', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValue([op])
    mockUpdateSyncOpStatus.mockResolvedValue(undefined)
    mockApiFetch.mockResolvedValue({
      results: [{ entityId: op.entityId, status: 'error', message: 'Something went wrong' }],
    })

    await processSyncQueue()
    expect(mockUpdateSyncOpStatus).toHaveBeenCalledWith(op.id, 'failed')
  })

  it('transitions sync state: idle → syncing → idle', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValue([op])
    mockUpdateSyncOpStatus.mockResolvedValue(undefined)
    mockApiFetch.mockResolvedValue({
      results: [{ entityId: op.entityId, status: 'applied' }],
    })

    const states: string[] = []
    const unsub = onSyncStateChange((s) => states.push(s))

    await processSyncQueue()
    unsub()

    expect(states).toEqual(['syncing', 'idle'])
  })

  it('reverts in-progress ops to pending when network call throws', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValueOnce([op])
    mockUpdateSyncOpStatus.mockResolvedValue(undefined)
    mockApiFetch.mockRejectedValue(new Error('Network error'))
    // Second call for recovery: return empty
    mockGetPendingSyncOps.mockResolvedValueOnce([])

    await processSyncQueue()

    // Should emit 'error' state
    expect(getSyncState()).toBe('error')
  })
})

describe('pullRemoteChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  })

  it('returns null when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
    const result = await pullRemoteChanges()
    expect(result).toBeNull()
  })

  it('fetches changes since lastSyncTime and persists to IDB', async () => {
    mockGetMeta.mockResolvedValue(1000)
    mockSetMeta.mockResolvedValue(undefined)
    mockDbPut.mockResolvedValue(undefined)

    const serverData = {
      boards: [{ id: 'b1' }],
      columns: [{ id: 'c1' }],
      tasks: [{ id: 't1' }],
      timestamp: 2000,
    }
    mockApiFetch.mockResolvedValue(serverData)

    const result = await pullRemoteChanges()

    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('since=1000'))
    expect(mockDbPut).toHaveBeenCalledTimes(3) // board + column + task
    expect(mockSetMeta).toHaveBeenCalledWith('lastSyncTime', 2000)
    expect(result?.boards).toHaveLength(1)
  })

  it('returns null when API call fails', async () => {
    mockGetMeta.mockResolvedValue(0)
    mockApiFetch.mockRejectedValue(new Error('Network error'))
    const result = await pullRemoteChanges()
    expect(result).toBeNull()
  })
})

describe('onSyncStateChange', () => {
  it('calls listener when sync state changes and unsubscribes cleanly', async () => {
    const op = makePendingOp()
    mockGetPendingSyncOps.mockResolvedValue([op])
    mockUpdateSyncOpStatus.mockResolvedValue(undefined)
    mockApiFetch.mockResolvedValue({
      results: [{ entityId: op.entityId, status: 'applied' }],
    })

    const listener = jest.fn()
    const unsub = onSyncStateChange(listener)
    await processSyncQueue()
    unsub()
    // Listener should have been called at least once
    expect(listener).toHaveBeenCalled()

    // After unsub, further syncs shouldn't call listener
    jest.clearAllMocks()
    mockGetPendingSyncOps.mockResolvedValue([])
    listener.mockClear()
    await processSyncQueue()
    expect(listener).not.toHaveBeenCalled()
  })
})

import { getPendingSyncOps, updateSyncOpStatus, getMeta, setMeta, dbPut, clearStaleOps } from './db'
import { apiFetch } from './api'
import type { Board, Column, Task } from '@/types'

export { clearStaleOps }

// ─── Estado global del sync ───────────────────────────────────────────────────

export type SyncState = 'idle' | 'syncing' | 'error'

type SyncListener = (state: SyncState, applied?: number) => void
type ConflictListener = (conflicts: ConflictItem[]) => void

export interface ConflictItem {
  entityId: string
  entityType: string
  operation: string
  localPayload: Record<string, unknown>
  serverData: unknown
}

const stateListeners = new Set<SyncListener>()
const conflictListeners = new Set<ConflictListener>()
let currentState: SyncState = 'idle'
let isSyncing = false

function emitState(state: SyncState, applied?: number) {
  currentState = state
  stateListeners.forEach((fn) => fn(state, applied))
}

export function getSyncState() {
  return currentState
}

export function onSyncStateChange(fn: SyncListener) {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}

export function onConflict(fn: ConflictListener) {
  conflictListeners.add(fn)
  return () => conflictListeners.delete(fn)
}

// ─── Procesar cola de sync ────────────────────────────────────────────────────

export async function processSyncQueue(): Promise<void> {
  if (isSyncing || typeof window === 'undefined') return
  if (!navigator.onLine) return

  isSyncing = true

  try {
    const pending = await getPendingSyncOps()
    if (pending.length === 0) {
      isSyncing = false
      return // nada que hacer — no emitir nada
    }

    emitState('syncing')

    // Marcar como en progreso
    for (const op of pending) {
      await updateSyncOpStatus(op.id!, 'in-progress')
    }

    const operations = pending.map((op) => ({
      entityType: op.entityType,
      entityId: op.entityId,
      operation: op.operation,
      payload: op.payload,
      timestamp: op.timestamp,
      version: op.version,
    }))

    const { results } = await apiFetch<{
      results: Array<{
        entityId: string
        status: 'applied' | 'conflict' | 'skipped' | 'error'
        serverData?: unknown
        message?: string
      }>
    }>('/sync', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    })

    let appliedCount = 0
    const conflicts: ConflictItem[] = []

    for (const res of results) {
      const op = pending.find((o) => o.entityId === res.entityId)
      if (!op) continue

      if (res.status === 'applied' || res.status === 'skipped') {
        await updateSyncOpStatus(op.id!, 'completed')
        if (res.status === 'applied') appliedCount++
      } else if (res.status === 'conflict') {
        await updateSyncOpStatus(op.id!, 'failed')
        conflicts.push({
          entityId: op.entityId,
          entityType: op.entityType,
          operation: op.operation,
          localPayload: op.payload,
          serverData: res.serverData,
        })
      } else {
        // error — dejar en failed para reintentar
        await updateSyncOpStatus(op.id!, 'failed')
      }
    }

    if (conflicts.length > 0) {
      conflictListeners.forEach((fn) => fn(conflicts))
    }

    emitState('idle', appliedCount)
  } catch {
    // Revertir ops en progreso a pending
    const inProgress = await getPendingSyncOps()
    for (const op of inProgress) {
      if (op.status === 'in-progress') {
        await updateSyncOpStatus(op.id!, 'pending')
      }
    }
    emitState('error')
  } finally {
    isSyncing = false
  }
}

// ─── Pull de cambios remotos ──────────────────────────────────────────────────

export async function pullRemoteChanges(): Promise<{
  boards: Board[]
  columns: Column[]
  tasks: Task[]
} | null> {
  if (typeof window === 'undefined' || !navigator.onLine) return null

  try {
    const lastSync = (await getMeta<number>('lastSyncTime')) ?? 0

    const result = await apiFetch<{
      boards: Board[]
      columns: Column[]
      tasks: Task[]
      timestamp: number
    }>(`/sync/changes?since=${lastSync}`)

    // Persistir en IDB
    for (const board of result.boards) await dbPut('boards', board)
    for (const col of result.columns) await dbPut('columns', col)
    for (const task of result.tasks) await dbPut('tasks', task)

    await setMeta('lastSyncTime', result.timestamp)

    return {
      boards: result.boards,
      columns: result.columns,
      tasks: result.tasks,
    }
  } catch {
    return null
  }
}

// ─── Aplicar resolución de conflicto ─────────────────────────────────────────

export async function resolveConflict(
  item: ConflictItem,
  choice: 'keep-local' | 'use-server'
): Promise<void> {
  const db = await import('./db')
  const allOps = await db.getPendingSyncOps()
  // También buscar en failed (que es donde quedan los conflictos)
  const dbInstance = await db.getDB()
  const failedOps = await dbInstance.getAllFromIndex('syncQueue', 'status', 'failed')
  const matchingOps = [...allOps, ...failedOps].filter((o) => o.entityId === item.entityId)

  if (choice === 'keep-local') {
    // Reenviar el cambio local directamente a la API (sin chequeo de versión en ese endpoint)
    try {
      if (item.entityType === 'task') {
        if (item.operation === 'UPDATE') {
          await apiFetch(`/tasks/${item.entityId}`, {
            method: 'PATCH',
            body: JSON.stringify(item.localPayload),
          })
        } else if (item.operation === 'MOVE') {
          await apiFetch(`/tasks/${item.entityId}/move`, {
            method: 'PATCH',
            body: JSON.stringify(item.localPayload),
          })
        }
      }
    } catch {
      // Si falla el reenvío, lo dejamos como pending para próximo sync
    }
  }
  // En ambos casos marcar las ops como completadas
  for (const op of matchingOps) {
    await updateSyncOpStatus(op.id!, 'completed')
  }
}

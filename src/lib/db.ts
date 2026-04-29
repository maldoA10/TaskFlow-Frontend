import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION } from './constants'
import type {
  User,
  Board,
  BoardMember,
  Column,
  Task,
  Comment,
  SyncOperation,
  AppMeta,
} from '@/types'

interface TaskFlowDB extends DBSchema {
  users: { key: string; value: User }
  boards: { key: string; value: Board; indexes: { ownerId: string } }
  boardMembers: { key: string; value: BoardMember; indexes: { boardId: string; userId: string } }
  columns: { key: string; value: Column; indexes: { boardId: string } }
  tasks: {
    key: string
    value: Task
    indexes: { columnId: string; boardId: string; assigneeId: string }
  }
  comments: { key: string; value: Comment; indexes: { taskId: string } }
  syncQueue: {
    key: number
    value: SyncOperation
    indexes: { timestamp: number; status: string }
  }
  appMeta: { key: string; value: AppMeta }
}

let dbPromise: Promise<IDBPDatabase<TaskFlowDB>> | null = null

export function getDB(): Promise<IDBPDatabase<TaskFlowDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB no disponible en servidor'))
  }
  if (!dbPromise) {
    dbPromise = openDB<TaskFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // users
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' })
        }
        // boards
        if (!db.objectStoreNames.contains('boards')) {
          const boards = db.createObjectStore('boards', { keyPath: 'id' })
          boards.createIndex('ownerId', 'ownerId')
        }
        // boardMembers
        if (!db.objectStoreNames.contains('boardMembers')) {
          const bm = db.createObjectStore('boardMembers', { keyPath: 'id' })
          bm.createIndex('boardId', 'boardId')
          bm.createIndex('userId', 'userId')
        }
        // columns
        if (!db.objectStoreNames.contains('columns')) {
          const cols = db.createObjectStore('columns', { keyPath: 'id' })
          cols.createIndex('boardId', 'boardId')
        }
        // tasks
        if (!db.objectStoreNames.contains('tasks')) {
          const tasks = db.createObjectStore('tasks', { keyPath: 'id' })
          tasks.createIndex('columnId', 'columnId')
          tasks.createIndex('boardId', 'boardId')
          tasks.createIndex('assigneeId', 'assigneeId')
        }
        // comments
        if (!db.objectStoreNames.contains('comments')) {
          const comments = db.createObjectStore('comments', { keyPath: 'id' })
          comments.createIndex('taskId', 'taskId')
        }
        // syncQueue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const sq = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          sq.createIndex('timestamp', 'timestamp')
          sq.createIndex('status', 'status')
        }
        // appMeta
        if (!db.objectStoreNames.contains('appMeta')) {
          db.createObjectStore('appMeta', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

// App Meta helpers

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const entry = await db.get('appMeta', key)
  return entry?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('appMeta', { key, value })
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('appMeta', key)
}

// Generic CRUD helpers

type StoreName = 'users' | 'boards' | 'boardMembers' | 'columns' | 'tasks' | 'comments'

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await getDB()
  return db.getAll(store) as Promise<T[]>
}

export async function dbGetById<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await getDB()
  return db.get(store, id) as Promise<T | undefined>
}

export async function dbPut<T>(store: StoreName, value: T): Promise<void> {
  const db = await getDB()
  await db.put(store, value as never)
}

export async function dbDelete(store: StoreName, id: string): Promise<void> {
  const db = await getDB()
  await db.delete(store, id)
}

export async function dbGetByIndex<T>(
  store: StoreName,
  index: string,
  value: string
): Promise<T[]> {
  const db = await getDB()
  return (
    (db as Parameters<typeof db.getAllFromIndex>[0] extends never ? never : typeof db)
      // @ts-expect-error dynamic index name
      .getAllFromIndex(store, index, value) as Promise<T[]>
  )
}

// Sync Queue helpers

export async function enqueueSyncOp(op: Omit<SyncOperation, 'id'>): Promise<void> {
  const db = await getDB()
  await db.add('syncQueue', op as SyncOperation)
}

export async function getPendingSyncOps(): Promise<SyncOperation[]> {
  const db = await getDB()
  return db.getAllFromIndex('syncQueue', 'status', 'pending')
}

export async function updateSyncOpStatus(
  id: number,
  status: SyncOperation['status']
): Promise<void> {
  const db = await getDB()
  const op = await db.get('syncQueue', id)
  if (op) {
    await db.put('syncQueue', { ...op, status })
  }
}

export async function clearCompletedSyncOps(): Promise<void> {
  const db = await getDB()
  const completed = await db.getAllFromIndex('syncQueue', 'status', 'completed')
  const tx = db.transaction('syncQueue', 'readwrite')
  await Promise.all(completed.map((op) => tx.store.delete(op.id!)))
  await tx.done
}

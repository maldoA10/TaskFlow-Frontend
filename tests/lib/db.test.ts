/**
 * @file src/tests/lib/db.test.ts
 * Tests para los helpers de IndexedDB en lib/db.ts.
 * Usa fake-indexeddb para simular el browser sin DOM real.
 */

// Polyfill ANTES de importar lib/db
import 'fake-indexeddb/auto'

import { getMeta, setMeta, deleteMeta, dbPut, dbGetById, dbGetAll, dbDelete } from '@/lib/db'
import type { Board } from '@/types'

// Resetear la instancia de DB entre tests para aislar estado
beforeEach(async () => {
  // Reimportar el módulo fresco en cada test reiniciando el singleton
  jest.resetModules()
})

// appMeta helpers

describe('getMeta / setMeta / deleteMeta', () => {
  it('setMeta guarda un valor y getMeta lo recupera', async () => {
    const { setMeta: set, getMeta: get } = await import('@/lib/db')
    await set('testKey', 'hello-world')
    const result = await get<string>('testKey')
    expect(result).toBe('hello-world')
  })

  it('getMeta devuelve undefined para una clave inexistente', async () => {
    const { getMeta: get } = await import('@/lib/db')
    const result = await get<string>('non-existent-key-xyz')
    expect(result).toBeUndefined()
  })

  it('deleteMeta elimina la clave y getMeta devuelve undefined', async () => {
    const { setMeta: set, getMeta: get, deleteMeta: del } = await import('@/lib/db')
    await set('toDelete', 42)
    await del('toDelete')
    const result = await get<number>('toDelete')
    expect(result).toBeUndefined()
  })

  it('setMeta sobrescribe un valor existente', async () => {
    const { setMeta: set, getMeta: get } = await import('@/lib/db')
    await set('overwrite', 'first')
    await set('overwrite', 'second')
    const result = await get<string>('overwrite')
    expect(result).toBe('second')
  })

  it('guarda y recupera objetos complejos (User)', async () => {
    const { setMeta: set, getMeta: get } = await import('@/lib/db')
    const user = { id: 'u1', name: 'Ana', email: 'ana@test.com' }
    await set('user', user)
    const result = await get<typeof user>('user')
    expect(result).toEqual(user)
  })
})

// Generic CRUD helpers

describe('dbPut / dbGetById / dbGetAll / dbDelete', () => {
  const sampleBoard: Board = {
    id: 'board-1',
    name: 'Mi Tablero',
    ownerId: 'user-1',
    description: 'Descripción de prueba',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('dbPut guarda un registro y dbGetById lo recupera', async () => {
    const { dbPut: put, dbGetById: getById } = await import('@/lib/db')
    await put('boards', sampleBoard)
    const result = await getById<Board>('boards', 'board-1')
    expect(result).toEqual(sampleBoard)
  })

  it('dbGetById devuelve undefined para un id inexistente', async () => {
    const { dbGetById: getById } = await import('@/lib/db')
    const result = await getById<Board>('boards', 'no-existe')
    expect(result).toBeUndefined()
  })

  it('dbGetAll devuelve todos los registros del store', async () => {
    const { dbPut: put, dbGetAll: getAll } = await import('@/lib/db')
    const board2: Board = { ...sampleBoard, id: 'board-2', name: 'Tablero 2' }
    await put('boards', sampleBoard)
    await put('boards', board2)
    const all = await getAll<Board>('boards')
    expect(all.length).toBeGreaterThanOrEqual(2)
  })

  it('dbDelete elimina un registro y ya no es recuperable', async () => {
    const { dbPut: put, dbDelete: del, dbGetById: getById } = await import('@/lib/db')
    await put('boards', sampleBoard)
    await del('boards', 'board-1')
    const result = await getById<Board>('boards', 'board-1')
    expect(result).toBeUndefined()
  })
})
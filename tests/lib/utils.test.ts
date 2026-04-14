/**
 * @file src/tests/lib/utils.test.ts
 */

import { cn, formatDate, isOverdue, generateId } from '@/lib/utils'

// Helper: construye un ISO string en hora local para evitar desfase UTC
function localISO(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12, 0, 0).toISOString()
}

describe('cn', () => {
  it('combina clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resuelve conflictos de Tailwind (la última clase gana)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('omite valores falsy', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar')
  })

  it('soporta clases condicionales con objeto', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })

  it('devuelve cadena vacía si no hay clases válidas', () => {
    expect(cn(false, null, undefined)).toBe('')
  })

  it('combina clases condicionales con clases fijas', () => {
    expect(cn('base', { active: true, inactive: false })).toBe('base active')
  })
})

describe('formatDate', () => {
  it('formatea el día y año correctamente', () => {
    const result = formatDate(localISO(2024, 1, 15))
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2024/)
  })

  it('incluye el mes abreviado en español', () => {
    const result = formatDate(localISO(2024, 6, 15))
    expect(result.toLowerCase()).toMatch(/jun/)
  })

  it('maneja el último día del año correctamente', () => {
    const result = formatDate(localISO(2023, 12, 31))
    expect(result).toMatch(/31/)
    expect(result).toMatch(/2023/)
  })
})

describe('isOverdue', () => {
  it('retorna false cuando no se proporciona fecha', () => {
    expect(isOverdue()).toBe(false)
    expect(isOverdue(undefined)).toBe(false)
  })

  it('retorna true cuando la fecha ya pasó', () => {
    expect(isOverdue('2000-01-01')).toBe(true)
  })

  it('retorna false cuando la fecha es en el futuro', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 10)
    expect(isOverdue(future.toISOString())).toBe(false)
  })

  it('retorna true para fechas de ayer', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isOverdue(yesterday.toISOString())).toBe(true)
  })
})

describe('generateId', () => {
  it('genera un UUID con el formato correcto', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(generateId()).toMatch(uuidRegex)
  })

  it('genera IDs únicos en cada llamada', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()))
    expect(ids.size).toBe(20)
  })

  it('devuelve un string', () => {
    expect(typeof generateId()).toBe('string')
  })
})
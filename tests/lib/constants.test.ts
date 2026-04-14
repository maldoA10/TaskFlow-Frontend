/**
 * @file src/tests/lib/constants.test.ts
 * Valida que las constantes exportadas tienen los valores y tipos esperados.
 */

import {
  DB_NAME,
  DB_VERSION,
  SYNC_TAG,
  SYNC_INTERVAL_MS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  COLUMN_COLORS,
} from '@/lib/constants'

describe('constants', () => {
  describe('DB_NAME / DB_VERSION', () => {
    it('DB_NAME es un string no vacío', () => {
      expect(typeof DB_NAME).toBe('string')
      expect(DB_NAME.length).toBeGreaterThan(0)
    })

    it('DB_VERSION es un número entero positivo', () => {
      expect(typeof DB_VERSION).toBe('number')
      expect(Number.isInteger(DB_VERSION)).toBe(true)
      expect(DB_VERSION).toBeGreaterThan(0)
    })
  })

  describe('SYNC_TAG / SYNC_INTERVAL_MS', () => {
    it('SYNC_TAG es un string no vacío', () => {
      expect(typeof SYNC_TAG).toBe('string')
      expect(SYNC_TAG.length).toBeGreaterThan(0)
    })

    it('SYNC_INTERVAL_MS es un número positivo', () => {
      expect(typeof SYNC_INTERVAL_MS).toBe('number')
      expect(SYNC_INTERVAL_MS).toBeGreaterThan(0)
    })
  })

  describe('PRIORITY_COLORS', () => {
    const expectedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

    it('contiene todas las prioridades esperadas', () => {
      expectedPriorities.forEach((p) => {
        expect(PRIORITY_COLORS).toHaveProperty(p)
      })
    })

    it('cada valor es un color hex válido', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/
      Object.values(PRIORITY_COLORS).forEach((color) => {
        expect(color).toMatch(hexRegex)
      })
    })
  })

  describe('PRIORITY_LABELS', () => {
    it('contiene etiquetas en español para todas las prioridades', () => {
      expect(PRIORITY_LABELS['LOW']).toBe('Baja')
      expect(PRIORITY_LABELS['MEDIUM']).toBe('Media')
      expect(PRIORITY_LABELS['HIGH']).toBe('Alta')
      expect(PRIORITY_LABELS['URGENT']).toBe('Urgente')
    })

    it('las claves de PRIORITY_LABELS y PRIORITY_COLORS coinciden', () => {
      expect(Object.keys(PRIORITY_LABELS).sort()).toEqual(Object.keys(PRIORITY_COLORS).sort())
    })
  })

  describe('COLUMN_COLORS', () => {
    it('contiene colores para los estados base del tablero', () => {
      expect(COLUMN_COLORS).toHaveProperty('Por Hacer')
      expect(COLUMN_COLORS).toHaveProperty('En Progreso')
      expect(COLUMN_COLORS).toHaveProperty('Completado')
    })

    it('cada valor es un color hex válido', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/
      Object.values(COLUMN_COLORS).forEach((color) => {
        expect(color).toMatch(hexRegex)
      })
    })
  })
})
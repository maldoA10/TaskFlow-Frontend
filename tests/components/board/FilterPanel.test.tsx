/**
 * @file src/tests/components/board/FilterPanel.test.tsx
 * Tests para FilterPanel y las funciones puras hasActiveFilters y taskPassesFilters.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  FilterPanel,
  hasActiveFilters,
  taskPassesFilters,
  EMPTY_FILTERS,
  type ActiveFilters,
} from '@/components/board/FilterPanel'
import type { BoardMember } from '@/types'

// Fixtures

const mockMembers: (BoardMember & {
  user: { id: string; name: string; email: string; avatarUrl?: string }
})[] = [
    {
      id: 'm1', boardId: 'b1', userId: 'u1', role: 'MEMBER', createdAt: '',
      user: { id: 'u1', name: 'Ana García', email: 'ana@test.com' },
    },
    {
      id: 'm2', boardId: 'b1', userId: 'u2', role: 'OWNER', createdAt: '',
      user: { id: 'u2', name: 'Carlos López', email: 'carlos@test.com' },
    },
  ]

const allTags = ['frontend', 'backend', 'design']

function renderPanel(filters: ActiveFilters = EMPTY_FILTERS, onChange = jest.fn()) {
  return render(
    <FilterPanel members={mockMembers} allTags={allTags} filters={filters} onChange={onChange} />
  )
}

// hasActiveFilters

describe('hasActiveFilters', () => {
  it('devuelve false con filtros vacíos', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })

  it('devuelve true si hay prioridades activas', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, priorities: ['HIGH'] })).toBe(true)
  })

  it('devuelve true si hay assignees activos', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, assigneeIds: ['u1'] })).toBe(true)
  })

  it('devuelve true si hay tags activos', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, tags: ['frontend'] })).toBe(true)
  })
})

// taskPassesFilters

describe('taskPassesFilters', () => {
  const task = { priority: 'HIGH' as const, assigneeId: 'u1', tags: ['frontend', 'design'] }

  it('devuelve true con filtros vacíos', () => {
    expect(taskPassesFilters(task, EMPTY_FILTERS)).toBe(true)
  })

  it('filtra por prioridad correctamente', () => {
    expect(taskPassesFilters(task, { ...EMPTY_FILTERS, priorities: ['HIGH'] })).toBe(true)
    expect(taskPassesFilters(task, { ...EMPTY_FILTERS, priorities: ['LOW'] })).toBe(false)
  })

  it('filtra por assigneeId correctamente', () => {
    expect(taskPassesFilters(task, { ...EMPTY_FILTERS, assigneeIds: ['u1'] })).toBe(true)
    expect(taskPassesFilters(task, { ...EMPTY_FILTERS, assigneeIds: ['u2'] })).toBe(false)
  })

  it('rechaza tarea sin assignee cuando hay filtro de assignee', () => {
    const unassigned = { ...task, assigneeId: undefined }
    expect(taskPassesFilters(unassigned, { ...EMPTY_FILTERS, assigneeIds: ['u1'] })).toBe(false)
  })

  it('filtra por tag (basta con que uno coincida)', () => {
    expect(taskPassesFilters(task, { ...EMPTY_FILTERS, tags: ['frontend'] })).toBe(true)
    expect(taskPassesFilters(task, { ...EMPTY_FILTERS, tags: ['backend'] })).toBe(false)
  })

  it('aplica filtros combinados (intersección)', () => {
    const combined: ActiveFilters = { priorities: ['HIGH'], assigneeIds: ['u1'], tags: ['frontend'] }
    expect(taskPassesFilters(task, combined)).toBe(true)

    const failing: ActiveFilters = { priorities: ['HIGH'], assigneeIds: ['u2'], tags: ['frontend'] }
    expect(taskPassesFilters(task, failing)).toBe(false)
  })
})

// FilterPanel — renderizado

describe('FilterPanel — renderizado', () => {
  it('muestra los 4 chips de prioridad', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Urgente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Media' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baja' })).toBeInTheDocument()
  })

  it('muestra los avatares de los miembros', () => {
    renderPanel()
    expect(screen.getByTitle('Ana García')).toBeInTheDocument()
    expect(screen.getByTitle('Carlos López')).toBeInTheDocument()
  })

  it('muestra las etiquetas disponibles con prefijo #', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: '#frontend' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '#backend' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '#design' })).toBeInTheDocument()
  })

  it('no muestra el botón "Limpiar filtros" con filtros vacíos', () => {
    renderPanel()
    expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument()
  })

  it('muestra el botón "Limpiar filtros" con filtros activos', () => {
    renderPanel({ ...EMPTY_FILTERS, priorities: ['HIGH'] })
    expect(screen.getByText('Limpiar filtros')).toBeInTheDocument()
  })

  it('no muestra sección de miembros si no hay ninguno', () => {
    render(
      <FilterPanel members={[]} allTags={allTags} filters={EMPTY_FILTERS} onChange={jest.fn()} />
    )
    // Los chips de prioridad siguen; los avatares no
    expect(screen.queryByTitle('Ana García')).not.toBeInTheDocument()
  })

  it('no muestra sección de tags si allTags está vacío', () => {
    render(
      <FilterPanel members={mockMembers} allTags={[]} filters={EMPTY_FILTERS} onChange={jest.fn()} />
    )
    expect(screen.queryByRole('button', { name: /^#/ })).not.toBeInTheDocument()
  })
})

// FilterPanel — interacciones

describe('FilterPanel — toggle prioridad', () => {
  it('llama a onChange con la prioridad añadida al hacer click', async () => {
    const onChange = jest.fn()
    renderPanel(EMPTY_FILTERS, onChange)
    await userEvent.click(screen.getByRole('button', { name: 'Alta' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priorities: ['HIGH'] })
    )
  })

  it('elimina la prioridad si ya estaba activa', async () => {
    const onChange = jest.fn()
    renderPanel({ ...EMPTY_FILTERS, priorities: ['HIGH'] }, onChange)
    await userEvent.click(screen.getByRole('button', { name: 'Alta' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priorities: [] })
    )
  })
})

describe('FilterPanel — toggle assignee', () => {
  it('llama a onChange con el userId añadido', async () => {
    const onChange = jest.fn()
    renderPanel(EMPTY_FILTERS, onChange)
    await userEvent.click(screen.getByTitle('Ana García'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeIds: ['u1'] })
    )
  })

  it('elimina el userId si ya estaba activo', async () => {
    const onChange = jest.fn()
    renderPanel({ ...EMPTY_FILTERS, assigneeIds: ['u1'] }, onChange)
    await userEvent.click(screen.getByTitle('Ana García'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeIds: [] })
    )
  })
})

describe('FilterPanel — toggle tag', () => {
  it('llama a onChange con el tag añadido', async () => {
    const onChange = jest.fn()
    renderPanel(EMPTY_FILTERS, onChange)
    await userEvent.click(screen.getByRole('button', { name: '#frontend' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['frontend'] })
    )
  })

  it('elimina el tag si ya estaba activo', async () => {
    const onChange = jest.fn()
    renderPanel({ ...EMPTY_FILTERS, tags: ['frontend'] }, onChange)
    await userEvent.click(screen.getByRole('button', { name: '#frontend' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] })
    )
  })
})

describe('FilterPanel — limpiar filtros', () => {
  it('llama a onChange con EMPTY_FILTERS al limpiar', async () => {
    const onChange = jest.fn()
    renderPanel({ priorities: ['HIGH'], assigneeIds: ['u1'], tags: ['frontend'] }, onChange)
    await userEvent.click(screen.getByText('Limpiar filtros'))
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS)
  })
})
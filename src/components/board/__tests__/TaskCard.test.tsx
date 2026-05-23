/**
 * Tests for TaskCard component
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Task } from '@/types'

// ─── Mock @dnd-kit (no real DnD in tests) ────────────────────────────────────
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))
jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}))

import { TaskCard } from '../TaskCard'

const baseTask: Task = {
  id: 'task-1',
  columnId: 'col-1',
  boardId: 'board-1',
  title: 'Implementar autenticación',
  description: 'Login con JWT',
  priority: 'HIGH',
  dueDate: undefined,
  position: 0,
  assigneeId: undefined,
  createdById: 'user-1',
  tags: ['auth', 'backend'],
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('TaskCard', () => {
  it('renders the task title', () => {
    render(<TaskCard task={baseTask} onClick={jest.fn()} />)
    expect(screen.getByText('Implementar autenticación')).toBeInTheDocument()
  })

  it('renders the priority label', () => {
    render(<TaskCard task={baseTask} onClick={jest.fn()} />)
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('renders tags (up to 3)', () => {
    render(<TaskCard task={baseTask} onClick={jest.fn()} />)
    expect(screen.getByText('auth')).toBeInTheDocument()
    expect(screen.getByText('backend')).toBeInTheDocument()
  })

  it('shows "+N" when there are more than 3 tags', () => {
    const task = { ...baseTask, tags: ['a', 'b', 'c', 'd', 'e'] }
    render(<TaskCard task={task} onClick={jest.fn()} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('calls onClick with the task when clicked', () => {
    const handleClick = jest.fn()
    render(<TaskCard task={baseTask} onClick={handleClick} />)
    fireEvent.click(screen.getByRole('article'))
    expect(handleClick).toHaveBeenCalledWith(baseTask)
  })

  it('renders due date when provided', () => {
    const task = { ...baseTask, dueDate: '2025-12-31T00:00:00Z' }
    render(<TaskCard task={task} onClick={jest.fn()} />)
    // Date should be visible somewhere
    expect(screen.getByText(/dic/i)).toBeInTheDocument()
  })

  it('has accessible aria-label with title and priority', () => {
    render(<TaskCard task={baseTask} onClick={jest.fn()} />)
    const card = screen.getByRole('article')
    expect(card.getAttribute('aria-label')).toContain('Implementar autenticación')
    expect(card.getAttribute('aria-label')).toContain('Alta')
  })

  it('renders MEDIUM priority with correct label', () => {
    const task = { ...baseTask, priority: 'MEDIUM' as const }
    render(<TaskCard task={task} onClick={jest.fn()} />)
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('renders URGENT priority with correct label', () => {
    const task = { ...baseTask, priority: 'URGENT' as const }
    render(<TaskCard task={task} onClick={jest.fn()} />)
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('does not render due date section when dueDate is undefined', () => {
    render(<TaskCard task={baseTask} onClick={jest.fn()} />)
    // No calendar icon text should appear
    expect(
      screen.queryByText(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i)
    ).not.toBeInTheDocument()
  })

  it('applies dimmed styling when dimmed prop is true', () => {
    render(<TaskCard task={baseTask} onClick={jest.fn()} dimmed={true} />)
    const card = screen.getByRole('article')
    expect(card.className).toContain('opacity-30')
  })
})

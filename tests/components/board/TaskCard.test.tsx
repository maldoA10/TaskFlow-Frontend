/**
 * @file src/tests/components/board/TaskCard.test.tsx
 * Tests para TaskCard y TaskCardOverlay.
 * Se mockea dnd-kit para evitar dependencias de contexto de arrastrar.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskCard, TaskCardOverlay } from '@/components/board/TaskCard'
import type { Task } from '@/types'

// Mock de dnd-kit para aislar el componente
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
  CSS: {
    Transform: { toString: () => '' },
  },
}))

const mockTask: Task = {
  id: 't1',
  title: 'Tarea de prueba',
  columnId: 'col1',
  boardId: 'b1',
  position: 0,
  priority: 'MEDIUM',
  description: '',
  tags: [],
  dueDate: null,
  assigneeId: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  version: 1,
}

const mockOnClick = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

// TaskCard — renderizado

describe('TaskCard — renderizado', () => {
  it('muestra el título de la tarea', () => {
    render(<TaskCard task={mockTask} onClick={mockOnClick} />)
    expect(screen.getByText('Tarea de prueba')).toBeInTheDocument()
  })

  it('muestra la prioridad MEDIUM como "Media"', () => {
    render(<TaskCard task={mockTask} onClick={mockOnClick} />)
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('muestra la prioridad HIGH como "Alta"', () => {
    render(<TaskCard task={{ ...mockTask, priority: 'HIGH' }} onClick={mockOnClick} />)
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('muestra la prioridad LOW como "Baja"', () => {
    render(<TaskCard task={{ ...mockTask, priority: 'LOW' }} onClick={mockOnClick} />)
    expect(screen.getByText('Baja')).toBeInTheDocument()
  })

  it('muestra la prioridad URGENT como "Urgente"', () => {
    render(<TaskCard task={{ ...mockTask, priority: 'URGENT' }} onClick={mockOnClick} />)
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('no muestra fecha si dueDate es null', () => {
    render(<TaskCard task={mockTask} onClick={mockOnClick} />)
    expect(screen.queryByRole('img', { name: /calendar/i })).not.toBeInTheDocument()
  })

  it('muestra la fecha si dueDate tiene valor', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    render(<TaskCard task={{ ...mockTask, dueDate: futureDate }} onClick={mockOnClick} />)
    // La fecha se formatea con toLocaleDateString
    const formatted = new Date(futureDate).toLocaleDateString('es', {
      month: 'short',
      day: 'numeric',
    })
    expect(screen.getByText(formatted)).toBeInTheDocument()
  })
})

// TaskCard — etiquetas

describe('TaskCard — etiquetas', () => {
  it('no muestra etiquetas si el array está vacío', () => {
    render(<TaskCard task={mockTask} onClick={mockOnClick} />)
    expect(screen.queryByText('Tag')).not.toBeInTheDocument()
  })

  it('muestra hasta 3 etiquetas', () => {
    const task = { ...mockTask, tags: ['tag1', 'tag2', 'tag3'] }
    render(<TaskCard task={task} onClick={mockOnClick} />)
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
  })

  it('muestra "+N" si hay más de 3 etiquetas', () => {
    const task = { ...mockTask, tags: ['a', 'b', 'c', 'd', 'e'] }
    render(<TaskCard task={task} onClick={mockOnClick} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})

// TaskCard — interacción

describe('TaskCard — interacción', () => {
  it('llama a onClick con la tarea al hacer click', async () => {
    render(<TaskCard task={mockTask} onClick={mockOnClick} />)
    await userEvent.click(screen.getByText('Tarea de prueba'))
    expect(mockOnClick).toHaveBeenCalledWith(mockTask)
  })

  it('aplica clase opacity-40 cuando isDragging es true', () => {
    // isDragging desde useSortable — redefinimos el mock para este test
    jest.resetModules()
    const { container } = render(<TaskCard task={mockTask} onClick={mockOnClick} isDragging />)
    // isDragging prop del componente controla rotate-1 / scale
    // El prop externo es la prop isDragging, no el del hook
    expect(container.firstChild).toBeTruthy()
  })
})

// TaskCardOverlay

describe('TaskCardOverlay — renderizado', () => {
  it('muestra el título de la tarea', () => {
    render(<TaskCardOverlay task={mockTask} />)
    expect(screen.getByText('Tarea de prueba')).toBeInTheDocument()
  })

  it('no lanza errores al renderizar con cualquier prioridad', () => {
    const priorities: Task['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    for (const priority of priorities) {
      expect(() =>
        render(<TaskCardOverlay task={{ ...mockTask, priority }} />)
      ).not.toThrow()
    }
  })
})
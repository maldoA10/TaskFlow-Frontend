/**
 * @file src/tests/components/board/KanbanColumn.test.tsx
 * Tests para el componente KanbanColumn.
 * Se mockean dnd-kit y TaskCard para aislar la lógica de la columna.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KanbanColumn } from '@/components/board/KanbanColumn'
import type { Column, Task } from '@/types'

// Mocks de dnd-kit
jest.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
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
  CSS: { Transform: { toString: () => '' } },
}))

// Mock de TaskCard para aislar KanbanColumn
jest.mock('@/components/board/TaskCard', () => ({
  TaskCard: ({ task, onClick }: { task: Task; onClick: (t: Task) => void }) => (
    <div data-testid={`task-${task.id}`} onClick={() => onClick(task)}>
      {task.title}
    </div>
  ),
}))

const mockOnTaskClick = jest.fn()
const mockOnAddTask = jest.fn()

const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Primera tarea',
    columnId: 'col1',
    boardId: 'b1',
    position: 0,
    priority: 'MEDIUM',
    description: '',
    tags: [],
    dueDate: null,
    assigneeId: null,
    createdAt: '',
    updatedAt: '',
    version: 1,
  },
  {
    id: 't2',
    title: 'Segunda tarea',
    columnId: 'col1',
    boardId: 'b1',
    position: 1,
    priority: 'HIGH',
    description: '',
    tags: [],
    dueDate: null,
    assigneeId: null,
    createdAt: '',
    updatedAt: '',
    version: 1,
  },
]

const mockColumn: Column & { tasks: Task[] } = {
  id: 'col1',
  boardId: 'b1',
  name: 'Por Hacer',
  position: 0,
  createdAt: '',
  tasks: mockTasks,
}

function renderColumn(overrides?: Partial<Column & { tasks: Task[] }>) {
  return render(
    <KanbanColumn
      column={{ ...mockColumn, ...overrides }}
      onTaskClick={mockOnTaskClick}
      onAddTask={mockOnAddTask}
    />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

// Renderizado

describe('KanbanColumn — renderizado', () => {
  it('muestra el nombre de la columna', () => {
    renderColumn()
    expect(screen.getByText('Por Hacer')).toBeInTheDocument()
  })

  it('muestra el conteo de tareas', () => {
    renderColumn()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renderiza todas las tareas de la columna', () => {
    renderColumn()
    expect(screen.getByTestId('task-t1')).toBeInTheDocument()
    expect(screen.getByTestId('task-t2')).toBeInTheDocument()
  })

  it('muestra "Sin tareas" cuando la columna está vacía', () => {
    renderColumn({ tasks: [] })
    expect(screen.getByText('Sin tareas')).toBeInTheDocument()
  })

  it('no muestra "Sin tareas" cuando hay tareas', () => {
    renderColumn()
    expect(screen.queryByText('Sin tareas')).not.toBeInTheDocument()
  })

  it('muestra el conteo 0 cuando no hay tareas', () => {
    renderColumn({ tasks: [] })
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})

// Nombres de columna con colores especiales

describe('KanbanColumn — estilos por nombre', () => {
  it('renderiza la columna "En Progreso" sin errores', () => {
    expect(() =>
      render(
        <KanbanColumn
          column={{ ...mockColumn, name: 'En Progreso' }}
          onTaskClick={mockOnTaskClick}
          onAddTask={mockOnAddTask}
        />
      )
    ).not.toThrow()
  })

  it('renderiza la columna "Completado" sin errores', () => {
    expect(() =>
      render(
        <KanbanColumn
          column={{ ...mockColumn, name: 'Completado' }}
          onTaskClick={mockOnTaskClick}
          onAddTask={mockOnAddTask}
        />
      )
    ).not.toThrow()
  })

  it('renderiza columnas con nombre personalizado sin errores', () => {
    expect(() =>
      render(
        <KanbanColumn
          column={{ ...mockColumn, name: 'Mi Columna Custom' }}
          onTaskClick={mockOnTaskClick}
          onAddTask={mockOnAddTask}
        />
      )
    ).not.toThrow()
  })
})

// Interacciones

describe('KanbanColumn — interacciones', () => {
  it('llama a onAddTask con el id de la columna al hacer click en +', async () => {
    renderColumn()
    await userEvent.click(screen.getByTitle('Agregar tarea'))
    expect(mockOnAddTask).toHaveBeenCalledWith('col1')
  })

  it('llama a onTaskClick al hacer click en una tarea', async () => {
    renderColumn()
    await userEvent.click(screen.getByTestId('task-t1'))
    expect(mockOnTaskClick).toHaveBeenCalledWith(mockTasks[0])
  })
})
/**
 * @file src/tests/components/board/TaskDetailPanel.test.tsx
 * Tests para el componente TaskDetailPanel.
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailPanel } from '@/components/board/TaskDetailPanel'
import type { Task, Column, BoardMember } from '@/types'

// Mock de commentsApi para evitar llamadas reales al montar
const mockCommentsList = jest.fn()
const mockCommentsCreate = jest.fn()

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.code = code
      this.status = status
    }
  }
  return {
    ApiError,
    commentsApi: {
      list: (...args: unknown[]) => mockCommentsList(...args),
      create: (...args: unknown[]) => mockCommentsCreate(...args),
    },
    attachmentsApi: {
      list: jest.fn().mockResolvedValue({ attachments: [] }),
      getUrl: jest.fn().mockReturnValue('http://localhost/attachment'),
      uploadBase64: jest.fn().mockResolvedValue({ attachment: {} }),
      delete: jest.fn().mockResolvedValue(undefined),
    },
  }
})

// Mock de authStore para que postComment encuentre un usuario
jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: 'u1', name: 'Ana García', email: 'ana@test.com', avatarUrl: null, createdAt: '' },
    }),
  },
}))

const mockOnClose = jest.fn()
const mockOnUpdate = jest.fn()
const mockOnDelete = jest.fn()
const mockOnPendingCommentConsumed = jest.fn()

const mockColumns: Column[] = [
  { id: 'col1', boardId: 'b1', name: 'Por Hacer', position: 0, createdAt: '' },
  { id: 'col2', boardId: 'b1', name: 'En Progreso', position: 1, createdAt: '' },
]

const mockMembers: (BoardMember & {
  user?: { id: string; name: string; email: string; avatarUrl?: string }
})[] = [
  {
    id: 'm1',
    boardId: 'b1',
    userId: 'u1',
    role: 'MEMBER',
    createdAt: '',
    user: { id: 'u1', name: 'Ana García', email: 'ana@test.com' },
  },
]

const mockTask: Task = {
  id: 't1',
  title: 'Tarea de prueba',
  columnId: 'col1',
  boardId: 'b1',
  position: 0,
  priority: 'MEDIUM',
  description: 'Descripción original',
  tags: ['frontend'],
  dueDate: null,
  assigneeId: null,
  createdAt: '2024-03-15T10:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
  version: 2,
}

async function renderPanel(overrides?: Partial<Task>) {
  // act async drena el useEffect de commentsApi.list al montar
  await act(async () => {
    render(
      <TaskDetailPanel
        task={{ ...mockTask, ...overrides }}
        columns={mockColumns}
        members={mockMembers}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        pendingComment={null}
        onPendingCommentConsumed={mockOnPendingCommentConsumed}
      />
    )
  })
}

beforeEach(() => {
  // jsdom no implementa scrollIntoView; mockearlo para evitar TypeError
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  jest.clearAllMocks()
  mockOnUpdate.mockResolvedValue(undefined)
  mockOnDelete.mockResolvedValue(undefined)
  // Por defecto la lista de comentarios devuelve vacío
  mockCommentsList.mockResolvedValue({ comments: [] })
  mockCommentsCreate.mockResolvedValue({
    comment: {
      id: 'c1',
      taskId: 't1',
      content: 'Comentario nuevo',
      createdAt: new Date().toISOString(),
      author: { id: 'u1', name: 'Ana García', email: 'ana@test.com' },
    },
  })
})

// Renderizado inicial

describe('TaskDetailPanel — renderizado', () => {
  it('muestra el título de la tarea en el textarea', async () => {
    await renderPanel()
    expect(screen.getByDisplayValue('Tarea de prueba')).toBeInTheDocument()
  })

  it('muestra la descripción inicial', async () => {
    await renderPanel()
    expect(screen.getByDisplayValue('Descripción original')).toBeInTheDocument()
  })

  it('muestra el nombre de la columna actual', async () => {
    await renderPanel()
    expect(screen.getByText('Por Hacer')).toBeInTheDocument()
  })

  it('muestra las etiquetas existentes', async () => {
    await renderPanel()
    expect(screen.getByText('frontend')).toBeInTheDocument()
  })

  it('muestra la versión de la tarea', async () => {
    await renderPanel()
    expect(screen.getByText('v2')).toBeInTheDocument()
  })

  it('muestra la fecha de creación', async () => {
    await renderPanel()
    const formatted = new Date('2024-03-15T10:00:00Z').toLocaleDateString('es')
    expect(screen.getByText(formatted)).toBeInTheDocument()
  })

  it('muestra el botón de eliminar', async () => {
    await renderPanel()
    expect(screen.getByText('Eliminar tarea')).toBeInTheDocument()
  })

  it('renderiza los cuatro botones de prioridad', async () => {
    await renderPanel()
    expect(screen.getByRole('button', { name: 'Baja' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Media' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Urgente' })).toBeInTheDocument()
  })

  it('muestra el select de asignado con los miembros', async () => {
    await renderPanel()
    expect(screen.getByRole('option', { name: 'Sin asignar' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Ana García/ })).toBeInTheDocument()
  })

  it('llama a commentsApi.list al montar', async () => {
    await renderPanel()
    await waitFor(() => {
      expect(mockCommentsList).toHaveBeenCalledWith('t1')
    })
  })

  it('muestra "Sin comentarios aún" cuando no hay comentarios', async () => {
    await renderPanel()
    await waitFor(() => {
      expect(screen.getByText('Sin comentarios aún')).toBeInTheDocument()
    })
  })
})

// Edición de título

describe('TaskDetailPanel — edición de título', () => {
  it('muestra "Guardar" al modificar el título', async () => {
    await renderPanel()
    const titleArea = screen.getByDisplayValue('Tarea de prueba')
    await userEvent.clear(titleArea)
    await userEvent.type(titleArea, 'Nuevo título')
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('llama a onUpdate al hacer blur en el título modificado', async () => {
    await renderPanel()
    const titleArea = screen.getByDisplayValue('Tarea de prueba')
    await userEvent.clear(titleArea)
    await userEvent.type(titleArea, 'Actualizado')
    await userEvent.tab()

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ title: 'Actualizado' })
      )
    })
  })

  it('muestra "Guardando…" mientras onUpdate está en curso', async () => {
    mockOnUpdate.mockReturnValueOnce(new Promise(() => {}))
    await renderPanel()

    const titleArea = screen.getByDisplayValue('Tarea de prueba')
    await userEvent.clear(titleArea)
    await userEvent.type(titleArea, 'Nuevo')
    await userEvent.tab()

    expect(await screen.findByText('Guardando…')).toBeInTheDocument()
  })
})

// Cambio de prioridad

describe('TaskDetailPanel — prioridad', () => {
  it('cambia la prioridad al hacer click en un botón', async () => {
    await renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Alta' }))
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('llama a onUpdate con la nueva prioridad al guardar', async () => {
    await renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Urgente' }))
    await userEvent.click(screen.getByText('Guardar'))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ priority: 'URGENT' })
      )
    })
  })
})

// Asignación

describe('TaskDetailPanel — asignado', () => {
  it('muestra el nombre del asignado al seleccionarlo', async () => {
    await renderPanel()
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'u1')
    // El párrafo de confirmación tiene la clase text-xs; buscamos el que contiene el nombre
    const confirmParagraph = screen.getByText((_, el) =>
      el?.tagName === 'P' && !!el?.textContent?.includes('Asignado a')
    )
    expect(confirmParagraph).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('marca como dirty al cambiar el asignado', async () => {
    await renderPanel()
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'u1')
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })
})

// Etiquetas

describe('TaskDetailPanel — etiquetas', () => {
  it('añade una etiqueta al presionar Enter', async () => {
    await renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'nueva-tag{Enter}')
    expect(screen.getByText('nueva-tag')).toBeInTheDocument()
  })

  it('añade una etiqueta al hacer click en el botón +', async () => {
    await renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'tag-boton')
    const allButtons = screen.getAllByRole('button')
    const plusButton = allButtons.find(
      (b) => b.querySelector('svg') && b.closest('div')?.querySelector('input[placeholder="Nueva etiqueta…"]')
    )!
    await userEvent.click(plusButton)
    expect(screen.getByText('tag-boton')).toBeInTheDocument()
  })

  it('normaliza la etiqueta a minúsculas con guiones', async () => {
    await renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'Mi Tag{Enter}')
    expect(screen.getByText('mi-tag')).toBeInTheDocument()
  })

  it('no añade etiquetas duplicadas', async () => {
    await renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'frontend{Enter}')
    expect(screen.getAllByText('frontend')).toHaveLength(1)
  })

  it('elimina una etiqueta al hacer click en ×', async () => {
    await renderPanel()
    const removeButtons = screen.getAllByRole('button', { name: '×' })
    await userEvent.click(removeButtons[0])
    expect(screen.queryByText('frontend')).not.toBeInTheDocument()
  })
})

// Fecha límite

describe('TaskDetailPanel — fecha límite', () => {
  it('muestra la fecha si dueDate tiene valor', async () => {
    await renderPanel({ dueDate: '2024-12-31T00:00:00Z' })
    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument()
  })

  it('llama a onUpdate con la nueva fecha al hacer blur', async () => {
    await renderPanel()
    const dateInput = document.querySelector('input[type="date"]') as HTMLElement
    await userEvent.type(dateInput, '2025-06-01')
    await userEvent.tab()

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ dueDate: '2025-06-01' })
      )
    })
  })
})

// Comentarios

describe('TaskDetailPanel — comentarios', () => {
  it('muestra los comentarios cargados desde la API', async () => {
    mockCommentsList.mockResolvedValueOnce({
      comments: [
        {
          id: 'c1',
          taskId: 't1',
          content: 'Primer comentario',
          createdAt: '2024-03-15T11:00:00Z',
          author: { id: 'u1', name: 'Ana García', email: 'ana@test.com' },
        },
      ],
    })
    await renderPanel()
    await waitFor(() => {
      expect(screen.getByText('Primer comentario')).toBeInTheDocument()
    })
  })

  it('muestra el nombre del autor del comentario', async () => {
    mockCommentsList.mockResolvedValueOnce({
      comments: [
        {
          id: 'c1',
          taskId: 't1',
          content: 'Hola',
          createdAt: '2024-03-15T11:00:00Z',
          author: { id: 'u1', name: 'Ana García', email: 'ana@test.com' },
        },
      ],
    })
    await renderPanel()
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
    })
  })

  it('envía un comentario al presionar Enter en el input', async () => {
    await renderPanel()
    const commentInput = screen.getByPlaceholderText('Escribe un comentario…')
    await userEvent.type(commentInput, 'Mi comentario{Enter}')

    await waitFor(() => {
      expect(mockCommentsCreate).toHaveBeenCalledWith('t1', 'Mi comentario')
    })
  })

  it('añade el nuevo comentario a la lista tras enviarlo', async () => {
    await renderPanel()
    const commentInput = screen.getByPlaceholderText('Escribe un comentario…')
    await userEvent.type(commentInput, 'Comentario nuevo{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Comentario nuevo')).toBeInTheDocument()
    })
  })

  it('limpia el input tras enviar el comentario', async () => {
    await renderPanel()
    const commentInput = screen.getByPlaceholderText('Escribe un comentario…') as HTMLInputElement
    await userEvent.type(commentInput, 'Test{Enter}')

    await waitFor(() => {
      expect(commentInput.value).toBe('')
    })
  })

  it('consume el pendingComment si corresponde a la tarea abierta', async () => {
    const pending = {
      id: 'c-ws',
      taskId: 't1',
      content: 'Comentario en tiempo real',
      createdAt: new Date().toISOString(),
      author: { id: 'u2', name: 'Carlos', email: 'c@test.com' },
    }

    render(
      <TaskDetailPanel
        task={mockTask}
        columns={mockColumns}
        members={mockMembers}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        pendingComment={pending}
        onPendingCommentConsumed={mockOnPendingCommentConsumed}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Comentario en tiempo real')).toBeInTheDocument()
      expect(mockOnPendingCommentConsumed).toHaveBeenCalled()
    })
  })

  it('no consume el pendingComment si es de otra tarea', async () => {
    const pending = {
      id: 'c-ws',
      taskId: 't-otro',
      content: 'No me corresponde',
      createdAt: new Date().toISOString(),
      author: { id: 'u2', name: 'Carlos', email: 'c@test.com' },
    }

    render(
      <TaskDetailPanel
        task={mockTask}
        columns={mockColumns}
        members={mockMembers}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        pendingComment={pending}
        onPendingCommentConsumed={mockOnPendingCommentConsumed}
      />
    )

    await waitFor(() => expect(mockCommentsList).toHaveBeenCalled())
    expect(mockOnPendingCommentConsumed).not.toHaveBeenCalled()
    expect(screen.queryByText('No me corresponde')).not.toBeInTheDocument()
  })
})

// Eliminación

describe('TaskDetailPanel — eliminación', () => {
  it('muestra confirmación al hacer click en "Eliminar tarea"', async () => {
    await renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    expect(screen.getByText('¿Eliminar esta tarea?')).toBeInTheDocument()
  })

  it('muestra los botones Cancelar y Eliminar en la confirmación', async () => {
    await renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('cancela la eliminación al hacer click en Cancelar', async () => {
    await renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('¿Eliminar esta tarea?')).not.toBeInTheDocument()
  })

  it('llama a onDelete con el id al confirmar eliminación', async () => {
    await renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('t1')
    })
  })

  it('llama a onClose tras confirmar la eliminación', async () => {
    await renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})

// Cierre del panel

describe('TaskDetailPanel — cierre', () => {
  it('llama a onClose al hacer click en el botón X', async () => {
    await renderPanel()
    const xButtons = screen.getAllByRole('button').filter(
      (b) => b.querySelector('svg') && !b.textContent?.trim()
    )
    await userEvent.click(xButtons[0])
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
  })

  it('llama a onClose al hacer click en el backdrop', async () => {
    await renderPanel()
    const backdrop = document.querySelector('.bg-black\\/40') as HTMLElement
    await userEvent.click(backdrop)
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
  })
})
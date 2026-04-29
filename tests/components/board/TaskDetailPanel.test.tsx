/**
 * @file src/tests/components/board/TaskDetailPanel.test.tsx
 * Tests para el componente TaskDetailPanel.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailPanel } from '@/components/board/TaskDetailPanel'
import type { Task, Column } from '@/types'

const mockOnClose = jest.fn()
const mockOnUpdate = jest.fn()
const mockOnDelete = jest.fn()

const mockColumns: Column[] = [
  { id: 'col1', boardId: 'b1', name: 'Por Hacer', position: 0, createdAt: '' },
  { id: 'col2', boardId: 'b1', name: 'En Progreso', position: 1, createdAt: '' },
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

function renderPanel(overrides?: Partial<Task>) {
  return render(
    <TaskDetailPanel
      task={{ ...mockTask, ...overrides }}
      columns={mockColumns}
      onClose={mockOnClose}
      onUpdate={mockOnUpdate}
      onDelete={mockOnDelete}
    />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockOnUpdate.mockResolvedValue(undefined)
  mockOnDelete.mockResolvedValue(undefined)
})

// Renderizado inicial

describe('TaskDetailPanel — renderizado', () => {
  it('muestra el título de la tarea en el textarea', () => {
    renderPanel()
    expect(screen.getByDisplayValue('Tarea de prueba')).toBeInTheDocument()
  })

  it('muestra la descripción inicial', () => {
    renderPanel()
    expect(screen.getByDisplayValue('Descripción original')).toBeInTheDocument()
  })

  it('muestra el nombre de la columna actual', () => {
    renderPanel()
    expect(screen.getByText('Por Hacer')).toBeInTheDocument()
  })

  it('muestra las etiquetas existentes', () => {
    renderPanel()
    expect(screen.getByText('frontend')).toBeInTheDocument()
  })

  it('muestra la versión de la tarea', () => {
    renderPanel()
    expect(screen.getByText('v2')).toBeInTheDocument()
  })

  it('muestra la fecha de creación', () => {
    renderPanel()
    const formatted = new Date('2024-03-15T10:00:00Z').toLocaleDateString('es')
    expect(screen.getByText(formatted)).toBeInTheDocument()
  })

  it('muestra el botón de eliminar', () => {
    renderPanel()
    expect(screen.getByText('Eliminar tarea')).toBeInTheDocument()
  })

  it('renderiza los cuatro botones de prioridad', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Baja' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Media' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Urgente' })).toBeInTheDocument()
  })
})

// Edición de título

describe('TaskDetailPanel — edición de título', () => {
  it('muestra "Guardar" al modificar el título', async () => {
    renderPanel()
    const titleArea = screen.getByDisplayValue('Tarea de prueba')
    await userEvent.clear(titleArea)
    await userEvent.type(titleArea, 'Nuevo título')
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('llama a onUpdate al hacer blur en el título modificado', async () => {
    renderPanel()
    const titleArea = screen.getByDisplayValue('Tarea de prueba')
    await userEvent.clear(titleArea)
    await userEvent.type(titleArea, 'Actualizado')
    await userEvent.tab() // dispara blur

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ title: 'Actualizado' })
      )
    })
  })

  it('muestra "Guardando…" mientras onUpdate está en curso', async () => {
    mockOnUpdate.mockReturnValueOnce(new Promise(() => {}))
    renderPanel()

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
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Alta' }))

    // Tras cambiar la prioridad isDirty=true, debería aparecer "Guardar"
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('llama a onUpdate con la nueva prioridad al guardar', async () => {
    renderPanel()
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

// Etiquetas

describe('TaskDetailPanel — etiquetas', () => {
  it('añade una etiqueta al presionar Enter', async () => {
    renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'nueva-tag{Enter}')
    expect(screen.getByText('nueva-tag')).toBeInTheDocument()
  })

  it('añade una etiqueta al hacer click en el botón +', async () => {
    renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'tag-boton')
    // El botón + está junto al input de etiqueta; buscamos todos los botones
    // y tomamos el que contiene el icono Plus (no tiene texto visible)
    const allButtons = screen.getAllByRole('button')
    const plusButton = allButtons.find(
      (b) => b.querySelector('svg') && b.closest('div')?.querySelector('input[placeholder="Nueva etiqueta…"]')
    )!
    await userEvent.click(plusButton)
    expect(screen.getByText('tag-boton')).toBeInTheDocument()
  })

  it('normaliza la etiqueta a minúsculas con guiones', async () => {
    renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'Mi Tag{Enter}')
    expect(screen.getByText('mi-tag')).toBeInTheDocument()
  })

  it('no añade etiquetas duplicadas', async () => {
    renderPanel()
    const tagInput = screen.getByPlaceholderText('Nueva etiqueta…')
    await userEvent.type(tagInput, 'frontend{Enter}') // ya existe
    const frontendTags = screen.getAllByText('frontend')
    expect(frontendTags).toHaveLength(1)
  })

  it('elimina una etiqueta al hacer click en ×', async () => {
    renderPanel()
    // 'frontend' ya existe en la tarea
    const removeButtons = screen.getAllByRole('button', { name: '×' })
    await userEvent.click(removeButtons[0])
    expect(screen.queryByText('frontend')).not.toBeInTheDocument()
  })
})

// Fecha límite

describe('TaskDetailPanel — fecha límite', () => {
  it('muestra la fecha si dueDate tiene valor', () => {
    renderPanel({ dueDate: '2024-12-31T00:00:00Z' })
    const dateInput = screen.getByDisplayValue('2024-12-31')
    expect(dateInput).toBeInTheDocument()
  })

  it('llama a onUpdate con la nueva fecha al hacer blur', async () => {
    renderPanel()
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

// Eliminación

describe('TaskDetailPanel — eliminación', () => {
  it('muestra confirmación al hacer click en "Eliminar tarea"', async () => {
    renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    expect(screen.getByText('¿Eliminar esta tarea?')).toBeInTheDocument()
  })

  it('muestra los botones Cancelar y Eliminar en la confirmación', async () => {
    renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('cancela la eliminación al hacer click en Cancelar', async () => {
    renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('¿Eliminar esta tarea?')).not.toBeInTheDocument()
  })

  it('llama a onDelete con el id al confirmar eliminación', async () => {
    renderPanel()
    await userEvent.click(screen.getByText('Eliminar tarea'))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('t1')
    })
  })

  it('llama a onClose tras confirmar la eliminación', async () => {
    renderPanel()
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
    renderPanel()
    // El botón X no tiene texto visible; filtramos botones con SVG y sin texto
    const xButtons = screen.getAllByRole('button').filter(
      (b) => b.querySelector('svg') && !b.textContent?.trim()
    )
    await userEvent.click(xButtons[0])
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
  })

  it('llama a onClose al hacer click en el backdrop', async () => {
    renderPanel()
    const backdrop = document.querySelector('.bg-black\\/40') as HTMLElement
    await userEvent.click(backdrop)
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
  })
})
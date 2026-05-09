/**
 * @file src/tests/components/board/ConflictModal.test.tsx
 * Tests para el componente ConflictModal.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConflictModal } from '@/components/board/ConflictModal'
import type { ConflictItem } from '@/lib/sync'

// Mock de resolveConflict
const mockResolveConflict = jest.fn()
jest.mock('@/lib/sync', () => ({
  resolveConflict: (...args: unknown[]) => mockResolveConflict(...args),
}))

const mockOnClose = jest.fn()

const conflict1: ConflictItem = {
  entityId: 'task-id-1',
  entityType: 'task',
  operation: 'UPDATE',
  localPayload: { title: 'Versión local' },
  serverData: { title: 'Versión servidor' },
}

const conflict2: ConflictItem = {
  entityId: 'task-id-2',
  entityType: 'task',
  operation: 'MOVE',
  localPayload: { columnId: 'col-local' },
  serverData: { columnId: 'col-server' },
}

function renderModal(conflicts: ConflictItem[] = [conflict1]) {
  return render(<ConflictModal conflicts={conflicts} onClose={mockOnClose} />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockResolveConflict.mockResolvedValue(undefined)
})

// Renderizado

describe('ConflictModal — renderizado', () => {
  it('muestra el título "Conflicto de sincronización"', () => {
    renderModal()
    expect(screen.getByText('Conflicto de sincronización')).toBeInTheDocument()
  })

  it('muestra el número de conflictos en singular', () => {
    renderModal([conflict1])
    expect(screen.getByText(/1 conflicto detectado/)).toBeInTheDocument()
  })

  it('muestra el número de conflictos en plural', () => {
    renderModal([conflict1, conflict2])
    expect(screen.getByText(/2 conflictos detectados/)).toBeInTheDocument()
  })

  it('muestra el entityId truncado del conflicto actual', () => {
    renderModal()
    expect(screen.getByText(/task-id-/)).toBeInTheDocument()
  })

  it('muestra los valores del payload local', () => {
    renderModal()
    expect(screen.getByText('Versión local')).toBeInTheDocument()
  })

  it('muestra los valores del servidor', () => {
    renderModal()
    expect(screen.getByText('Versión servidor')).toBeInTheDocument()
  })

  it('muestra los botones "Usar servidor" y "Mantener local"', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Usar servidor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mantener local' })).toBeInTheDocument()
  })

  it('muestra el contador "0/1 resueltos"', () => {
    renderModal()
    expect(screen.getByText('0/1 resueltos')).toBeInTheDocument()
  })

  it('muestra barra de progreso si hay más de un conflicto', () => {
    renderModal([conflict1, conflict2])
    // La barra son divs con h-1 flex-1 rounded-full
    const bars = document.querySelectorAll('.h-1.flex-1.rounded-full')
    expect(bars).toHaveLength(2)
  })

  it('no muestra barra de progreso con un solo conflicto', () => {
    renderModal([conflict1])
    const bars = document.querySelectorAll('.h-1.flex-1.rounded-full')
    expect(bars).toHaveLength(0)
  })
})

// Resolución — opción "usar servidor"

describe('ConflictModal — resolver con servidor', () => {
  it('llama a resolveConflict con "use-server"', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Usar servidor' }))
    expect(mockResolveConflict).toHaveBeenCalledWith(conflict1, 'use-server')
  })

  it('actualiza el contador tras resolver', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Usar servidor' }))
    expect(screen.getByText('1/1 resueltos')).toBeInTheDocument()
  })
})

// Resolución — opción "mantener local"

describe('ConflictModal — mantener local', () => {
  it('llama a resolveConflict con "keep-local"', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Mantener local' }))
    expect(mockResolveConflict).toHaveBeenCalledWith(conflict1, 'keep-local')
  })
})

// Navegación entre conflictos

describe('ConflictModal — múltiples conflictos', () => {
  it('avanza al siguiente conflicto tras resolver el primero', async () => {
    renderModal([conflict1, conflict2])
    await userEvent.click(screen.getByRole('button', { name: 'Usar servidor' }))
    // El entityId se trunca a 8 chars: 'task-id-2'.slice(0,8) = 'task-id-'
    // Verificamos el payload del segundo conflicto que sí aparece completo
    await waitFor(() => {
      expect(screen.getByText('col-local')).toBeInTheDocument()
    })
  })

  it('muestra "1/2 resueltos" tras resolver el primero', async () => {
    renderModal([conflict1, conflict2])
    await userEvent.click(screen.getByRole('button', { name: 'Usar servidor' }))
    expect(screen.getByText('1/2 resueltos')).toBeInTheDocument()
  })
})

// Botón "Resolver restantes" / "Cerrar"

describe('ConflictModal — botón de finalizar', () => {
  it('muestra "Resolver restantes con servidor" cuando no están todos resueltos', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Resolver restantes con servidor' })).toBeInTheDocument()
  })

  it('muestra "Cerrar" cuando todos están resueltos', async () => {
    renderModal([conflict1])
    await userEvent.click(screen.getByRole('button', { name: 'Usar servidor' }))
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })

  it('llama a onClose al hacer click en el botón de finalizar', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Resolver restantes con servidor' }))
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
  })

  it('resuelve los conflictos sin resolver como "use-server" al finalizar', async () => {
    renderModal([conflict1, conflict2])
    // Sin resolver ninguno, hacemos click en "Resolver restantes"
    await userEvent.click(screen.getByRole('button', { name: 'Resolver restantes con servidor' }))
    await waitFor(() => {
      expect(mockResolveConflict).toHaveBeenCalledWith(conflict1, 'use-server')
      expect(mockResolveConflict).toHaveBeenCalledWith(conflict2, 'use-server')
    })
  })

  it('no vuelve a resolver los conflictos ya resueltos al hacer "Resolver restantes"', async () => {
    renderModal([conflict1, conflict2])
    // Resolver el primero manualmente
    await userEvent.click(screen.getByRole('button', { name: 'Mantener local' }))
    jest.clearAllMocks()
    mockResolveConflict.mockResolvedValue(undefined)

    // Finalizar
    await userEvent.click(screen.getByRole('button', { name: 'Resolver restantes con servidor' }))
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())

    // Solo el segundo debe haberse resuelto en este paso
    expect(mockResolveConflict).not.toHaveBeenCalledWith(conflict1, expect.anything())
    expect(mockResolveConflict).toHaveBeenCalledWith(conflict2, 'use-server')
  })

  it('muestra "Aplicando…" mientras finaliza', async () => {
    mockResolveConflict.mockReturnValueOnce(new Promise(() => {}))
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Resolver restantes con servidor' }))
    expect(await screen.findByText('Aplicando…')).toBeInTheDocument()
  })
})

// Cierre

describe('ConflictModal — cierre', () => {
  it('llama a onClose al hacer click en el botón X', async () => {
    renderModal()
    const xButtons = screen.getAllByRole('button').filter(
      (b) => b.querySelector('svg') && !b.textContent?.trim()
    )
    await userEvent.click(xButtons[0])
    expect(mockOnClose).toHaveBeenCalled()
  })
})
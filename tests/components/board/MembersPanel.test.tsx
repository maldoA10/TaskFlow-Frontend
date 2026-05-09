/**
 * @file src/tests/components/board/MembersPanel.test.tsx
 * Tests para el componente MembersPanel.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MembersPanel } from '@/components/board/MembersPanel'
import type { BoardMember } from '@/types'

// Mock de invitationsApi
const mockInvite = jest.fn()
jest.mock('@/lib/api', () => ({
  invitationsApi: {
    invite: (...args: unknown[]) => mockInvite(...args),
  },
}))

const mockOnClose = jest.fn()

const mockMembers: (BoardMember & {
  user?: { id: string; name: string; email: string; avatarUrl?: string }
})[] = [
  {
    id: 'm1', boardId: 'b1', userId: 'u1', role: 'OWNER', createdAt: '',
    user: { id: 'u1', name: 'Ana García', email: 'ana@test.com' },
  },
  {
    id: 'm2', boardId: 'b1', userId: 'u2', role: 'MEMBER', createdAt: '',
    user: { id: 'u2', name: 'Carlos López', email: 'carlos@test.com' },
  },
]

function renderPanel(members = mockMembers) {
  return render(<MembersPanel boardId="b1" members={members} onClose={mockOnClose} />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockInvite.mockResolvedValue(undefined)
})

// Renderizado

describe('MembersPanel — renderizado', () => {
  it('muestra el título "Miembros del tablero"', () => {
    renderPanel()
    expect(screen.getByText('Miembros del tablero')).toBeInTheDocument()
  })

  it('muestra todos los miembros', () => {
    renderPanel()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('Carlos López')).toBeInTheDocument()
  })

  it('muestra el email de cada miembro', () => {
    renderPanel()
    expect(screen.getByText('ana@test.com')).toBeInTheDocument()
    expect(screen.getByText('carlos@test.com')).toBeInTheDocument()
  })

  it('muestra la insignia "Owner" para el propietario', () => {
    renderPanel()
    expect(screen.getByText('Owner')).toBeInTheDocument()
  })

  it('no muestra la insignia "Owner" para miembros normales', () => {
    // Solo un owner, Carlos es MEMBER
    const owners = screen.queryAllByText('Owner')
    // No comprobamos aquí porque el render no ha ocurrido todavía
    renderPanel()
    expect(screen.getAllByText('Owner')).toHaveLength(1)
  })

  it('muestra el input de email para invitar', () => {
    renderPanel()
    expect(screen.getByPlaceholderText('email@ejemplo.com')).toBeInTheDocument()
  })

  it('el botón Invitar está deshabilitado si el email está vacío', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Invitar' })).toBeDisabled()
  })

  it('muestra las iniciales del miembro como avatar', () => {
    renderPanel()
    expect(screen.getByText('AG')).toBeInTheDocument() // Ana García
    expect(screen.getByText('CL')).toBeInTheDocument() // Carlos López
  })
})

// Invitación exitosa

describe('MembersPanel — invitar', () => {
  it('habilita el botón Invitar cuando hay email', async () => {
    renderPanel()
    await userEvent.type(screen.getByPlaceholderText('email@ejemplo.com'), 'nuevo@test.com')
    expect(screen.getByRole('button', { name: 'Invitar' })).not.toBeDisabled()
  })

  it('llama a invitationsApi.invite con el boardId y email correctos', async () => {
    renderPanel()
    await userEvent.type(screen.getByPlaceholderText('email@ejemplo.com'), 'nuevo@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => {
      expect(mockInvite).toHaveBeenCalledWith('b1', 'nuevo@test.com')
    })
  })

  it('muestra mensaje de éxito tras invitar', async () => {
    renderPanel()
    await userEvent.type(screen.getByPlaceholderText('email@ejemplo.com'), 'nuevo@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => {
      expect(screen.getByText(/Invitación enviada a nuevo@test.com/)).toBeInTheDocument()
    })
  })

  it('limpia el input tras una invitación exitosa', async () => {
    renderPanel()
    const input = screen.getByPlaceholderText('email@ejemplo.com') as HTMLInputElement
    await userEvent.type(input, 'nuevo@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('muestra "…" mientras la invitación está en curso', async () => {
    mockInvite.mockReturnValueOnce(new Promise(() => {}))
    renderPanel()
    await userEvent.type(screen.getByPlaceholderText('email@ejemplo.com'), 'nuevo@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    expect(await screen.findByRole('button', { name: '…' })).toBeInTheDocument()
  })
})

// Invitación fallida

describe('MembersPanel — error al invitar', () => {
  it('muestra mensaje de error si la API falla', async () => {
    mockInvite.mockRejectedValueOnce(new Error('Email ya registrado'))
    renderPanel()
    await userEvent.type(screen.getByPlaceholderText('email@ejemplo.com'), 'existente@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => {
      expect(screen.getByText('Email ya registrado')).toBeInTheDocument()
    })
  })

  it('muestra mensaje genérico si el error no tiene mensaje', async () => {
    mockInvite.mockRejectedValueOnce('error sin mensaje')
    renderPanel()
    await userEvent.type(screen.getByPlaceholderText('email@ejemplo.com'), 'test@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => {
      expect(screen.getByText('Error al enviar invitación')).toBeInTheDocument()
    })
  })
})

// Cierre

describe('MembersPanel — cierre', () => {
  it('llama a onClose al hacer click en el botón X', async () => {
    renderPanel()
    const xButtons = screen.getAllByRole('button').filter(
      (b) => b.querySelector('svg') && !b.textContent?.trim()
    )
    await userEvent.click(xButtons[0])
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('llama a onClose al hacer click en el backdrop', async () => {
    renderPanel()
    const backdrop = document.querySelector('.bg-black\\/40') as HTMLElement
    await userEvent.click(backdrop)
    expect(mockOnClose).toHaveBeenCalled()
  })
})
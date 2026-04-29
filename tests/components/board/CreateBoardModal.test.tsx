/**
 * @file src/tests/components/board/CreateBoardModal.test.tsx
 * Tests para el componente CreateBoardModal.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateBoardModal } from '@/components/board/CreateBoardModal'

const mockOnClose = jest.fn()
const mockOnSubmit = jest.fn()

function renderModal(overrides?: Partial<React.ComponentProps<typeof CreateBoardModal>>) {
  return render(
    <CreateBoardModal
      onClose={mockOnClose}
      onSubmit={mockOnSubmit}
      {...overrides}
    />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

// Renderizado

describe('CreateBoardModal — renderizado', () => {
  it('muestra el título "Nuevo Tablero"', () => {
    renderModal()
    expect(screen.getByText('Nuevo Tablero')).toBeInTheDocument()
  })

  it('muestra el input de nombre vacío', () => {
    renderModal()
    const input = screen.getByPlaceholderText('Ej. Proyecto Alpha')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('muestra la previsualización con texto por defecto "Mi Tablero"', () => {
    renderModal()
    expect(screen.getByText('Mi Tablero')).toBeInTheDocument()
  })

  it('muestra los botones Cancelar y Crear Tablero', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear Tablero' })).toBeInTheDocument()
  })

  it('el botón Crear Tablero está deshabilitado si el nombre está vacío', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Crear Tablero' })).toBeDisabled()
  })
})

// Interacciones de nombre

describe('CreateBoardModal — campo nombre', () => {
  it('actualiza la previsualización al escribir el nombre', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Mi Proyecto')
    expect(screen.getByText('Mi Proyecto')).toBeInTheDocument()
  })

  it('habilita el botón Crear Tablero cuando hay nombre', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Test')
    expect(screen.getByRole('button', { name: 'Crear Tablero' })).not.toBeDisabled()
  })

  it('muestra error si se intenta enviar sin nombre', async () => {
    renderModal()
    fireEvent.submit(screen.getByRole('button', { name: 'Crear Tablero' }).closest('form')!)
    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument()
  })
})

// Selector de color

describe('CreateBoardModal — selector de color', () => {
  it('renderiza los 8 botones de color', () => {
    renderModal()
    // Los botones de color tienen title igual al valor hexadecimal
    const colorButtons = screen.getAllByTitle(/^#/)
    expect(colorButtons).toHaveLength(8)
  })

  it('selecciona un color al hacer click en él', async () => {
    renderModal()
    const colorButtons = screen.getAllByTitle(/^#/)
    await userEvent.click(colorButtons[2])
    // El botón clickeado debería ganar la clase ring-2
    expect(colorButtons[2].className).toContain('ring-2')
  })
})

// Submit exitoso

describe('CreateBoardModal — submit', () => {
  it('llama a onSubmit con los datos correctos', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined)
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Nuevo Tablero')
    await userEvent.type(
      screen.getByPlaceholderText('¿De qué trata este proyecto?'),
      'Una descripción'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tablero' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Nuevo Tablero',
          description: 'Una descripción',
          color: expect.stringMatching(/^#/),
        })
      )
    })
  })

  it('llama a onClose tras un submit exitoso', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined)
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Test')
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tablero' }))

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('no envía descripción si está vacía', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined)
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Test')
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tablero' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined })
      )
    })
  })

  it('muestra "Creando…" mientras el submit está en curso', async () => {
    mockOnSubmit.mockReturnValueOnce(new Promise(() => { })) // never resolves
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Test')
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tablero' }))

    expect(await screen.findByText('Creando…')).toBeInTheDocument()
  })

  it('muestra error si onSubmit falla', async () => {
    mockOnSubmit.mockRejectedValueOnce(new Error('fail'))
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Test')
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tablero' }))

    expect(await screen.findByText('No se pudo crear el tablero')).toBeInTheDocument()
  })

  it('no llama a onClose si onSubmit falla', async () => {
    mockOnSubmit.mockRejectedValueOnce(new Error('fail'))
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('Ej. Proyecto Alpha'), 'Test')
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tablero' }))

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled())
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})

// Cierre

describe('CreateBoardModal — cierre', () => {
  it('llama a onClose al hacer click en Cancelar', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('llama a onClose al hacer click en el botón X', async () => {
    renderModal()
    // El botón X no tiene texto accesible visible, buscamos por su posición en el header
    const closeButtons = screen.getAllByRole('button')
    const xButton = closeButtons.find((b) => b.querySelector('svg'))!
    await userEvent.click(xButton)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('llama a onClose al hacer click en el backdrop', async () => {
    renderModal()
    // El backdrop es el div con bg-black/60
    const backdrop = document.querySelector('.bg-black\\/60') as HTMLElement
    await userEvent.click(backdrop)
    expect(mockOnClose).toHaveBeenCalled()
  })
})
/**
 * @file src/tests/components/search/SearchBar.test.tsx
 * Versión final corregida.
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '@/components/search/SearchBar'
import type { SearchResult } from '@/lib/search'

// 1. Mocks de dependencias
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockSearchTasks = jest.fn()
jest.mock('@/lib/search', () => ({
  searchTasks: (...args: unknown[]) => mockSearchTasks(...args),
}))

// 2. Fixture (Helper para crear datos de prueba)
function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    task: {
      id: 't1', title: 'Implementar login', boardId: 'b1', columnId: 'col1',
      position: 0, priority: 'HIGH', description: '', tags: ['auth'],
      dueDate: null, assigneeId: null, createdAt: '', updatedAt: '', version: 1,
    },
    board: { id: 'b1', name: 'Tablero Principal', description: '', color: '#6366F1', ownerId: 'u1', createdAt: '', updatedAt: '' },
    column: { id: 'col1', boardId: 'b1', name: 'Por Hacer', position: 0, createdAt: '' },
    ...overrides,
  }
}

// 3. Configuración de Timers y UserEvent
let user: ReturnType<typeof userEvent.setup>

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  // Configuramos userEvent para trabajar sincronizado con los timers de Jest
  user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  mockSearchTasks.mockResolvedValue([])
})

afterEach(() => {
  jest.useRealTimers()
})

// --- TESTS ---

describe('SearchBar — renderizado', () => {
  it('muestra el input con placeholder correcto', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText('Buscar tareas…')).toBeInTheDocument()
  })

  it('no muestra el dropdown inicialmente', () => {
    render(<SearchBar />)
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument()
  })
})

describe('SearchBar — búsqueda', () => {
  it('llama a searchTasks al escribir', async () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Buscar tareas…')
    
    await user.type(input, 'login')
    
    // Avanzamos el reloj para activar el debounce del componente
    act(() => { jest.advanceTimersByTime(200) })

    await waitFor(() => {
      expect(mockSearchTasks).toHaveBeenCalledWith('login')
    })
  })

  it('muestra los resultados en el dropdown', async () => {
    mockSearchTasks.mockResolvedValueOnce([makeResult()])
    render(<SearchBar />)
    
    await user.type(screen.getByPlaceholderText('Buscar tareas…'), 'login')
    act(() => { jest.advanceTimersByTime(200) })

    // Usamos findBy para esperar a que el DOM se actualice
    expect(await screen.findByText(/Implementar login/i)).toBeInTheDocument()
  })

  it('muestra el nombre del board y la columna en cada resultado', async () => {
    mockSearchTasks.mockResolvedValueOnce([makeResult()])
    render(<SearchBar />)
    
    await user.type(screen.getByPlaceholderText('Buscar tareas…'), 'login')
    act(() => { jest.advanceTimersByTime(200) })

    // Usamos Regex (/.../i) para que ignore espacios en blanco extras o saltos de línea
    await waitFor(() => {
      expect(screen.getByText(/Tablero Principal/i)).toBeInTheDocument()
      expect(screen.getByText(/Por Hacer/i)).toBeInTheDocument()
    })
  })

  it('muestra el conteo de resultados', async () => {
    mockSearchTasks.mockResolvedValueOnce([
      makeResult({ task: { ...makeResult().task, id: 't1' } }),
      makeResult({ task: { ...makeResult().task, id: 't2', title: 'Otra tarea' } })
    ])
    
    render(<SearchBar />)
    await user.type(screen.getByPlaceholderText('Buscar tareas…'), 'tarea')
    act(() => { jest.advanceTimersByTime(200) })

    await waitFor(() => {
      expect(screen.getByText(/2 resultados/i)).toBeInTheDocument()
    })
  })
})

describe('SearchBar — navegación por teclado', () => {
  it('navega al board del resultado al presionar Enter con elemento seleccionado', async () => {
    mockSearchTasks.mockResolvedValueOnce([makeResult()])
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Buscar tareas…')
    await user.type(input, 'login')
    act(() => { jest.advanceTimersByTime(200) })

    // Aseguramos que los resultados ya están visibles antes de usar el teclado
    await screen.findByText(/Implementar login/i)

    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    // El push puede ser asíncrono tras el evento de teclado
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/board/b1')
    })
  })

  it('cierra el dropdown al presionar Escape', async () => {
    mockSearchTasks.mockResolvedValueOnce([makeResult()])
    render(<SearchBar />)
    
    await user.type(screen.getByPlaceholderText('Buscar tareas…'), 'login')
    act(() => { jest.advanceTimersByTime(200) })

    const result = await screen.findByText(/Implementar login/i)
    expect(result).toBeInTheDocument()

    await user.keyboard('{Escape}')
    
    await waitFor(() => {
      expect(screen.queryByText(/Implementar login/i)).not.toBeInTheDocument()
    })
  })
})

describe('SearchBar — limpiar búsqueda', () => {
  it('limpia el input y cierra el dropdown al hacer click en X', async () => {
    mockSearchTasks.mockResolvedValueOnce([makeResult()])
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Buscar tareas…') as HTMLInputElement
    await user.type(input, 'login')
    act(() => { jest.advanceTimersByTime(200) })

    // Buscamos el botón que aparece cuando hay texto (X)
    const clearButton = screen.getByRole('button', { name: '' }) 
    await user.click(clearButton)

    expect(input.value).toBe('')
    expect(screen.queryByText(/Implementar login/i)).not.toBeInTheDocument()
  })
})

describe('SearchBar — click fuera', () => {
  it('cierra el dropdown al hacer click fuera del componente', async () => {
    mockSearchTasks.mockResolvedValueOnce([makeResult()])
    render(
      <div>
        <div data-testid="outside">Área Externa</div>
        <SearchBar />
      </div>
    )
    
    await user.type(screen.getByPlaceholderText('Buscar tareas…'), 'login')
    act(() => { jest.advanceTimersByTime(200) })

    expect(await screen.findByText(/Implementar login/i)).toBeInTheDocument()

    await user.click(screen.getByTestId('outside'))

    await waitFor(() => {
      expect(screen.queryByText(/Implementar login/i)).not.toBeInTheDocument()
    })
  })
})
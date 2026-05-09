/**
 * @file src/tests/components/layout/SyncIndicator.test.tsx
 * Tests para el componente SyncIndicator.
 * Se mockea onSyncStateChange para disparar estados de sync manualmente.
 */

import { render, screen, act } from '@testing-library/react'
import { SyncIndicator } from '@/components/layout/SyncIndicator'
import type { SyncState } from '@/lib/sync'

// Mock de onSyncStateChange
type SyncListener = (state: SyncState, applied?: number) => void
let capturedListener: SyncListener | null = null
const mockUnsubscribe = jest.fn()

jest.mock('@/lib/sync', () => ({
  onSyncStateChange: (fn: SyncListener) => {
    capturedListener = fn
    return mockUnsubscribe
  },
}))

function fireSync(state: SyncState, applied?: number) {
  act(() => { capturedListener?.(state, applied) })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  capturedListener = null
})

afterEach(() => {
  jest.useRealTimers()
})

describe('SyncIndicator — estado inicial', () => {
  it('no renderiza nada cuando el estado es "idle" sin cambios previos', () => {
    const { container } = render(<SyncIndicator />)
    expect(container.firstChild).toBeNull()
  })
})

describe('SyncIndicator — estado "syncing"', () => {
  it('muestra "Sincronizando" cuando el estado es syncing', () => {
    render(<SyncIndicator />)
    fireSync('syncing')
    expect(screen.getByText('Sincronizando')).toBeInTheDocument()
  })

  it('muestra el icono de carga (RefreshCw)', () => {
    render(<SyncIndicator />)
    fireSync('syncing')
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})

describe('SyncIndicator — estado "idle" con cambios', () => {
  it('muestra el número de cambios sincronizados', () => {
    render(<SyncIndicator />)
    fireSync('idle', 3)
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' && (el?.textContent ?? '').replace(/\s+/g, ' ').trim() === '3 cambios sincronizados'
    )).toBeInTheDocument()
  })

  it('usa singular cuando se aplica 1 cambio', () => {
    render(<SyncIndicator />)
    fireSync('idle', 1)
    // El texto está partido en nodos React; buscamos por textContent del span
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' && (el?.textContent ?? '').replace(/\s+/g, ' ').trim() === '1 cambio sincronizado'
    )).toBeInTheDocument()
  })

  it('no muestra el badge si idle llega con 0 cambios', () => {
    const { container } = render(<SyncIndicator />)
    fireSync('idle', 0)
    expect(container.firstChild).toBeNull()
  })

  it('no muestra el badge si idle llega sin count', () => {
    const { container } = render(<SyncIndicator />)
    fireSync('idle')
    expect(container.firstChild).toBeNull()
  })

  it('oculta el badge después de 3 segundos', () => {
    render(<SyncIndicator />)
    fireSync('idle', 2)
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' && (el?.textContent ?? '').replace(/\s+/g, ' ').trim() === '2 cambios sincronizados'
    )).toBeInTheDocument()

    act(() => { jest.advanceTimersByTime(3000) })
    expect(screen.queryByText((_, el) =>
      el?.tagName === 'SPAN' && (el?.textContent ?? '').replace(/\s+/g, ' ').trim() === '2 cambios sincronizados'
    )).not.toBeInTheDocument()
  })

  it('no oculta el badge antes de 3 segundos', () => {
    render(<SyncIndicator />)
    fireSync('idle', 2)

    act(() => { jest.advanceTimersByTime(2999) })
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' && (el?.textContent ?? '').replace(/\s+/g, ' ').trim() === '2 cambios sincronizados'
    )).toBeInTheDocument()
  })
})

describe('SyncIndicator — estado "error"', () => {
  it('muestra "Error de sync" cuando el estado es error', () => {
    render(<SyncIndicator />)
    fireSync('error')
    expect(screen.getByText('Error de sync')).toBeInTheDocument()
  })

  it('no oculta automáticamente el badge de error', () => {
    render(<SyncIndicator />)
    fireSync('error')

    act(() => { jest.advanceTimersByTime(10000) })
    expect(screen.getByText('Error de sync')).toBeInTheDocument()
  })
})

describe('SyncIndicator — transiciones de estado', () => {
  it('pasa de syncing a idle mostrando el badge de éxito', () => {
    render(<SyncIndicator />)
    fireSync('syncing')
    fireSync('idle', 5)
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' && (el?.textContent ?? '').replace(/\s+/g, ' ').trim() === '5 cambios sincronizados'
    )).toBeInTheDocument()
  })

  it('desuscribe el listener al desmontar', () => {
    const { unmount } = render(<SyncIndicator />)
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
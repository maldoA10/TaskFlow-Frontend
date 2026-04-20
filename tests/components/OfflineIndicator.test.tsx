/**
 * @file src/tests/components/OfflineIndicator.test.tsx
 * Tests para los componentes OfflineIndicator y OnlineStatusDot.
 * Se mockea useOnlineStatus para controlar el estado de red en tests.
 */

import { render, screen } from '@testing-library/react'
import { OfflineIndicator, OnlineStatusDot } from '@/components/layout/OfflineIndicator'

// Mock del hook
const mockUseOnlineStatus = jest.fn()

jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}))

// OfflineIndicator

describe('OfflineIndicator', () => {
  it('no renderiza nada cuando está online y nunca estuvo offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: false })
    const { container } = render(<OfflineIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra "Sin conexión" cuando está offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false, wasOffline: false })
    render(<OfflineIndicator />)
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
  })

  it('muestra "Sincronizando..." cuando acaba de reconectarse (wasOffline=true)', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: true })
    render(<OfflineIndicator />)
    expect(screen.getByText('Sincronizando...')).toBeInTheDocument()
  })

  it('no muestra "Sin conexión" mientras sincroniza', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: true })
    render(<OfflineIndicator />)
    expect(screen.queryByText('Sin conexión')).not.toBeInTheDocument()
  })
})

// OnlineStatusDot

describe('OnlineStatusDot', () => {
  it('muestra "En línea" cuando está online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: false })
    render(<OnlineStatusDot />)
    expect(screen.getByText('En línea')).toBeInTheDocument()
  })

  it('muestra "Sin conexión" cuando está offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false, wasOffline: false })
    render(<OnlineStatusDot />)
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
  })

  it('siempre renderiza el dot de estado', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: false })
    const { container } = render(<OnlineStatusDot />)
    // El componente siempre renderiza (no tiene early return)
    expect(container.firstChild).not.toBeNull()
  })
})
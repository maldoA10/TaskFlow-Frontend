/**
 * @file src/tests/hooks/useOnlineStatus.test.ts
 * Tests para el hook useOnlineStatus usando React Testing Library.
 */

import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

// Helper para disparar eventos de red
function goOffline() {
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
}

function goOnline() {
  act(() => {
    window.dispatchEvent(new Event('online'))
  })
}

describe('useOnlineStatus', () => {
  beforeEach(() => {
    // jsdom por defecto: navigator.onLine = true
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('inicia con isOnline=true cuando el navegador está en línea', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(true)
  })

  it('isOnline pasa a false al disparar el evento "offline"', () => {
    const { result } = renderHook(() => useOnlineStatus())
    goOffline()
    expect(result.current.isOnline).toBe(false)
  })

  it('isOnline regresa a true al disparar el evento "online"', () => {
    const { result } = renderHook(() => useOnlineStatus())
    goOffline()
    goOnline()
    expect(result.current.isOnline).toBe(true)
  })

  it('wasOffline se vuelve true al reconectarse', () => {
    const { result } = renderHook(() => useOnlineStatus())
    goOffline()
    goOnline()
    expect(result.current.wasOffline).toBe(true)
  })

  it('wasOffline vuelve a false después de 5 segundos', () => {
    const { result } = renderHook(() => useOnlineStatus())
    goOffline()
    goOnline()
    expect(result.current.wasOffline).toBe(true)

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.wasOffline).toBe(false)
  })

  it('wasOffline arranca en false', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.wasOffline).toBe(false)
  })

  it('limpia los event listeners al desmontar', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useOnlineStatus())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    removeSpy.mockRestore()
  })
})
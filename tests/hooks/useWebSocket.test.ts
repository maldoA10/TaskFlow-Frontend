/**
 * @file src/tests/hooks/useWebSocket.test.ts
 * Tests para el hook useWebSocket.
 * Se mockean WebSocket, getMeta y WS_URL para aislar la lógica de conexión.
 */

import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '@/hooks/useWebSocket'

// Mock de getMeta
const mockGetMeta = jest.fn()
jest.mock('@/lib/db', () => ({
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
}))

// Mock de constantes
jest.mock('@/lib/constants', () => ({
  WS_URL: 'ws://localhost:4000',
}))

// ── Mock de WebSocket ──────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: ((e: { code: number; reason?: string }) => void) | null = null
  onerror: (() => void) | null = null
  sentMessages: string[] = []
  readyState = WebSocket.CONNECTING

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close(code = 1000, reason = '') {
    this.readyState = WebSocket.CLOSED
    this.onclose?.({ code, reason })
  }

  // Helpers para simular eventos desde tests
  triggerOpen() {
    this.readyState = WebSocket.OPEN
    this.onopen?.()
  }

  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  triggerClose(code: number) {
    this.readyState = WebSocket.CLOSED
    this.onclose?.({ code })
  }

  triggerError() {
    this.onerror?.()
  }
}

// Guardar y restaurar el WebSocket global
const OriginalWebSocket = global.WebSocket

beforeEach(() => {
  MockWebSocket.instances = []
  // @ts-expect-error — reemplazamos WebSocket global por el mock
  global.WebSocket = MockWebSocket
  mockGetMeta.mockResolvedValue('test-token')
  jest.useFakeTimers()
})

afterEach(() => {
  global.WebSocket = OriginalWebSocket
  jest.useRealTimers()
  jest.clearAllMocks()
})

function getLastWs() {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]
}

describe('useWebSocket — conexión inicial', () => {
  it('no conecta si boardId es null', async () => {
    renderHook(() => useWebSocket(null, jest.fn()))
    await act(async () => {})
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('no conecta si no hay token en getMeta', async () => {
    mockGetMeta.mockResolvedValueOnce(null)
    renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('crea un WebSocket con la URL correcta incluyendo el token', async () => {
    renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(getLastWs().url).toBe('ws://localhost:4000?token=test-token')
  })

  it('envía JOIN_BOARD con el boardId al abrirse la conexión', async () => {
    renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())

    expect(ws.sentMessages).toHaveLength(1)
    expect(JSON.parse(ws.sentMessages[0])).toEqual({ type: 'JOIN_BOARD', boardId: 'b1' })
  })
})

describe('useWebSocket — recepción de mensajes', () => {
  it('llama al handler con el mensaje parseado', async () => {
    const handler = jest.fn()
    renderHook(() => useWebSocket('b1', handler))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())

    const msg = { type: 'TASK_CREATED', payload: { id: 't1' } }
    act(() => ws.triggerMessage(msg))

    expect(handler).toHaveBeenCalledWith(msg)
  })

  it('ignora mensajes con JSON malformado', async () => {
    const handler = jest.fn()
    renderHook(() => useWebSocket('b1', handler))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())
    act(() => ws.onmessage?.({ data: 'not-json' }))

    expect(handler).not.toHaveBeenCalled()
  })

  it('usa siempre la referencia más reciente del handler (sin recrear WS)', async () => {
    const handler1 = jest.fn()
    const handler2 = jest.fn()

    const { rerender } = renderHook(
      ({ h }) => useWebSocket('b1', h),
      { initialProps: { h: handler1 } }
    )
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())

    // Cambiar el handler sin cambiar boardId
    rerender({ h: handler2 })

    const msg = { type: 'TASK_UPDATED', payload: { id: 't1' } }
    act(() => ws.triggerMessage(msg))

    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).toHaveBeenCalledWith(msg)
    // No debe haber creado un segundo WebSocket
    expect(MockWebSocket.instances).toHaveLength(1)
  })
})

describe('useWebSocket — reconexión', () => {
  it('reintenta la conexión tras un cierre inesperado', async () => {
    renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())

    // Cierre inesperado (código distinto de 1000/4001)
    act(() => ws.triggerClose(1006))

    // Avanzar el primer delay de reconexión (1000ms)
    await act(async () => { jest.advanceTimersByTime(1000) })
    await act(async () => {})

    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('NO reintenta tras un cierre intencional (código 1000)', async () => {
    renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())
    act(() => ws.triggerClose(1000))

    await act(async () => { jest.advanceTimersByTime(5000) })

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('NO reintenta tras fallo de autenticación (código 4001)', async () => {
    renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())
    act(() => ws.triggerClose(4001))

    await act(async () => { jest.advanceTimersByTime(5000) })

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('cierra la conexión al desmontar y no reintenta', async () => {
    const { unmount } = renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())

    unmount()

    await act(async () => { jest.advanceTimersByTime(10000) })

    // Solo el WS original, sin reconexiones
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  it('cierra el WS anterior y abre uno nuevo si cambia el boardId', async () => {
    const { rerender } = renderHook(
      ({ id }) => useWebSocket(id, jest.fn()),
      { initialProps: { id: 'b1' } }
    )
    await act(async () => {})
    expect(MockWebSocket.instances).toHaveLength(1)

    rerender({ id: 'b2' })
    await act(async () => {})

    expect(MockWebSocket.instances).toHaveLength(2)
    expect(getLastWs().url).toContain('token=test-token')
  })
})

describe('useWebSocket — errores', () => {
  it('cierra el WS al recibir un error', async () => {
    renderHook(() => useWebSocket('b1', jest.fn()))
    await act(async () => {})

    const ws = getLastWs()
    act(() => ws.triggerOpen())

    const closeSpy = jest.spyOn(ws, 'close')
    act(() => ws.triggerError())

    expect(closeSpy).toHaveBeenCalled()
  })
})
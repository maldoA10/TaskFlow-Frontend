/**
 * @file src/tests/hooks/useDebounce.test.ts
 * Tests para el hook useDebounce.
 */

import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('useDebounce', () => {
  it('devuelve el valor inicial inmediatamente', () => {
    const { result } = renderHook(() => useDebounce('inicial', 300))
    expect(result.current).toBe('inicial')
  })

  it('no actualiza el valor antes de que pase el delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'inicial' } }
    )

    rerender({ value: 'nuevo' })
    act(() => { jest.advanceTimersByTime(299) })

    expect(result.current).toBe('inicial')
  })

  it('actualiza el valor después de que pase el delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'inicial' } }
    )

    rerender({ value: 'nuevo' })
    act(() => { jest.advanceTimersByTime(300) })

    expect(result.current).toBe('nuevo')
  })

  it('reinicia el timer si el valor cambia antes de que pase el delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })
    act(() => { jest.advanceTimersByTime(200) })

    rerender({ value: 'c' })
    act(() => { jest.advanceTimersByTime(200) })

    // Solo han pasado 200ms desde el último cambio, no debe actualizarse
    expect(result.current).toBe('a')

    act(() => { jest.advanceTimersByTime(100) })
    expect(result.current).toBe('c')
  })

  it('solo emite el último valor tras múltiples cambios rápidos', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: '1' } }
    )

    rerender({ value: '2' })
    rerender({ value: '3' })
    rerender({ value: '4' })

    act(() => { jest.advanceTimersByTime(500) })

    expect(result.current).toBe('4')
  })

  it('respeta distintos valores de delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000),
      { initialProps: { value: 'lento' } }
    )

    rerender({ value: 'actualizado' })
    act(() => { jest.advanceTimersByTime(999) })
    expect(result.current).toBe('lento')

    act(() => { jest.advanceTimersByTime(1) })
    expect(result.current).toBe('actualizado')
  })

  it('funciona con tipos no-string (número)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    )

    rerender({ value: 42 })
    act(() => { jest.advanceTimersByTime(300) })

    expect(result.current).toBe(42)
  })

  it('funciona con tipos no-string (objeto)', () => {
    const obj1 = { x: 1 }
    const obj2 = { x: 2 }

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: obj1 } }
    )

    rerender({ value: obj2 })
    act(() => { jest.advanceTimersByTime(200) })

    expect(result.current).toEqual({ x: 2 })
  })

  it('limpia el timer al desmontar el hook', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'inicial' } }
    )

    rerender({ value: 'nuevo' })
    unmount()

    // Avanzar el tiempo: el efecto de cleanup debe haber cancelado el timer
    act(() => { jest.advanceTimersByTime(300) })

    // El valor no debería haberse actualizado tras el desmontaje
    expect(result.current).toBe('inicial')
  })
})
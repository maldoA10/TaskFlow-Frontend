'use client'

import { useEffect, useRef, useCallback } from 'react'
import { WS_URL } from '@/lib/constants'
import { getMeta } from '@/lib/db'
import type { Task, Comment, BoardMember, User } from '@/types'

export type WsMessage =
  | { type: 'TASK_CREATED'; payload: Task }
  | { type: 'TASK_UPDATED'; payload: Task }
  | { type: 'TASK_MOVED'; payload: Task }
  | { type: 'TASK_DELETED'; payload: { id: string; boardId: string } }
  | { type: 'COMMENT_ADDED'; payload: Comment & { author: User } }
  | { type: 'MEMBER_JOINED'; payload: { boardId: string; userId: string; name: string } }

type MessageHandler = (msg: WsMessage) => void

export function useWebSocket(boardId: string | null, onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(async () => {
    if (!boardId || typeof window === 'undefined') return

    const token = await getMeta<string>('accessToken')
    if (!token) return

    try {
      const ws = new WebSocket(`${WS_URL}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
        ws.send(JSON.stringify({ type: 'JOIN_BOARD', boardId }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as WsMessage
          onMessageRef.current(msg)
        } catch {
          // ignore malformed
        }
      }

      ws.onclose = (ev) => {
        // Don't retry on intentional close (code 1000) or auth failure (4001)
        if (ev.code === 1000 || ev.code === 4001) return
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30_000)
        retryRef.current++
        setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      // WebSocket constructor failed (e.g. invalid URL)
    }
  }, [boardId])

  useEffect(() => {
    connect()
    return () => {
      const ws = wsRef.current
      if (ws) {
        ws.onclose = null // prevent retry on intentional close
        ws.close(1000, 'component unmounted')
        wsRef.current = null
      }
    }
  }, [connect])
}

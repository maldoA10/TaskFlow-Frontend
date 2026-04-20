'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useBoardStore } from '@/stores/boardStore'
import { KanbanBoard } from '@/components/board/KanbanBoard'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeBoard, isLoadingBoard, error, fetchBoard } = useBoardStore()

  useEffect(() => {
    if (id) fetchBoard(id)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoadingBoard && !activeBoard) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-accent-indigo animate-spin" />
      </div>
    )
  }

  if (error && !activeBoard) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 h-full">
        <p className="text-text-secondary text-sm">{error}</p>
        <button
          onClick={() => router.push('/boards')}
          className="flex items-center gap-2 text-sm text-accent-indigo hover:text-accent-indigo/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a tableros
        </button>
      </div>
    )
  }

  if (!activeBoard) return null

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Board header */}
      <div className="flex items-center gap-3 px-6 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={() => router.push('/boards')}
          className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: activeBoard.color }}
        />
        <h1 className="text-base font-semibold text-text-primary">{activeBoard.name}</h1>
        {activeBoard.description && (
          <>
            <span className="text-border-subtle">·</span>
            <p className="text-sm text-text-secondary truncate max-w-xs">{activeBoard.description}</p>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {activeBoard.members.slice(0, 5).map((m) => (
            <div
              key={m.id}
              className="w-7 h-7 rounded-full bg-accent-indigo/20 border border-bg-secondary flex items-center justify-center text-xs font-semibold text-accent-indigo -ml-1 first:ml-0"
              title={m.user?.name}
            >
              {m.user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard board={activeBoard} />
      </div>
    </div>
  )
}

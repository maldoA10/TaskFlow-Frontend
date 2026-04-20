'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, LayoutGrid, Trash2 } from 'lucide-react'
import { useBoardStore } from '@/stores/boardStore'
import { CreateBoardModal } from '@/components/board/CreateBoardModal'
import type { Board } from '@/types'
import { clsx } from 'clsx'

function BoardCard({ board, onOpen, onDelete }: { board: Board; onOpen: () => void; onDelete: () => void }) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <div
      className="group relative bg-bg-secondary border border-border-subtle rounded-xl overflow-hidden cursor-pointer hover:border-accent-indigo/40 transition-all duration-150 hover:-translate-y-0.5"
      onClick={onOpen}
    >
      {/* Color strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: board.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: board.color + '22' }}
          >
            <LayoutGrid className="w-4 h-4" style={{ color: board.color }} />
          </div>

          {/* Delete button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
            className="w-7 h-7 rounded flex items-center justify-center text-text-secondary opacity-0 group-hover:opacity-100 hover:text-accent-rose hover:bg-accent-rose/10 transition-all"
            title="Eliminar tablero"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <h3 className="text-sm font-semibold text-text-primary mb-1 line-clamp-1">{board.name}</h3>
        {board.description && (
          <p className="text-xs text-text-secondary line-clamp-2">{board.description}</p>
        )}

        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
          <span className="text-xs text-text-secondary/60">
            {new Date(board.createdAt).toLocaleDateString('es', { month: 'short', year: 'numeric' })}
          </span>
          <div className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: board.color }} />
        </div>
      </div>

      {/* Delete confirm overlay */}
      {showDelete && (
        <div
          className="absolute inset-0 bg-bg-secondary/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-text-primary font-medium text-center">¿Eliminar &ldquo;{board.name}&rdquo;?</p>
          <p className="text-xs text-text-secondary text-center">Esta acción no se puede deshacer</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowDelete(false)}
              className="flex-1 py-1.5 rounded-lg text-xs border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onDelete}
              className="flex-1 py-1.5 rounded-lg text-xs bg-accent-rose text-white hover:bg-accent-rose/90 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BoardsPage() {
  const router = useRouter()
  const { boards, isLoadingBoards, fetchBoards, createBoard, deleteBoard } = useBoardStore()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Mis Tableros</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {boards.length === 0 ? 'Sin tableros aún' : `${boards.length} tablero${boards.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-indigo hover:bg-accent-indigo/90 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Tablero
        </button>
      </div>

      {/* Loading */}
      {isLoadingBoards && boards.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent-indigo animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoadingBoards && boards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/20 flex items-center justify-center">
            <LayoutGrid className="w-8 h-8 text-accent-indigo/60" />
          </div>
          <div className="text-center">
            <p className="text-text-primary font-medium mb-1">Crea tu primer tablero</p>
            <p className="text-sm text-text-secondary">Organiza tus proyectos y tareas de forma visual</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-indigo hover:bg-accent-indigo/90 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear tablero
          </button>
        </div>
      )}

      {/* Grid */}
      {boards.length > 0 && (
        <div className={clsx(
          'grid gap-4',
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        )}>
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onOpen={() => router.push(`/board/${board.id}`)}
              onDelete={() => deleteBoard(board.id)}
            />
          ))}

          {/* Add board card */}
          <button
            onClick={() => setShowCreate(true)}
            className="border-2 border-dashed border-border-subtle rounded-xl p-4 min-h-[140px] flex flex-col items-center justify-center gap-2 text-text-secondary hover:text-text-primary hover:border-accent-indigo/40 transition-all duration-150 hover:-translate-y-0.5"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm">Nuevo tablero</span>
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateBoardModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            const board = await createBoard(data)
            setShowCreate(false)
            router.push(`/board/${board.id}`)
          }}
        />
      )}
    </div>
  )
}

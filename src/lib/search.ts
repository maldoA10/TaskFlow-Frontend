import { getDB } from './db'
import type { Task, Board, Column } from '@/types'

export interface SearchResult {
  task: Task
  board: Board
  column: Column
}

/**
 * Search tasks stored in IndexedDB by title (substring) or tag (exact match).
 * Works fully offline. Returns up to 20 results ordered by relevance (title
 * matches first, then tag-only matches).
 */
export async function searchTasks(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const db = await getDB()
  const [tasks, boards, columns] = await Promise.all([
    db.getAll('tasks'),
    db.getAll('boards'),
    db.getAll('columns'),
  ])

  const ql = q.toLowerCase()
  const boardMap = new Map(boards.map((b) => [b.id, b]))
  const columnMap = new Map(columns.map((c) => [c.id, c]))

  const titleMatches: SearchResult[] = []
  const tagMatches: SearchResult[] = []

  for (const task of tasks) {
    const board = boardMap.get(task.boardId)
    const column = columnMap.get(task.columnId)
    if (!board || !column) continue

    const titleHit = task.title.toLowerCase().includes(ql)
    const tagHit = task.tags.some((t) => t.toLowerCase() === ql)

    if (titleHit) {
      titleMatches.push({ task, board, column })
    } else if (tagHit) {
      tagMatches.push({ task, board, column })
    }
  }

  return [...titleMatches, ...tagMatches].slice(0, 20)
}

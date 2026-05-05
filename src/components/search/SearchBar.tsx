'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import { searchTasks, type SearchResult } from '@/lib/search'
import { useDebounce } from '@/hooks/useDebounce'

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-border-subtle',
  MEDIUM: 'bg-accent-sky',
  HIGH: 'bg-accent-amber',
  URGENT: 'bg-accent-rose',
}

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 200)

  // Run search whenever debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    searchTasks(debouncedQuery)
      .then(setResults)
      .catch(() => setResults([]))
  }, [debouncedQuery])

  // Open dropdown when there are results
  useEffect(() => {
    setOpen(results.length > 0 && query.trim().length > 0)
    setActiveIndex(-1)
  }, [results, query])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }, [])

  function navigate(result: SearchResult) {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(`/board/${result.board.id}`)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      navigate(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className={clsx(
          'flex items-center gap-1.5 h-7 px-2.5 rounded-lg border transition-all duration-150',
          'bg-bg-elevated text-text-secondary',
          open || query
            ? 'border-accent-indigo/40 w-56'
            : 'border-border-subtle w-36 hover:w-44 hover:border-border-active/30'
        )}
      >
        <Search className="w-3 h-3 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar tareas…"
          className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-secondary/50 outline-none min-w-0"
        />
        {query && (
          <button
            onClick={clear}
            className="flex-shrink-0 hover:text-text-primary transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-80 bg-bg-secondary border border-border-subtle rounded-xl shadow-xl shadow-black/30 overflow-hidden z-50">
          <div className="py-1 max-h-80 overflow-y-auto">
            {results.map((result, i) => (
              <button
                key={result.task.id}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent blur
                  navigate(result)
                }}
                className={clsx(
                  'w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                  i === activeIndex ? 'bg-bg-elevated' : 'hover:bg-bg-elevated/60'
                )}
              >
                {/* Priority dot */}
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full',
                      PRIORITY_DOT[result.task.priority] ?? 'bg-border-subtle'
                    )}
                  />
                </div>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {result.task.title}
                  </p>
                  <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                    {result.board.name}
                    <span className="mx-1 opacity-40">·</span>
                    {result.column.name}
                  </p>
                  {result.task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.task.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono px-1 py-px rounded bg-accent-indigo/10 text-accent-indigo/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="px-3 py-1.5 border-t border-border-subtle/50">
            <p className="text-[10px] text-text-secondary/50">
              {results.length} resultado{results.length !== 1 ? 's' : ''} · busca en IndexedDB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

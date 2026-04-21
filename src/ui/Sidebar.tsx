import React, { useMemo, useState, useRef, useCallback } from 'react'
import { Pin, PinOff, ChevronRight } from 'lucide-react'
import { useEditorStore } from '../store/editor-store'

const HOVER_DEBOUNCE_MS = 30

export default function Sidebar() {
  const {
    doc,
    selectedSelector,
    pinnedSelectors,
    selectSelector,
    setHoveredSelector,
    togglePinnedSelector,
    getRenderedSource
  } = useEditorStore()

  const [localSearch, setLocalSearch] = useState('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const groups = useMemo(() => {
    if (!doc) return new Map<string, { count: number; modified: boolean }>()
    const modifications = doc.getModifications()
    const tokens = doc.getTokens()
    const map = new Map<string, { count: number; modified: boolean }>()

    for (const token of tokens) {
      const existing = map.get(token.selector) ?? { count: 0, modified: false }
      existing.count++
      if (modifications.has(token.id)) existing.modified = true
      map.set(token.selector, existing)
    }
    return map
  }, [doc, getRenderedSource()])

  const filter = localSearch.toLowerCase()

  const selectorList = useMemo(() => {
    const all = Array.from(groups.keys())
    const filtered = filter ? all.filter((s) => s.toLowerCase().includes(filter)) : all
    const pinned = filtered.filter((s) => pinnedSelectors.has(s))
    const rest = filtered.filter((s) => !pinnedSelectors.has(s))
    return [...pinned, ...rest]
  }, [groups, filter, pinnedSelectors])

  // Debounced hover handlers — never touch EditableDocument, purely visual
  const handleMouseEnter = useCallback((selector: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setHoveredSelector(selector)
    }, HOVER_DEBOUNCE_MS)
  }, [setHoveredSelector])

  const handleMouseLeave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    setHoveredSelector(null)
  }, [setHoveredSelector])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-850">
      {/* Search */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Filtrer les sélecteurs…"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
          aria-label="Filtrer les sélecteurs CSS"
        />
      </div>

      {/* Selector list */}
      <div className="flex-1 overflow-y-auto">
        {selectorList.length === 0 && (
          <div className="p-4 text-xs text-gray-400 text-center">Aucun sélecteur</div>
        )}
        {selectorList.map((selector) => {
          const info = groups.get(selector)!
          const isSelected = selector === selectedSelector
          const isPinned = pinnedSelectors.has(selector)

          return (
            <div
              key={selector}
              className={`
                group flex items-center gap-1 px-2 py-1.5 cursor-pointer text-xs
                hover:bg-blue-50 dark:hover:bg-gray-700
                ${isSelected ? 'bg-blue-100 dark:bg-gray-700 font-semibold' : ''}
              `}
              onClick={() => selectSelector(selector)}
              onMouseEnter={() => handleMouseEnter(selector)}
              onMouseLeave={handleMouseLeave}
              role="button"
              tabIndex={0}
              aria-selected={isSelected}
              onKeyDown={(e) => e.key === 'Enter' && selectSelector(selector)}
            >
              <ChevronRight
                size={12}
                className={`flex-shrink-0 transition-transform ${isSelected ? 'rotate-90 text-blue-500' : 'text-gray-400'}`}
              />

              <span className="flex-1 truncate font-mono" title={selector}>
                {selector}
              </span>

              {info.modified && (
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" title="Modifié" />
              )}

              <span className="flex-shrink-0 text-gray-400 dark:text-gray-500 tabular-nums">
                {info.count}
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); togglePinnedSelector(selector) }}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
                aria-label={isPinned ? 'Désépingler' : 'Épingler'}
                title={isPinned ? 'Désépingler' : 'Épingler'}
              >
                {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

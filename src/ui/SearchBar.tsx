import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useEditorStore } from '../store/editor-store'

export default function SearchBar() {
  const { searchQuery, setSearchQuery, toggleSearchBar, selectSelector, getSelectorGroups } = useEditorStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleSearchBar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSearchBar])

  const groups = getSelectorGroups()
  const q = searchQuery.toLowerCase()
  const results = q
    ? Array.from(groups.entries())
        .filter(([sel, tokens]) =>
          sel.toLowerCase().includes(q) ||
          tokens.some((t) => t.property.toLowerCase().includes(q))
        )
        .slice(0, 20)
    : []

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center px-3 py-1.5 gap-2">
        <input
          ref={inputRef}
          type="search"
          placeholder="Rechercher un sélecteur ou une propriété…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 text-sm bg-transparent border-none outline-none placeholder-gray-400"
          aria-label="Rechercher"
        />
        <button onClick={toggleSearchBar} aria-label="Fermer la recherche" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <X size={14} />
        </button>
      </div>

      {results.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto">
          {results.map(([selector]) => (
            <button
              key={selector}
              onClick={() => { selectSelector(selector); toggleSearchBar(); setSearchQuery('') }}
              className="w-full text-left px-3 py-1 text-xs hover:bg-blue-50 dark:hover:bg-gray-700 font-mono"
            >
              {selector}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

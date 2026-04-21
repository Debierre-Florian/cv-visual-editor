import React from 'react'
import { FolderOpen, Save, FileDown, Undo2, Redo2, Sun, Moon, Search } from 'lucide-react'
import { useEditorStore } from '../store/editor-store'

interface Props {
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExportPDF: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export default function Topbar({
  onOpen, onSave, onSaveAs, onExportPDF,
  canUndo, canRedo, onUndo, onRedo
}: Props) {
  const { doc, filePath, isDarkTheme, toggleTheme, toggleSearchBar } = useEditorStore()

  return (
    <div className="flex items-center gap-1 px-2 h-12 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none flex-shrink-0">
      {/* File ops */}
      <button
        onClick={onOpen}
        title="Ouvrir (Ctrl+O)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        <FolderOpen size={15} />
        Ouvrir
      </button>

      <button
        onClick={onSave}
        disabled={!doc || !filePath}
        title="Enregistrer (Ctrl+S)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Save size={15} />
        Enregistrer
      </button>

      <button
        onClick={onSaveAs}
        disabled={!doc}
        title="Enregistrer sous (Ctrl+Shift+S)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Enregistrer sous…
      </button>

      <button
        onClick={onExportPDF}
        disabled={!doc}
        title="Exporter en PDF (Ctrl+E)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <FileDown size={15} />
        Export PDF
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Annuler (Ctrl+Z)"
        aria-label="Annuler"
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Undo2 size={16} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Rétablir (Ctrl+Shift+Z)"
        aria-label="Rétablir"
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Redo2 size={16} />
      </button>

      <div className="flex-1" />

      {/* Search */}
      <button
        onClick={toggleSearchBar}
        title="Rechercher (Ctrl+F)"
        aria-label="Rechercher"
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Search size={16} />
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title="Basculer thème"
        aria-label="Basculer thème clair/sombre"
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}

import React, { useState, useCallback } from 'react'
import { FileText, Upload } from 'lucide-react'
import { useEditorStore } from '../store/editor-store'

interface Props {
  onOpen: () => void
}

export default function DropZone({ onOpen }: Props) {
  const { loadDocument } = useEditorStore()
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (!file.name.match(/\.(html?|htm)$/i)) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      loadDocument(content, file.name)
    }
    reader.readAsText(file, 'utf-8')
  }, [loadDocument])

  return (
    <div
      className={`
        flex-1 flex flex-col items-center justify-center gap-6
        transition-colors
        ${isDragging ? 'bg-blue-50 dark:bg-blue-950' : 'bg-gray-50 dark:bg-gray-900'}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className={`
        w-64 h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors
        ${isDragging
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
        }
      `}>
        {isDragging ? (
          <Upload size={32} className="text-blue-400" />
        ) : (
          <FileText size={32} className="text-gray-400" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {isDragging ? 'Relâcher pour ouvrir' : 'Glisser un fichier HTML ici'}
          </p>
          <p className="text-xs text-gray-400 mt-1">ou</p>
        </div>
        <button
          onClick={onOpen}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Parcourir les fichiers"
        >
          Parcourir…
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Supporte les fichiers .html et .htm
      </p>
    </div>
  )
}

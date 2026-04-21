import React, { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../store/editor-store'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import ControlsPanel from './ControlsPanel'
import PreviewPane from './PreviewPane'
import SearchBar from './SearchBar'
import DropZone from './DropZone'

export default function App() {
  const {
    doc,
    filePath,
    isModified,
    isDarkTheme,
    showSearchBar,
    loadDocument,
    undo,
    redo,
    canUndo,
    canRedo
  } = useEditorStore()

  // Panel widths (resizable)
  const [sidebarWidth, setSidebarWidth] = React.useState(280)
  const [controlsWidth, setControlsWidth] = React.useState(360)
  const draggingRef = useRef<'sidebar' | 'controls' | null>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // ─── Menu actions from Electron main ──────────────────────────────────────
  useEffect(() => {
    if (!window.api) return
    const cleanup = window.api.onMenuAction(async (action) => {
      switch (action) {
        case 'open': handleOpen(); break
        case 'save': handleSave(); break
        case 'save-as': handleSaveAs(); break
        case 'export-pdf': handleExportPDF(); break
        case 'undo': undo(); break
        case 'redo': redo(); break
        case 'search': useEditorStore.getState().toggleSearchBar(); break
      }
    })
    return cleanup
  }, [])

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if (mod && e.key === 'f') { e.preventDefault(); useEditorStore.getState().toggleSearchBar() }
      if (mod && e.key === 'i') { e.preventDefault(); useEditorStore.getState().toggleInspectMode() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // ─── Window title ──────────────────────────────────────────────────────────
  useEffect(() => {
    const name = filePath ? filePath.split(/[/\\]/).pop() : null
    const title = name ? `${name}${isModified ? ' •' : ''} — CV Visual Editor` : 'CV Visual Editor'
    document.title = title
    window.api?.setWindowTitle(title)
  }, [filePath, isModified])

  // ─── File operations ──────────────────────────────────────────────────────
  const handleOpen = useCallback(async () => {
    if (window.api) {
      const result = await window.api.openFile()
      if (result) loadDocument(result.content, result.filePath)
      return
    }
    // Browser fallback (dev mode)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => loadDocument(e.target?.result as string, file.name)
      reader.readAsText(file, 'utf-8')
    }
    input.click()
  }, [loadDocument])

  const handleSave = useCallback(async () => {
    if (!window.api || !doc || !filePath) return
    await window.api.saveFile(filePath, doc.render())
    useEditorStore.setState({ isModified: false })
  }, [doc, filePath])

  const handleSaveAs = useCallback(async () => {
    if (!window.api || !doc) return
    const newPath = await window.api.saveFileAs(doc.render(), filePath ?? undefined)
    if (newPath) {
      useEditorStore.setState({ filePath: newPath, isModified: false })
    }
  }, [doc, filePath])

  const handleExportPDF = useCallback(async () => {
    if (!window.api) return
    await window.api.exportPDF()
  }, [])

  // ─── Panel resize ──────────────────────────────────────────────────────────
  const startResize = (panel: 'sidebar' | 'controls') => (e: React.MouseEvent) => {
    draggingRef.current = panel
    startXRef.current = e.clientX
    startWidthRef.current = panel === 'sidebar' ? sidebarWidth : controlsWidth
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const delta = e.clientX - startXRef.current
      if (draggingRef.current === 'sidebar') {
        setSidebarWidth(Math.max(180, Math.min(500, startWidthRef.current + delta)))
      } else {
        setControlsWidth(Math.max(240, Math.min(600, startWidthRef.current + delta)))
      }
    }
    const onUp = () => { draggingRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const darkClass = isDarkTheme ? 'dark' : ''

  return (
    <div className={`${darkClass} flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden`}>
      <Topbar
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportPDF={handleExportPDF}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onUndo={undo}
        onRedo={redo}
      />

      {showSearchBar && <SearchBar />}

      {doc ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div style={{ width: sidebarWidth }} className="flex-shrink-0 overflow-hidden border-r border-gray-200 dark:border-gray-700">
            <Sidebar />
          </div>

          <div
            className="resize-handle w-1 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors"
            onMouseDown={startResize('sidebar')}
          />

          {/* Controls panel */}
          <div style={{ width: controlsWidth }} className="flex-shrink-0 overflow-hidden border-r border-gray-200 dark:border-gray-700">
            <ControlsPanel />
          </div>

          <div
            className="resize-handle w-1 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors"
            onMouseDown={startResize('controls')}
          />

          {/* Preview */}
          <div className="flex-1 overflow-hidden">
            <PreviewPane />
          </div>
        </div>
      ) : (
        <DropZone onOpen={handleOpen} />
      )}

      {/* Status bar */}
      <div className="flex items-center px-3 h-6 text-xs bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 select-none">
        {filePath ? (
          <>
            <span className="truncate max-w-xs">{filePath}</span>
            {isModified && <span className="ml-2 text-orange-500 font-semibold">• non enregistré</span>}
            <span className="ml-auto">
              {doc?.getTokens().length ?? 0} tokens éditables
            </span>
          </>
        ) : (
          <span>Aucun fichier ouvert</span>
        )}
      </div>
    </div>
  )
}

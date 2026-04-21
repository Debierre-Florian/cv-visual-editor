import { create } from 'zustand'
import { EditableDocument } from '../core/editable-document'
import { History } from '../core/history'
import type { EditableToken, EditCommand } from '../core/types'
import { groupTokensBySelector } from '../core/control-inference'

interface EditorState {
  // Document
  doc: EditableDocument | null
  filePath: string | null
  isModified: boolean

  // UI state
  selectedSelector: string | null
  searchQuery: string
  previewZoom: number
  isDarkTheme: boolean
  inspectMode: boolean
  showSearchBar: boolean
  pinnedSelectors: Set<string>

  // History
  history: History

  // Actions
  loadDocument: (source: string, filePath: string) => void
  closeDocument: () => void
  setTokenValue: (tokenId: string, newText: string) => void
  resetToken: (tokenId: string) => void
  resetAll: () => void
  undo: () => void
  redo: () => void
  selectSelector: (selector: string | null) => void
  setSearchQuery: (q: string) => void
  setPreviewZoom: (zoom: number) => void
  toggleTheme: () => void
  toggleInspectMode: () => void
  toggleSearchBar: () => void
  togglePinnedSelector: (selector: string) => void

  // Computed helpers
  getRenderedSource: () => string
  getTokensForSelector: (selector: string) => EditableToken[]
  getSelectorGroups: () => Map<string, EditableToken[]>
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useEditorStore = create<EditorState>((set, get) => ({
  doc: null,
  filePath: null,
  isModified: false,
  selectedSelector: null,
  searchQuery: '',
  previewZoom: 100,
  isDarkTheme: false,
  inspectMode: false,
  showSearchBar: false,
  pinnedSelectors: new Set(),
  history: new History(),

  loadDocument(source, filePath) {
    const doc = new EditableDocument(source)
    const history = new History()
    set({ doc, filePath, isModified: false, history, selectedSelector: null })
  },

  closeDocument() {
    set({ doc: null, filePath: null, isModified: false, selectedSelector: null })
  },

  setTokenValue(tokenId, newText) {
    const { doc, history } = get()
    if (!doc) return

    const token = doc.getToken(tokenId)
    if (!token) return

    const previousText = doc.getModifications().get(tokenId) ?? token.currentText

    doc.setTokenValue(tokenId, newText)

    const command: EditCommand = { tokenId, previousText, nextText: newText }
    history.push([command])

    set({ isModified: doc.hasModifications() })
  },

  resetToken(tokenId) {
    const { doc, history } = get()
    if (!doc) return

    const token = doc.getToken(tokenId)
    if (!token) return

    const previousText = doc.getModifications().get(tokenId) ?? token.currentText
    doc.resetToken(tokenId)

    const command: EditCommand = { tokenId, previousText, nextText: token.currentText }
    history.push([command])

    set({ isModified: doc.hasModifications() })
  },

  resetAll() {
    const { doc } = get()
    if (!doc) return
    doc.resetAll()
    set({ isModified: false })
  },

  undo() {
    const { doc, history } = get()
    if (!doc) return

    const commands = history.undo()
    if (!commands) return

    for (const cmd of commands) {
      if (cmd.nextText === doc.getToken(cmd.tokenId)?.currentText) {
        doc.resetToken(cmd.tokenId)
      } else {
        doc.setTokenValue(cmd.tokenId, cmd.nextText)
      }
    }
    set({ isModified: doc.hasModifications() })
  },

  redo() {
    const { doc, history } = get()
    if (!doc) return

    const commands = history.redo()
    if (!commands) return

    for (const cmd of commands) {
      doc.setTokenValue(cmd.tokenId, cmd.nextText)
    }
    set({ isModified: doc.hasModifications() })
  },

  selectSelector(selector) {
    set({ selectedSelector: selector })
  },

  setHoveredSelector(selector) {
    set({ hoveredSelector: selector })
  },

  setSearchQuery(q) {
    set({ searchQuery: q })
  },

  setPreviewZoom(zoom) {
    set({ previewZoom: zoom })
  },

  toggleTheme() {
    set((s) => ({ isDarkTheme: !s.isDarkTheme }))
  },

  toggleInspectMode() {
    set((s) => ({ inspectMode: !s.inspectMode }))
  },

  toggleSearchBar() {
    set((s) => ({ showSearchBar: !s.showSearchBar }))
  },

  togglePinnedSelector(selector) {
    set((s) => {
      const next = new Set(s.pinnedSelectors)
      if (next.has(selector)) next.delete(selector)
      else next.add(selector)
      return { pinnedSelectors: next }
    })
  },

  getRenderedSource() {
    return get().doc?.render() ?? ''
  },

  getTokensForSelector(selector) {
    return get().doc?.getTokens().filter((t) => t.selector === selector) ?? []
  },

  getSelectorGroups() {
    const tokens = get().doc?.getTokens() ?? []
    return groupTokensBySelector(tokens)
  },

  canUndo() {
    return get().history.canUndo()
  },

  canRedo() {
    return get().history.canRedo()
  }
}))

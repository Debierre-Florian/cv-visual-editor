/// <reference types="vite/client" />

interface Window {
  api: {
    openFile: () => Promise<{ filePath: string; content: string } | null>
    saveFile: (filePath: string, content: string) => Promise<boolean>
    saveFileAs: (content: string, defaultPath?: string) => Promise<string | null>
    confirmDialog: (message: string, detail?: string) => Promise<number>
    exportPDF: (savePath?: string) => Promise<string | null>
    autosaveWrite: (path: string, content: string) => Promise<boolean>
    autosaveRead: (path: string) => Promise<string | null>
    setWindowTitle: (title: string) => Promise<void>
    onMenuAction: (callback: (action: string) => void) => () => void
  }
  electron: {
    ipcRenderer: {
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      off: (channel: string, listener: (...args: unknown[]) => void) => void
      send: (channel: string, ...args: unknown[]) => void
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}

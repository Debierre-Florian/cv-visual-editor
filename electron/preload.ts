import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFile: () => ipcRenderer.invoke('dialog:open'),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('dialog:save', { filePath, content }),
  saveFileAs: (content: string, defaultPath?: string) =>
    ipcRenderer.invoke('dialog:save-as', { content, defaultPath }),
  confirmDialog: (message: string, detail?: string) =>
    ipcRenderer.invoke('dialog:confirm', { message, detail }),
  exportPDF: (savePath?: string) => ipcRenderer.invoke('pdf:export', { savePath }),
  autosaveWrite: (path: string, content: string) =>
    ipcRenderer.invoke('autosave:write', { path, content }),
  autosaveRead: (path: string) => ipcRenderer.invoke('autosave:read', { path }),
  setWindowTitle: (title: string) => ipcRenderer.invoke('window:set-title', title),
  onMenuAction: (callback: (action: string) => void) => {
    const actions = ['open', 'save', 'save-as', 'export-pdf', 'undo', 'redo', 'search']
    actions.forEach((action) => {
      ipcRenderer.on(`menu:${action}`, () => callback(action))
    })
    return () => {
      actions.forEach((action) => ipcRenderer.removeAllListeners(`menu:${action}`))
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export type Api = typeof api

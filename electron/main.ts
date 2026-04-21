import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webviewTag: true
    },
    title: 'CV Visual Editor'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  buildMenu()
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Ouvrir…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open')
        },
        {
          label: 'Enregistrer',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        {
          label: 'Enregistrer sous…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-as')
        },
        { type: 'separator' },
        {
          label: 'Exporter en PDF…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:export-pdf')
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        {
          label: 'Annuler',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu:undo')
        },
        {
          label: 'Rétablir',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow?.webContents.send('menu:redo')
        },
        { type: 'separator' },
        {
          label: 'Rechercher',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu:search')
        }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { type: 'separator' },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { role: 'resetZoom' as const },
        { type: 'separator' },
        { role: 'togglefullscreen' as const }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ─── IPC handlers ───────────────────────────────────────────────────────────

ipcMain.handle('dialog:open', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) return null
  const filePath = result.filePaths[0]
  const content = readFileSync(filePath, 'utf8')
  return { filePath, content }
})

ipcMain.handle('dialog:save', async (_event, { filePath, content }: { filePath: string; content: string }) => {
  writeFileSync(filePath, content, 'utf8')
  return true
})

ipcMain.handle('dialog:save-as', async (_event, { content, defaultPath }: { content: string; defaultPath?: string }) => {
  const result = await dialog.showSaveDialog({
    defaultPath,
    filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }]
  })
  if (result.canceled || !result.filePath) return null
  writeFileSync(result.filePath, content, 'utf8')
  return result.filePath
})

ipcMain.handle('dialog:confirm', async (_event, { message, detail }: { message: string; detail?: string }) => {
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Enregistrer', 'Ne pas enregistrer', 'Annuler'],
    defaultId: 0,
    cancelId: 2,
    message,
    detail
  })
  return result.response
})

ipcMain.handle('pdf:export', async (_event, { savePath }: { savePath?: string }) => {
  if (!mainWindow) return null

  let targetPath = savePath
  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: 'cv.pdf'
    })
    if (result.canceled || !result.filePath) return null
    targetPath = result.filePath
  }

  const data = await mainWindow.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { marginType: 'none' }
  })
  writeFileSync(targetPath, data)
  return targetPath
})

ipcMain.handle('autosave:write', (_event, { path, content }: { path: string; content: string }) => {
  try {
    writeFileSync(path, content, 'utf8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('autosave:read', (_event, { path }: { path: string }) => {
  try {
    if (!existsSync(path)) return null
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
})

ipcMain.handle('window:set-title', (_event, title: string) => {
  mainWindow?.setTitle(title)
})

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

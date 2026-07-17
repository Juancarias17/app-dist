import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('lang', 'es')


const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  Menu.setApplicationMenu(null)
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC!, 'logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })


  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
}

ipcMain.on('zoom', (_, direction) => {
  if (!win) return
  const current = win.webContents.getZoomFactor()
  const step = 0.1
  const next = direction === 'in'
    ? Math.min(current + step, 3)
    : Math.max(current - step, 0.3)
  win.webContents.setZoomFactor(next)
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})



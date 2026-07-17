import { contextBridge, ipcRenderer } from 'electron'

window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault()
    ipcRenderer.send('zoom', e.deltaY < 0 ? 'in' : 'out')
  }
}, { passive: false })

contextBridge.exposeInMainWorld('electronAPI', {
  zoomIn: () => ipcRenderer.send('zoom', 'in'),
  zoomOut: () => ipcRenderer.send('zoom', 'out'),
})

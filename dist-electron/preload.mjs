"use strict";
const electron = require("electron");
window.addEventListener("wheel", (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    electron.ipcRenderer.send("zoom", e.deltaY < 0 ? "in" : "out");
  }
}, { passive: false });
electron.contextBridge.exposeInMainWorld("electronAPI", {
  zoomIn: () => electron.ipcRenderer.send("zoom", "in"),
  zoomOut: () => electron.ipcRenderer.send("zoom", "out")
});

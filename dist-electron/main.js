import { app as e, ipcMain as d, BrowserWindow as r, Menu as m } from "electron";
import { fileURLToPath as w } from "node:url";
import o from "node:path";
e.disableHardwareAcceleration();
e.commandLine.appendSwitch("disable-gpu");
e.commandLine.appendSwitch("lang", "es");
const s = o.dirname(w(import.meta.url));
process.env.DIST = o.join(s, "../dist");
process.env.VITE_PUBLIC = e.isPackaged ? process.env.DIST : o.join(process.env.DIST, "../public");
let n;
const a = process.env.VITE_DEV_SERVER_URL;
function c() {
  m.setApplicationMenu(null), n = new r({
    width: 1200,
    height: 800,
    autoHideMenuBar: !0,
    icon: o.join(process.env.VITE_PUBLIC, "logo.ico"),
    webPreferences: {
      preload: o.join(s, "preload.mjs")
    }
  }), a ? n.loadURL(a) : n.loadFile(o.join(process.env.DIST, "index.html"));
}
d.on("zoom", (u, l) => {
  if (!n) return;
  const i = n.webContents.getZoomFactor(), t = 0.1, p = l === "in" ? Math.min(i + t, 3) : Math.max(i - t, 0.3);
  n.webContents.setZoomFactor(p);
});
e.whenReady().then(c);
e.on("window-all-closed", () => {
  process.platform !== "darwin" && (e.quit(), n = null);
});
e.on("activate", () => {
  r.getAllWindows().length === 0 && c();
});

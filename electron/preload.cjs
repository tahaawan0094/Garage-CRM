const { ipcRenderer, contextBridge, webFrame } = require('electron');

const printerApi = {
  getPrinterList: () => ipcRenderer.invoke('get-printer-list'),
  printReceipt: (payload) => ipcRenderer.invoke('print-receipt', payload),
  exportPDF: (payload) => ipcRenderer.invoke('export-pdf', payload),
};

contextBridge.exposeInMainWorld('desktopApp', {
  controlWindow: (action) => ipcRenderer.invoke('desktop-window-control', action),
  getWindowState: () => ipcRenderer.invoke('desktop-window-state'),
  onWindowStateChange: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('desktop-window-state-changed', listener);
    return () => ipcRenderer.removeListener('desktop-window-state-changed', listener);
  },
  setZoomFactor: (factor) => {
    try {
      if (typeof factor === 'number' && factor > 0.2 && factor < 4) {
        webFrame.setZoomFactor(factor);
      }
    } catch (e) {
      console.warn('Failed to set zoom factor:', e);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch (_) {
      return 1;
    }
  },
  isElectron: true,
  ...printerApi,
});

contextBridge.exposeInMainWorld('electronAPI', printerApi);

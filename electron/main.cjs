const { app, BrowserWindow, screen, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Enforce single instance
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

let mainWindow = null;
let backendProcess = null;
let frontendServer = null;
const backendPort = 5000;
let frontendPort = 8080;

const appRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.resolve(__dirname, '..');

function startBackend() {
  const serverScript = path.join(appRoot, 'backend', 'server.js');
  if (!fs.existsSync(serverScript)) {
    console.error('Backend script missing:', serverScript);
    return;
  }

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: String(backendPort),
  };

  backendProcess = spawn(process.execPath, [serverScript], {
    cwd: path.join(appRoot, 'backend'),
    env,
    stdio: 'ignore',
    windowsHide: true,
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to spawn backend:', err);
  });
}

function waitForBackend(url, timeoutMs = 12000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        console.warn('Backend wait finished without confirmation, proceeding.');
        resolve(false);
      } else {
        setTimeout(check, 250);
      }
    };

    check();
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    const staticRoot = path.join(appRoot, 'dist');

    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };

    frontendServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://127.0.0.1:${frontendPort}`);

      // 1. Proxy API routes to backend Express server
      if (parsedUrl.pathname.startsWith('/api/')) {
        const targetUrl = `http://127.0.0.1:${backendPort}${parsedUrl.pathname}${parsedUrl.search}`;
        const proxyReq = http.request(targetUrl, {
          method: req.method,
          headers: req.headers,
        }, (backendRes) => {
          res.writeHead(backendRes.statusCode, backendRes.headers);
          backendRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Backend unreachable', error: err.message }));
        });

        req.pipe(proxyReq);
        return;
      }

      // 2. Serve static frontend assets from dist/
      const cleanPath = parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname.replace(/^\/+/, '');
      const filePath = path.join(staticRoot, cleanPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // 3. Fallback to index.html for client-side React routes
      const indexHtml = path.join(staticRoot, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexHtml).pipe(res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    });

    const bindPort = (port) => {
      frontendServer.once('listening', () => {
        frontendPort = frontendServer.address().port;
        console.log(`[FRONTEND SERVER] Listening on http://127.0.0.1:${frontendPort}`);
        resolve();
      });

      frontendServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          bindPort(port + 1);
        } else {
          reject(err);
        }
      });

      frontendServer.listen(port, '127.0.0.1');
    };

    bindPort(8080);
  });
}

const getDesktopWindowState = () => !mainWindow || mainWindow.isDestroyed() ? null : ({
  maximized: mainWindow.isMaximized(),
  fullscreen: mainWindow.isFullScreen(),
  minimized: mainWindow.isMinimized(),
});

const controlDesktopWindow = async (action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  if (action === 'minimize') {
    mainWindow.minimize();
  } else if (action === 'toggle-fullscreen') {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  } else if (action === 'toggle-maximize') {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  } else if (action === 'close') {
    mainWindow.close();
  }
  return getDesktopWindowState();
};

ipcMain.handle('desktop-window-control', (_event, action) => {
  return controlDesktopWindow(action);
});

ipcMain.handle('desktop-window-state', () => {
  return getDesktopWindowState();
});

ipcMain.handle('get-printer-list', async () => {
  if (!mainWindow || !mainWindow.webContents) {
    return [];
  }
  try {
    if (typeof mainWindow.webContents.getPrintersAsync === 'function') {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return Array.isArray(printers) ? printers : [];
    }
    return [];
  } catch (error) {
    console.error('[PRINTER] Enumeration error:', error);
    return [];
  }
});

ipcMain.handle('print-receipt', async (_event, payload = {}) => {
  const {
    content = '',
    htmlContent = '',
    printerName = '',
    paperSize = '80mm',
    autoPrint = true,
  } = payload;

  if ((!content && !htmlContent) || !autoPrint) {
    return { success: false, reason: 'Content unavailable or auto print disabled' };
  }

  const printWindow = new BrowserWindow({
    show: false,
    width: 450,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isA4 = paperSize === 'A4';
  const pageWidth = isA4 ? '210mm' : paperSize === '58mm' ? '58mm' : '80mm';
  const pageSize = isA4 ? 'A4' : paperSize === '58mm' ? '58mm' : 'auto';

  let fullHtml = '';
  if (htmlContent) {
    fullHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: ${isA4 ? '10mm' : '6px'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: ${isA4 ? '12px' : '11px'}; width: ${pageWidth}; }
      @page { size: ${pageSize}; margin: 0; }
    </style></head><body>${htmlContent}</body></html>`;
  } else {
    fullHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; line-height: 1.45; width: ${pageWidth}; }
      pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; }
      @page { size: ${pageSize}; margin: 0; }
    </style></head><body><pre>${String(content).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
  }

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
    await printWindow.webContents.executeJavaScript(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    );

    const options = {
      silent: true,
      printBackground: true,
      deviceName: printerName || undefined,
      margins: { marginType: 'none' },
    };

    const result = await new Promise((resolve, reject) => {
      printWindow.webContents.print(options, (success, failureReason) => {
        if (success) resolve(true);
        else reject(new Error(failureReason || 'Printer did not accept the receipt'));
      });
    });

    try { printWindow.close(); } catch (_) {}
    return { success: result, printerName: printerName || 'default', paperSize };
  } catch (error) {
    try { printWindow.close(); } catch (_) {}
    return { success: false, printerName, paperSize, reason: error.message };
  }
});


ipcMain.handle('export-pdf', async (_event, payload = {}) => {
  if (!mainWindow || !mainWindow.webContents) {
    return { success: false, reason: 'Main application window is not available' };
  }

  try {
    const { defaultFileName = 'Garage_Business_Performance_Report.pdf' } = payload;

    // 1. Grab the clean HTML of the report component from the React app DOM
    const reportHtml = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const el = document.getElementById('printable-business-report');
        return el ? el.outerHTML : '';
      })()
    `);

    if (!reportHtml) {
      return { success: false, reason: 'Report element not found in DOM' };
    }

    // 2. Spawn an isolated, hidden window with PURE WHITE background (eliminates any blueish/dark shell tint)
    const pdfWindow = new BrowserWindow({
      show: false,
      width: 1240,
      height: 1754,
      backgroundColor: '#ffffff',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // 3. Inject complete, high-fidelity A4 print styles directly so every table fits 100% without clipping
    const fullHtml = `<!doctype html>
<html style="background:#ffffff !important; margin:0; padding:0;">
<head>
  <meta charset="utf-8">
  <title>Business Performance Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .printable-business-report-wrapper {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .pdf-report-page {
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      padding: 0 !important;
      margin: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      background: #ffffff !important;
      min-height: 270mm !important;
      max-height: 280mm !important;
    }
    .pdf-report-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .pdf-running-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-bottom: 1.5px solid #0f2942 !important;
      padding-bottom: 3px !important;
      margin-bottom: 8px !important;
      font-size: 7.2pt !important;
      color: #475569 !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      width: 100% !important;
    }
    .pdf-running-footer {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-top: 1px solid #cbd5e1 !important;
      padding-top: 4px !important;
      margin-top: auto !important;
      font-size: 7.2pt !important;
      color: #64748b !important;
      width: 100% !important;
    }
    .pdf-table {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      box-sizing: border-box !important;
      margin: 4px 0 8px !important;
      font-size: 7.5pt !important;
      background: #ffffff !important;
    }
    .pdf-table th {
      background: #f8f9fa !important;
      color: #0f2942 !important;
      padding: 4px 6px !important;
      font-size: 7pt !important;
      font-weight: 800 !important;
      border: 1px solid #cbd5e1 !important;
      text-align: left !important;
      box-sizing: border-box !important;
      word-break: break-word !important;
    }
    .pdf-table td {
      padding: 4px 6px !important;
      font-size: 7.2pt !important;
      border: 1px solid #e2e8f0 !important;
      color: #1e293b !important;
      box-sizing: border-box !important;
      word-break: break-word !important;
      background: #ffffff !important;
    }
    .pdf-table tr:nth-child(even) td {
      background: #fafafa !important;
    }
  </style>
</head>
<body>${reportHtml}</body>
</html>`;

    // 3. Save full HTML to temporary file to completely bypass data URL size limits
    const tempHtmlFile = path.join(app.getPath('temp'), `business_report_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlFile, fullHtml, 'utf8');

    await pdfWindow.loadFile(tempHtmlFile);
    await pdfWindow.webContents.executeJavaScript(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    );

    // 4. Generate pure binary PDF buffer with background graphics
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      landscape: false,
      margins: { marginType: 'none' },
    });

    try { pdfWindow.close(); } catch (_) {}
    try { fs.unlinkSync(tempHtmlFile); } catch (_) {}

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return { success: false, reason: 'Generated PDF buffer is empty' };
    }

    // 5. Prompt user where to save the professional report
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Business Performance Report (PDF)',
      defaultPath: defaultFileName,
      filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) {
      return { success: false, cancelled: true };
    }

    const fs = require('fs');
    fs.writeFileSync(filePath, pdfBuffer);

    // 6. Automatically launch the generated PDF file for instant review
    try {
      shell.openPath(filePath);
    } catch (_) {}

    return { success: true, filePath, size: pdfBuffer.length };
  } catch (err) {
    console.error('[PDF EXPORT] Error generating PDF:', err);
    return { success: false, reason: err.message };
  }
});



function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const iconPath = path.join(appRoot, 'app.ico');

  mainWindow = new BrowserWindow({
    title: 'Garage CRM Suite - Vertexia',
    frame: false,
    thickFrame: true,
    width: Math.min(1440, Math.max(1024, workArea.width - 60)),
    height: Math.min(920, Math.max(700, workArea.height - 60)),
    minWidth: 1024,
    minHeight: 650,
    backgroundColor: '#0f172a',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const publishWindowState = () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('desktop-window-state-changed', getDesktopWindowState());
    }
  };

  mainWindow.on('maximize', publishWindowState);
  mainWindow.on('unmaximize', publishWindowState);
  mainWindow.on('enter-full-screen', publishWindowState);
  mainWindow.on('leave-full-screen', publishWindowState);
  mainWindow.on('minimize', publishWindowState);
  mainWindow.on('restore', publishWindowState);

  mainWindow.setMenu(null);

  mainWindow.webContents.setVisualZoomLevelLimits(0.5, 3);
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown' && !input.isAutoRepeat) {
      event.preventDefault();
      controlDesktopWindow('toggle-fullscreen');
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${frontendPort}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;

  startBackend();
  await startFrontend();
  await waitForBackend(`http://127.0.0.1:${backendPort}/api/health`, 8000);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  if (frontendServer) {
    try { frontendServer.close(); } catch (_) {}
  }
  if (backendProcess) {
    try { backendProcess.kill('SIGTERM'); } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


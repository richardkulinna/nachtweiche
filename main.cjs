const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createSaveStore } = require('./save-store.cjs');

const entry = path.join(__dirname, 'index.html');
const entryUrl = pathToFileURL(entry).href;
const profile = process.argv.find((argument) => argument.startsWith('--test-profile='))?.slice(15);
const debugPort = Number(process.argv.find((argument) => argument.startsWith('--test-debug-port='))?.slice(18));
const testProfile = profile && path.isAbsolute(profile);
const debugEnabled = Boolean(testProfile && Number.isInteger(debugPort) && debugPort >= 1024 && debugPort <= 65535);

app.setName('Nachtweiche');
app.setAppUserModelId('art.kulinna.nachtweiche');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.removeSwitch('remote-debugging-port');
app.commandLine.removeSwitch('remote-debugging-pipe');

if (testProfile) {
  fs.mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
}
if (debugEnabled) {
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
  app.commandLine.appendSwitch('remote-debugging-port', String(debugPort));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let window;
  app.on('second-instance', () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(() => {
    const store = createSaveStore(app.getPath('userData'));
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const localSession = session.defaultSession;
    localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    localSession.setPermissionCheckHandler(() => false);
    localSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] },
      (_details, callback) => callback({ cancel: true })
    );

    window = new BrowserWindow({
      title: 'NACHTWEICHE',
      icon: path.join(__dirname, 'build', 'icon.ico'),
      width: Math.min(1360, width),
      height: Math.min(900, height),
      minWidth: Math.min(900, width),
      minHeight: Math.min(640, height),
      backgroundColor: '#0b0e11',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: debugEnabled,
        spellcheck: false
      }
    });
    window.setMenu(null);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.on('will-attach-webview', (event) => event.preventDefault());
    window.webContents.on('before-input-event', (event, input) => {
      if (input.key !== 'F11') return;
      event.preventDefault();
      if (input.type === 'keyDown' && !input.isAutoRepeat) window.setFullScreen(!window.isFullScreen());
    });
    const trusted = (event) => event.sender === window.webContents
      && event.senderFrame === window.webContents.mainFrame
      && event.senderFrame.url === entryUrl;
    ipcMain.on('nacht:load', (event) => {
      event.returnValue = trusted(event) ? store.load() : null;
    });
    ipcMain.on('nacht:save', (event, snapshot) => {
      event.returnValue = trusted(event) && store.save(snapshot);
    });
    window.once('ready-to-show', () => window.show());
    return window.loadFile(entry);
  }).catch((error) => {
    console.error(error);
    app.exit(1);
  });
  app.on('window-all-closed', () => app.quit());
}

import { app, BrowserWindow, ipcMain } from 'electron';

import { userInfo } from 'os';
import path from 'path';
import { fixPackagedEnv } from './fix-env';
import { registerIpcHandlers } from './ipc/handlers';
import { registerWorkspaceHandlers } from './ipc/workspace-handlers';
import { registerFsHandlers, setWorkspaceWatcher } from './ipc/fs-handlers';
import { registerAgentHandlers } from './ipc/agent-handlers';
import { registerPluginHandlers } from './ipc/plugin-handlers';
import { registerSettingsHandlers } from './ipc/settings-handlers';
import { registerSessionHandlers } from './ipc/session-handlers';
import { registerAppSettingsHandlers, getAppSettings, setAppSetting } from './ipc/app-settings-handlers';
import { registerUpdaterHandlers } from './ipc/updater-handlers';
import { startUpdatePolling } from './updater/check';
import { killAllSessions } from './ipc/terminal-handlers';
import { writeMcpConfig } from './mcp/config-writer';
import { registerCustomSchemes, registerPluginProtocol } from './plugin/protocol';
import { registerCdnProtocol } from './plugin/cdn-protocol';
import { getHome } from './utils/home';

fixPackagedEnv();

// Must be called before app.whenReady() — registers aide-plugin:// and aide-cdn:// schemes
registerCustomSchemes();

// Suppress harmless EBADF errors on /dev/fd/ paths.
// macOS fsevents reports these in packaged Electron apps when file descriptors
// are closed before lstat can read them. Safe to ignore.
process.on('uncaughtException', (err) => {
  if (err.message?.includes('EBADF') && err.message?.includes('/dev/fd/')) return;
  if (err.message?.includes('ThreadSafeFunction') || err.message?.includes('Napi::ThreadSafe')) return;
  throw err;
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    if (require('electron-squirrel-startup')) {
      app.quit();
    }
  } catch {
    // Not available outside Squirrel installer context
  }
}

const createWindow = (): void => {
  const { windowBounds } = getAppSettings();

  const mainWindow = new BrowserWindow({
    width: windowBounds?.width ?? 1200,
    height: windowBounds?.height ?? 800,
    x: windowBounds?.x,
    y: windowBounds?.y,
    minWidth: 800,
    minHeight: 600,
    title: 'AIDE',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Rust native module requires this
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Save window bounds on resize/move (debounced)
  let boundsTimer: ReturnType<typeof setTimeout> | null = null;
  const saveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        setAppSetting('windowBounds', mainWindow.getBounds());
      }
    }, 500);
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.on('ready', () => {
  registerIpcHandlers();
  registerAppSettingsHandlers(ipcMain);
  registerWorkspaceHandlers(ipcMain);
  const fallbackCwd = getHome();
  registerFsHandlers(ipcMain);
  registerAgentHandlers(ipcMain);
  registerPluginHandlers(ipcMain, fallbackCwd);
  registerSettingsHandlers(ipcMain, fallbackCwd);
  registerSessionHandlers(ipcMain);
  registerPluginProtocol(fallbackCwd);
  registerCdnProtocol();
  registerUpdaterHandlers(ipcMain);
  createWindow();
  startUpdatePolling();
  // MCP setup runs after window creation — failures must not prevent the app from opening
  try {
    const mcpHome = (process.env.HOME && process.env.HOME !== '/') ? process.env.HOME : userInfo().homedir;
    writeMcpConfig(mcpHome);
  } catch (err) {
    console.error('[AIDE] MCP setup failed (non-fatal):', err);
  }
});

let isQuitting = false;
app.on('before-quit', async (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();
  setWorkspaceWatcher(null);
  try {
    await killAllSessions();
  } catch { /* ignore */ }
  app.exit(0);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

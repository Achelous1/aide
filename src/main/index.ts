import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fixPackagedEnv } from './fix-env';
import { registerIpcHandlers } from './ipc/handlers';
import { registerWorkspaceHandlers } from './ipc/workspace-handlers';
import { registerFsHandlers } from './ipc/fs-handlers';
import { registerAgentHandlers } from './ipc/agent-handlers';
import { registerGitHandlers } from './ipc/git-handlers';
import { registerGithubHandlers } from './ipc/github-handlers';
import { registerPluginHandlers } from './ipc/plugin-handlers';

fixPackagedEnv();

// Suppress harmless EBADF errors on /dev/fd/ paths.
// macOS fsevents reports these in packaged Electron apps when file descriptors
// are closed before lstat can read them. Safe to ignore.
process.on('uncaughtException', (err) => {
  if (err.message?.includes('EBADF') && err.message?.includes('/dev/fd/')) return;
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
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AIDE',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // node-pty requires this
      preload: path.join(__dirname, 'preload.js'),
    },
  });

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
  registerWorkspaceHandlers(ipcMain);
  registerFsHandlers(ipcMain, process.cwd());
  registerAgentHandlers(ipcMain);
  registerGitHandlers(ipcMain);
  registerGithubHandlers(ipcMain);
  registerPluginHandlers(ipcMain);
  createWindow();
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

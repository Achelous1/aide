import { type IpcMain, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import { release as osRelease } from 'os';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { IPC_CHANNELS } from './channels';
import { WATCHER_EXCLUSIONS } from './watcher-exclusions';
import type { FileTreeNode, FsReadTreeError } from '../../types/ipc';

/** Returns immediate children only — no recursion. Directories have no children
 *  populated; the renderer fetches them lazily on expand. */
function readTree(dirPath: string): FileTreeNode[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileTreeNode[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, path: fullPath, type: 'directory' });
    } else {
      nodes.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }
  return nodes;
}

function readTreeWithError(dirPath: string): { nodes: FileTreeNode[]; error?: FsReadTreeError } {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    const code: FsReadTreeError['code'] =
      e.code === 'EPERM' || e.code === 'EACCES' ? 'EPERM'
      : e.code === 'ENOENT' ? 'ENOENT'
      : e.code === 'ENOTDIR' ? 'ENOTDIR'
      : 'UNKNOWN';
    return { nodes: [], error: { code, path: dirPath, message: e.message } };
  }

  const nodes: FileTreeNode[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, path: fullPath, type: 'directory' });
    } else {
      nodes.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }
  return { nodes };
}

function broadcastChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.FS_CHANGED);
  }
}

let activeWatcher: FSWatcher | null = null;
let watcherDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function setWorkspaceWatcher(workspacePath: string | null): void {
  if (activeWatcher) {
    void activeWatcher.close();
    activeWatcher = null;
  }
  if (watcherDebounceTimer) {
    clearTimeout(watcherDebounceTimer);
    watcherDebounceTimer = null;
  }
  if (!workspacePath) return;

  activeWatcher = chokidar
    .watch(workspacePath, {
      ignoreInitial: true,
      depth: 3,
      ignored: WATCHER_EXCLUSIONS,
    })
    .on('all', () => {
      if (watcherDebounceTimer) clearTimeout(watcherDebounceTimer);
      watcherDebounceTimer = setTimeout(() => {
        broadcastChanged();
        watcherDebounceTimer = null;
      }, 500);
    });
}

export function registerFsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.FS_READ_TREE, (_event, dirPath: string) => {
    return readTree(dirPath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_READ_TREE_WITH_ERROR, (_event, dirPath: string) => {
    return readTreeWithError(dirPath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_PRIVACY_SETTINGS, () => {
    if (process.platform !== 'darwin') return;
    const major = parseInt(osRelease().split('.')[0], 10);
    const url = major >= 22
      ? 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles'
      : 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles';
    shell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, (_event, filePath: string) => {
    return fs.readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, (_event, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content);
  });

  ipcMain.handle(IPC_CHANNELS.FS_DELETE, (_event, filePath: string) => {
    fs.rmSync(filePath, { recursive: true });
  });
}

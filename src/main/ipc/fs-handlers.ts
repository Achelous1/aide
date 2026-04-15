import { type IpcMain, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { IPC_CHANNELS } from './channels';
import type { FileTreeNode } from '../../types/ipc';

// Directories that are never useful to browse in a file tree
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.aide']);

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
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, path: fullPath, type: 'directory' });
    } else {
      nodes.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }
  return nodes;
}

function broadcastChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.FS_CHANGED);
  }
}

export function registerFsHandlers(ipcMain: IpcMain, cwd: string): void {
  ipcMain.handle(IPC_CHANNELS.FS_READ_TREE, (_event, dirPath: string) => {
    return readTree(dirPath);
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

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  chokidar
    .watch(cwd, {
      ignoreInitial: true,
      depth: 3,
      ignored: /\/dev\/fd\//,
    })
    .on('all', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        broadcastChanged();
      }, 500);
    });
}

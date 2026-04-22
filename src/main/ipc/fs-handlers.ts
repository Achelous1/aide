import { type IpcMain, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import { release as osRelease } from 'os';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { IPC_CHANNELS } from './channels';
import { WATCHER_EXCLUSIONS } from './watcher-exclusions';
import { FileIndex } from './file-index';
import type { FileTreeNode, FsReadTreeError } from '../../types/ipc';

// Spike: lazy-load the Rust native module — optional so dev without build:native still works
// In dev/package: __dirname = .vite/build/ → native/ is copied there by vite.main.config plugin
// In packaged app: asar.unpack ensures .node is in app.asar.unpacked/native/
let _nativeMod: { readTree: (dir: string) => FileTreeNode[] } | null = null;
function getNativeMod(): { readTree: (dir: string) => FileTreeNode[] } | null {
  if (_nativeMod !== null) return _nativeMod;
  try {
    // __dirname in both dev and packaged points to .vite/build (or equivalent).
    // The vite copy plugin places .node in .vite/build/native/;
    // the forge afterCopy hook places it at buildPath/native/ which ends up in app.asar.unpacked/native/.
    const nativeDir = path.resolve(__dirname, 'native');
    if (!fs.existsSync(nativeDir)) return null;
    // Arch-aware: only load the binary matching this platform+arch to avoid
    // require()-ing a wrong-arch binary in multi-platform checkouts.
    const expected = `index.${process.platform}-${process.arch}.node`;
    const files = fs.readdirSync(nativeDir);
    const match = files.find((f) => f === expected);
    if (!match) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _nativeMod = require(path.join(nativeDir, match));
    return _nativeMod;
  } catch {
    return null;
  }
}

const fileIndex = new FileIndex();

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
  if (!workspacePath) {
    fileIndex.clear();
    return;
  }

  // Kick off the async index build; search queries arriving before it resolves
  // simply return an empty tree until the walk completes.
  void fileIndex.initialize(workspacePath);

  activeWatcher = chokidar
    .watch(workspacePath, {
      ignoreInitial: true,
      depth: 3,
      ignored: WATCHER_EXCLUSIONS,
    })
    .on('add', (p) => fileIndex.addPath(p, 'file'))
    .on('addDir', (p) => fileIndex.addPath(p, 'directory'))
    .on('unlink', (p) => fileIndex.removePath(p))
    .on('unlinkDir', (p) => fileIndex.removeDir(p))
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

  ipcMain.handle(IPC_CHANNELS.FS_SEARCH_FILES, (_event, query: string, limit?: number) => {
    return fileIndex.search(query, limit);
  });

  // Spike: native Rust read_tree — coexists with JS version on a separate channel
  ipcMain.handle(IPC_CHANNELS.FS_READ_TREE_NATIVE, (_event, dirPath: string) => {
    const mod = getNativeMod();
    if (!mod) return { ok: false, error: 'native module not loaded' };
    return { ok: true, nodes: mod.readTree(dirPath) };
  });
}

import { type IpcMain, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import { release as osRelease } from 'os';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { IPC_CHANNELS } from './channels';
import { WATCHER_EXCLUSIONS } from './watcher-exclusions';
import { FileIndex } from './file-index';
import type { FileTreeNode, FsReadTreeError } from '../../types/ipc';

// Rust native module — loaded once at first use.
// In dev/package: __dirname = .vite/build/ → native/ is copied there by vite.main.config plugin
// In packaged app: asar.unpack ensures .node is in app.asar.unpacked/native/
// napi-rs appends a libc suffix on non-darwin platforms:
//   Linux glibc → index.linux-x64-gnu.node
//   Linux musl  → index.linux-x64-musl.node
//   Windows     → index.win32-x64-msvc.node
// Return candidates in priority order; the loader picks the first match.
function candidateNativeFilenames(): string[] {
  const base = `index.${process.platform}-${process.arch}`;
  if (process.platform === 'darwin') {
    return [`${base}.node`];
  }
  if (process.platform === 'linux') {
    return [`${base}-gnu.node`, `${base}-musl.node`, `${base}.node`];
  }
  if (process.platform === 'win32') {
    return [`${base}-msvc.node`, `${base}.node`];
  }
  return [`${base}.node`];
}

interface NativeMod {
  readTree: (dir: string) => FileTreeNode[];
  readTreeWithError: (dir: string) => { nodes: FileTreeNode[]; error?: FsReadTreeError };
  readFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
  deletePath: (path: string) => void;
}

let _nativeMod: NativeMod | null = null;
function getNativeMod(): NativeMod {
  if (_nativeMod !== null) return _nativeMod;
  const nativeDir = path.resolve(__dirname, 'native');
  if (!fs.existsSync(nativeDir)) {
    throw new Error(
      '[aide] Rust native module directory not found. Run `pnpm build:native` first.'
    );
  }
  const files = new Set(fs.readdirSync(nativeDir));
  const match = candidateNativeFilenames().find((c) => files.has(c));
  if (!match) {
    throw new Error(
      `[aide] No arch-matching .node file found in ${nativeDir} for ${process.platform}-${process.arch}. Run \`pnpm build:native\`.`
    );
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _nativeMod = require(path.join(nativeDir, match)) as NativeMod;
  } catch (err) {
    throw new Error(
      `[aide] Failed to load native module ${match}: ${err instanceof Error ? err.message : String(err)}. ` +
        `Try rebuilding with "pnpm build:native". If this persists on a packaged build, the binary may be ABI-mismatched or corrupted.`
    );
  }
  return _nativeMod;
}

const fileIndex = new FileIndex();

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
    return getNativeMod().readTree(dirPath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_READ_TREE_WITH_ERROR, (_event, dirPath: string) => {
    return getNativeMod().readTreeWithError(dirPath);
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
    return getNativeMod().readFile(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, (_event, filePath: string, content: string) => {
    getNativeMod().writeFile(filePath, content);
  });

  ipcMain.handle(IPC_CHANNELS.FS_DELETE, (_event, filePath: string) => {
    getNativeMod().deletePath(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_SEARCH_FILES, (_event, query: string, limit?: number) => {
    return fileIndex.search(query, limit);
  });
}

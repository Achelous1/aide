import { type IpcMain, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import { release as osRelease } from 'os';
import path from 'path';
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
    // Prefer universal (lipo-merged arm64+x64) when present; fall back to arch-specific.
    return [`index.darwin-universal.node`, `${base}.node`];
  }
  if (process.platform === 'linux') {
    return [`${base}-gnu.node`, `${base}-musl.node`, `${base}.node`];
  }
  if (process.platform === 'win32') {
    return [`${base}-msvc.node`, `${base}.node`];
  }
  return [`${base}.node`];
}

interface WatcherEventPayload {
  kind: 'add' | 'remove' | 'modify' | 'rename';
  path: string;
  entryKind?: 'file' | 'directory';
  from?: string;
}

interface WatcherHandle {
  stop(): void;
}

export interface PtyHandle {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

interface NativeMod {
  readTree: (dir: string) => FileTreeNode[];
  readTreeWithError: (dir: string) => { nodes: FileTreeNode[]; error?: FsReadTreeError; skippedCount: number };
  readFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
  deletePath: (path: string) => void;
  startWatcher: (
    path: string,
    depth: number | undefined,
    exclusions: string[],
    callback: (ev: WatcherEventPayload) => void,
  ) => WatcherHandle;
  spawnPty: (
    command: string,
    args: string[],
    cwd: string,
    env: [string, string][],
    cols: number,
    rows: number,
    onData: (ev: { data: string }) => void,
    onExit: (ev: { exitCode: number }) => void,
  ) => PtyHandle;
}

let _nativeMod: NativeMod | null = null;
export function getNativeMod(): NativeMod {
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

let activeWatcherHandle: WatcherHandle | null = null;
let watcherDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function setWorkspaceWatcher(workspacePath: string | null): void {
  if (activeWatcherHandle) {
    activeWatcherHandle.stop();
    activeWatcherHandle = null;
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

  // Guard against late events that arrive after stop() is called.
  let stopped = false;
  const inner = getNativeMod().startWatcher(
    workspacePath,
    3,
    WATCHER_EXCLUSIONS,
    (ev) => {
      if (stopped) return;
      if (ev.kind === 'add') {
        if (ev.entryKind === 'directory') fileIndex.addPath(ev.path, 'directory');
        else fileIndex.addPath(ev.path, 'file');
      } else if (ev.kind === 'remove') {
        // Path is already gone at event time so entryKind may be unreliable.
        // Call both: removePath deletes the exact-path key; removeDir iterates
        // the prefix for children. Both are idempotent — no harm in double-dispatch.
        fileIndex.removePath(ev.path);
        fileIndex.removeDir(ev.path);
      }
      if (watcherDebounceTimer) clearTimeout(watcherDebounceTimer);
      watcherDebounceTimer = setTimeout(() => {
        broadcastChanged();
        watcherDebounceTimer = null;
      }, 500);
    },
  );
  activeWatcherHandle = {
    stop() {
      stopped = true;
      inner.stop();
    },
  };
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

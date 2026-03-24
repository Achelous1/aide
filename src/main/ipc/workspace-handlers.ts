import { dialog, BrowserWindow, type IpcMain } from 'electron';
import fs from 'fs';
import nodePath from 'path';
import Store from 'electron-store';
import { IPC_CHANNELS } from './channels';
import type { WorkspaceInfo } from '../../types/ipc';

const store = new Store({ name: 'aide-workspaces' });

let activeWorkspacePath: string | null = null;

const WORKSPACE_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
];

function getWorkspaces(): WorkspaceInfo[] {
  return store.get('workspaces', []) as WorkspaceInfo[];
}

function setWorkspaces(workspaces: WorkspaceInfo[]): void {
  store.set('workspaces', workspaces);
}

function getCounter(): number {
  return store.get('counter', 0) as number;
}

function incrementCounter(): number {
  const next = getCounter() + 1;
  store.set('counter', next);
  return next;
}

function nextColor(counter: number): string {
  return WORKSPACE_COLORS[counter % WORKSPACE_COLORS.length];
}

export function registerWorkspaceHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_LIST, () => {
    return getWorkspaces();
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_CREATE, (_event, path: string) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Path does not exist: ${path}`);
    }
    const counter = incrementCounter();
    const name = nodePath.basename(path) || path;
    const workspace: WorkspaceInfo = {
      id: `workspace-${counter}`,
      name,
      path,
      color: nextColor(counter),
      lastOpened: Date.now(),
    };
    const workspaces = getWorkspaces();
    workspaces.push(workspace);
    setWorkspaces(workspaces);
    return workspace;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_OPEN, (_event, path: string) => {
    activeWorkspacePath = path;
    const workspaces = getWorkspaces();
    const workspace = workspaces.find((w) => w.path === path);
    if (workspace) {
      workspace.lastOpened = Date.now();
      setWorkspaces(workspaces);
    }
    return activeWorkspacePath;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_REMOVE, (_event, id: string) => {
    const workspaces = getWorkspaces();
    const index = workspaces.findIndex((w) => w.id === id);
    if (index !== -1) {
      workspaces.splice(index, 1);
      setWorkspaces(workspaces);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_RECENT, () => {
    return getWorkspaces().sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 5);
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_OPEN_DIALOG, async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

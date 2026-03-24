import { type IpcMain } from 'electron';
import fs from 'fs';
import { IPC_CHANNELS } from './channels';
import type { WorkspaceInfo } from '../../types/ipc';

const workspaces: WorkspaceInfo[] = [];
let workspaceCounter = 0;
let activeWorkspacePath: string | null = null;

const WORKSPACE_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
];

function nextColor(): string {
  return WORKSPACE_COLORS[workspaceCounter % WORKSPACE_COLORS.length];
}

export function registerWorkspaceHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_LIST, () => {
    return workspaces;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_CREATE, (_event, path: string) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Path does not exist: ${path}`);
    }
    const name = path.split('/').pop() || path;
    const workspace: WorkspaceInfo = {
      id: `workspace-${++workspaceCounter}`,
      name,
      path,
      color: nextColor(),
      lastOpened: Date.now(),
    };
    workspaces.push(workspace);
    return workspace;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_OPEN, (_event, path: string) => {
    activeWorkspacePath = path;
    const workspace = workspaces.find((w) => w.path === path);
    if (workspace) {
      workspace.lastOpened = Date.now();
    }
    return activeWorkspacePath;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_REMOVE, (_event, id: string) => {
    const index = workspaces.findIndex((w) => w.id === id);
    if (index !== -1) {
      workspaces.splice(index, 1);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_RECENT, () => {
    return [...workspaces].sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 5);
  });
}

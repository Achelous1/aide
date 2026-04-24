import { dialog, shell, BrowserWindow, type IpcMain } from 'electron';
import fs from 'fs';
import nodePath from 'path';
import Store from 'electron-store';
import { IPC_CHANNELS } from './channels';
import type { WorkspaceInfo } from '../../types/ipc';
import { writeMcpConfig } from '../mcp/config-writer';
import { setWorkspaceWatcher } from './fs-handlers';

const store = new Store({ name: 'aide-workspaces' });

let activeWorkspacePath: string | null = null;

export function getActiveWorkspacePath(): string | null {
  return activeWorkspacePath;
}

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

/**
 * Migration: remove AIDE-generated entries from {workspace}/.mcp.json.
 * If only AIDE entries remain, delete the file entirely.
 */
export function migrateProjectMcpJson(workspacePath: string): void {
  const mcpPath = nodePath.join(workspacePath, '.mcp.json');
  if (!fs.existsSync(mcpPath)) return;
  try {
    const raw = fs.readFileSync(mcpPath, 'utf-8');
    const config = JSON.parse(raw);
    if (!config.mcpServers || typeof config.mcpServers !== 'object') return;
    if (!('aide' in config.mcpServers)) return;

    delete config.mcpServers.aide;

    if (Object.keys(config.mcpServers).length === 0) {
      // No other servers — check if there are top-level keys besides mcpServers
      const topKeys = Object.keys(config).filter((k) => k !== 'mcpServers');
      if (topKeys.length === 0) {
        fs.unlinkSync(mcpPath);
        console.log('[smalti] Removed legacy .mcp.json (AIDE-only)');
      } else {
        delete config.mcpServers;
        fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2));
        console.log('[smalti] Removed aide entry and empty mcpServers from .mcp.json');
      }
    } else {
      fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2));
      console.log('[smalti] Removed aide entry from .mcp.json (other servers preserved)');
    }
  } catch {
    // Corrupt or unreadable — leave it alone
  }
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
    // .aide/plugins creation is delegated to plugin-handlers (ensurePluginsDirs)
    // and config-writer (writeMcpConfig). No eager mkdir here — prevents EPERM
    // from aborting the IPC handler when the workspace path is permission-restricted.
    try { writeMcpConfig(path); } catch (err) {
      console.warn('[smalti] Failed to write workspace MCP config:', (err as Error).message);
    }
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
    // Migrate legacy .mcp.json (remove AIDE entries from project root)
    migrateProjectMcpJson(path);
    // .aide/plugins creation is delegated (see WORKSPACE_CREATE comment).
    try { writeMcpConfig(path); } catch (err) {
      console.warn('[smalti] Failed to write workspace MCP config:', (err as Error).message);
    }
    try { setWorkspaceWatcher(path); } catch (err) {
      console.warn('[smalti] Failed to set workspace watcher:', (err as Error).message);
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

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_RENAME, (_event, id: string, name: string) => {
    const workspaces = getWorkspaces();
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return null;
    ws.name = name;
    setWorkspaces(workspaces);
    return ws;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_SHOW_IN_FINDER, (_event, path: string) => {
    shell.showItemInFolder(path);
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_CREATE_PROJECT, async (_event, projectName: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select parent directory for new project',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const projectPath = nodePath.join(result.filePaths[0], projectName);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }
    const counter = incrementCounter();
    const workspace: WorkspaceInfo = {
      id: `workspace-${counter}`,
      name: projectName,
      path: projectPath,
      color: nextColor(counter),
      lastOpened: Date.now(),
    };
    const workspaces = getWorkspaces();
    workspaces.push(workspace);
    setWorkspaces(workspaces);
    try { writeMcpConfig(projectPath); } catch (err) {
      console.warn('[smalti] Failed to write workspace MCP config:', (err as Error).message);
    }
    return workspace;
  });
}

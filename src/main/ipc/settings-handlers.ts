import { IpcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from './channels';
import { getActiveWorkspacePath } from './workspace-handlers';
import type { WorkspaceSettings } from '../../types/ipc';

function getSettingsPath(cwd: string): string {
  return path.join(cwd, '.smalti', 'settings.json');
}

function readSettings(cwd: string): WorkspaceSettings {
  const settingsPath = getSettingsPath(cwd);
  if (!fs.existsSync(settingsPath)) return { eventBindings: {} };
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as WorkspaceSettings;
  } catch {
    return { eventBindings: {} };
  }
}

export function registerSettingsHandlers(ipcMain: IpcMain, cwd: string): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_READ, () => {
    const effectiveCwd = getActiveWorkspacePath() ?? cwd;
    return readSettings(effectiveCwd);
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_WRITE, (_event, settings: WorkspaceSettings) => {
    const effectiveCwd = getActiveWorkspacePath() ?? cwd;
    const settingsPath = getSettingsPath(effectiveCwd);
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  });
}

import { type IpcMain } from 'electron';
import { execSync } from 'child_process';
import { IPC_CHANNELS } from './channels';
import type { AgentConfig } from '../../types/ipc';

const AGENTS: Omit<AgentConfig, 'installed'>[] = [
  { id: 'claude', name: 'Claude Code', command: 'claude' },
  { id: 'gemini', name: 'Gemini CLI', command: 'gemini' },
  { id: 'codex', name: 'Codex CLI', command: 'codex' },
];

function isInstalled(command: string): boolean {
  try {
    const cmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

export function registerAgentHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.AGENT_DETECT, () => {
    return AGENTS.map(a => ({ ...a, installed: isInstalled(a.command) }));
  });
}

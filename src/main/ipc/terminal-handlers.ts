import { type IpcMain, BrowserWindow } from 'electron';
import * as pty from 'node-pty';
import os from 'os';
import { IPC_CHANNELS } from './channels';
import { AgentStatusDetector } from '../agent/status-detector';
import { getAgentSpawnConfig, COMMON_ENV, type AgentType } from '../agent/agent-config';
import { getMcpConfigPath } from '../mcp/config-writer';
import type { AgentStatus } from '../../types/ipc';

function getResumeArgs(agentType: string, sessionId: string): string[] {
  switch (agentType) {
    case 'claude': return ['--resume', sessionId];
    case 'codex': return ['resume', sessionId];
    case 'gemini': return ['--resume', sessionId];
    default: return [];
  }
}

function parseAgentSessionId(agentType: string, data: string): string | null {
  switch (agentType) {
    case 'claude': {
      // Claude session IDs are ULIDs (26-char Crockford Base32)
      const match = data.match(/session[:\s]+([0-9A-HJKMNP-TV-Z]{26})\b/i);
      return match ? match[1] : null;
    }
    case 'gemini': {
      const match = data.match(/session[:\s]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      return match ? match[1] : null;
    }
    case 'codex': {
      const match = data.match(/session[:\s]+(\S+\.jsonl)/i);
      return match ? match[1] : null;
    }
    default: return null;
  }
}

interface PtySession {
  pty: pty.IPty;
  webContentsId: number;
  agentSessionId?: string;
}

const sessions = new Map<string, PtySession>();
let sessionCounter = 0;

const statusDetector = new AgentStatusDetector(
  (sessionId: string, status: AgentStatus) => {
    const session = sessions.get(sessionId);
    if (session) {
      broadcastToRenderer(session.webContentsId, IPC_CHANNELS.AGENT_STATUS, sessionId, status);
    }
  }
);

function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return 'powershell.exe';
  }
  return process.env.SHELL || '/bin/zsh';
}

function broadcastToRenderer(webContentsId: number, channel: string, ...args: unknown[]): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (win.webContents.id === webContentsId) {
      win.webContents.send(channel, ...args);
      break;
    }
  }
}

export function killAllSessions(): void {
  for (const [, session] of sessions) {
    try {
      session.pty.kill();
    } catch {
      // Ignore errors — process may already be dead
    }
  }
  sessions.clear();
}

export function registerTerminalHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_SPAWN,
    (event, options?: { shell?: string; cwd?: string; agentType?: AgentType; resumeSessionId?: string }) => {
      const defaultShell = getDefaultShell();
      const cwd = options?.cwd || os.homedir();
      const sessionId = `term-${++sessionCounter}`;

      const mcpConfig = getMcpConfigPath();
      const agentConfig = getAgentSpawnConfig(options?.agentType ?? 'shell', defaultShell, mcpConfig);
      const shell = options?.agentType ? agentConfig.command : (options?.shell || defaultShell);

      // Build env from explicit allowlist — never spread full process.env
      // to prevent leaking secrets (AWS keys, tokens, etc.) to child processes
      const safeBaseEnv: Record<string, string> = {};
      const allowedKeys = [
        'PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'LC_CTYPE',
        'SHELL', 'TERM', 'TMPDIR', 'XDG_RUNTIME_DIR',
        'AIDE_PLUGINS_DIR', 'AIDE_WORKSPACE',
      ];
      for (const key of allowedKeys) {
        if (process.env[key]) safeBaseEnv[key] = process.env[key] as string;
      }

      let spawnArgs = [...agentConfig.args];
      if (options?.resumeSessionId && options?.agentType && options.agentType !== 'shell') {
        spawnArgs = [...spawnArgs, ...getResumeArgs(options.agentType, options.resumeSessionId)];
      }

      const ptyProcess = pty.spawn(shell, spawnArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: {
          ...safeBaseEnv,
          ...COMMON_ENV,
          ...agentConfig.extraEnv,
        },
      });

      const session: PtySession = {
        pty: ptyProcess,
        webContentsId: event.sender.id,
      };
      sessions.set(sessionId, session);

      ptyProcess.onData((data: string) => {
        broadcastToRenderer(
          session.webContentsId,
          IPC_CHANNELS.TERMINAL_DATA,
          sessionId,
          data
        );
        statusDetector.feed(sessionId, data);
        if (options?.agentType && options.agentType !== 'shell') {
          const agentSid = parseAgentSessionId(options.agentType, data);
          if (agentSid && agentSid !== session.agentSessionId) {
            session.agentSessionId = agentSid;
            broadcastToRenderer(session.webContentsId, IPC_CHANNELS.AGENT_SESSION_ID, sessionId, agentSid);
          }
        }
      });

      ptyProcess.onExit(() => {
        sessions.delete(sessionId);
        statusDetector.remove(sessionId);
      });

      return sessionId;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_WRITE,
    (_event, sessionId: string, data: string) => {
      const session = sessions.get(sessionId);
      if (session) {
        session.pty.write(data);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_RESIZE,
    (_event, sessionId: string, cols: number, rows: number) => {
      const session = sessions.get(sessionId);
      if (session) {
        session.pty.resize(cols, rows);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, (_event, sessionId: string) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      sessions.delete(sessionId);
      statusDetector.remove(sessionId);
    }
  });
}

import { type IpcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from './channels';
import { AgentStatusDetector } from '../agent/status-detector';
import { getAgentSpawnConfig, COMMON_ENV, type AgentType } from '../agent/agent-config';
import { getMcpConfigPath } from '../mcp/config-writer';
import { getHome } from '../utils/home';
import { getNativeMod, type PtyHandle } from './fs-handlers';
import type { AgentStatus } from '../../types/ipc';

function getResumeArgs(agentType: string, sessionId: string): string[] {
  switch (agentType) {
    case 'claude': return ['--resume', sessionId];
    case 'codex': return ['resume', sessionId];
    // Gemini CLI does not support --resume in current versions
    default: return [];
  }
}

/** Args to resume the most recent session (no specific ID needed) */
function getContinueArgs(agentType: string): string[] {
  switch (agentType) {
    case 'claude': return ['--continue'];
    case 'codex': return ['resume', '--last'];
    // Gemini CLI does not support session resume in current versions
    default: return [];
  }
}

/**
 * Detect the agent's session ID from its session files on disk.
 * Each agent stores sessions in a known directory; we find the most recently modified file.
 */
/**
 * Detect session ID from the agent's session files on disk.
 * Claude and Codex store sessions in known directories.
 * Gemini uses an unknown project hash — relies on --resume (bare) instead.
 */
function detectSessionIdFromFs(agentType: string, cwd: string): string | null {
  const home = getHome();
  try {
    switch (agentType) {
      case 'claude': {
        // ~/.claude/projects/<cwd-with-separators-replaced-by-hyphens>/
        const encoded = cwd.replace(/[\\/]/g, '-');
        const dir = path.join(home, '.claude', 'projects', encoded);
        return newestJsonlId(dir);
      }
      case 'codex': {
        const dir = path.join(home, '.codex', 'sessions');
        return newestJsonlId(dir);
      }
      default: return null;
    }
  } catch {
    return null;
  }
}

function newestJsonlId(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  let best: { name: string; mtime: number } | null = null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const mtime = fs.statSync(path.join(dir, entry.name)).mtimeMs;
    if (!best || mtime > best.mtime) best = { name: entry.name, mtime };
  }
  return best ? best.name.replace(/\.jsonl$/, '') : null;
}

interface PtySession {
  handle: PtyHandle;
  webContentsId: number;
  agentSessionId?: string;
  sessionDetectTimer?: ReturnType<typeof setInterval>;
  /** Timestamp of last user keystroke — used to ignore PTY echo in status detection */
  lastUserInputAt: number;
}

/** PTY data arriving within this window after user input is treated as echo, not agent output */
const USER_ECHO_WINDOW_MS = 150;

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

export async function killAllSessions(): Promise<void> {
  const snapshot = Array.from(sessions.values());
  const pending = snapshot.map((session) => {
    if (session.sessionDetectTimer) clearInterval(session.sessionDetectTimer);
    return new Promise<void>((resolve) => {
      try { session.handle.kill(); } catch { /* already dead */ }
      setTimeout(resolve, 500);
    });
  });
  await Promise.allSettled(pending);
  sessions.clear();
}

export function registerTerminalHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_SPAWN,
    (event, options?: { shell?: string; cwd?: string; agentType?: AgentType; resumeSessionId?: string; continueSession?: boolean }) => {
      const defaultShell = getDefaultShell();
      const home = getHome();
      const rawCwd = options?.cwd || home;
      const cwd = fs.existsSync(rawCwd) ? rawCwd : home;
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
        'NVM_DIR',  // needed for shell tabs to initialize nvm via .zshrc
        'SMALTI_WORKSPACE',
        'AIDE_WORKSPACE', // Back-compat: AIDE_* fallback until task_reb_f03 (v0.2.0)
      ];
      for (const key of allowedKeys) {
        if (process.env[key]) safeBaseEnv[key] = process.env[key] as string;
      }

      // If PATH doesn't already include an nvm node binary, try to inject one.
      // This covers agent tabs (claude/gemini/codex) which run directly without
      // a shell, so .zshrc / nvm init is never executed inside the PTY.
      if (safeBaseEnv.PATH && !safeBaseEnv.PATH.includes('/.nvm/versions/node/')) {
        try {
          const nvmDir = process.env.NVM_DIR || path.join(getHome(), '.nvm');
          const versionsDir = path.join(nvmDir, 'versions', 'node');
          if (fs.existsSync(versionsDir)) {
            const highest = fs.readdirSync(versionsDir)
              .filter((v) => /^v\d+/.test(v))
              .sort((a, b) => {
                const parse = (s: string) => s.slice(1).split('.').map(Number);
                const [ma, mi, mp] = parse(a);
                const [mb, mib, mpb] = parse(b);
                return (mb - ma) || (mib - mi) || (mpb - mp);
              })[0];
            if (highest) {
              const nvmBin = path.join(versionsDir, highest, 'bin');
              if (fs.existsSync(nvmBin)) {
                safeBaseEnv.PATH = `${nvmBin}:${safeBaseEnv.PATH}`;
              }
            }
          }
        } catch { /* ignore */ }
      }

      let spawnArgs = [...agentConfig.args];
      if (options?.agentType && options.agentType !== 'shell') {
        if (options.resumeSessionId) {
          spawnArgs = [...spawnArgs, ...getResumeArgs(options.agentType, options.resumeSessionId)];
        } else if (options.continueSession) {
          spawnArgs = [...spawnArgs, ...getContinueArgs(options.agentType)];
        }
      }

      const envTuples: [string, string][] = Object.entries({
        ...safeBaseEnv,
        ...COMMON_ENV,
        ...agentConfig.extraEnv,
      });

      // Declare session first so callbacks can close over it.
      // The handle field is filled in after spawnPty succeeds.
      const session = {
        handle: null as unknown as PtyHandle,
        webContentsId: event.sender.id,
        lastUserInputAt: 0,
      } as PtySession;

      let handle: PtyHandle;
      try {
        handle = getNativeMod().spawnPty(
          shell,
          spawnArgs,
          cwd,
          envTuples,
          80,
          24,
          (ev) => {
            broadcastToRenderer(
              session.webContentsId,
              IPC_CHANNELS.TERMINAL_DATA,
              sessionId,
              ev.data
            );
            // For shell sessions, skip PTY echo that follows user keystrokes.
            // Agent TUI sessions (claude, gemini, codex) don't echo keystrokes —
            // their output is always legitimate UI content that must reach the detector.
            const agentType = options?.agentType ?? 'shell';
            const sinceInput = Date.now() - session.lastUserInputAt;
            if (agentType !== 'shell' || sinceInput > USER_ECHO_WINDOW_MS) {
              statusDetector.feed(sessionId, ev.data);
            }
          },
          () => {
            if (session.sessionDetectTimer) clearInterval(session.sessionDetectTimer);
            sessions.delete(sessionId);
            statusDetector.remove(sessionId);
          },
        );
      } catch (spawnErr) {
        const err = spawnErr as NodeJS.ErrnoException;
        return {
          ok: false as const,
          error: err.message ?? String(spawnErr),
          code: err.code ?? 'UNKNOWN',
          diagnostic: {
            path: safeBaseEnv.PATH ?? process.env.PATH ?? '',
            home: safeBaseEnv.HOME ?? process.env.HOME ?? '',
            shell,
          },
        };
      }

      session.handle = handle;
      sessions.set(sessionId, session);
      statusDetector.register(sessionId, options?.agentType ?? 'shell');

      // Poll filesystem to detect the agent's session ID (1s interval, up to 15 attempts)
      if (options?.agentType && options.agentType !== 'shell') {
        let attempts = 0;
        session.sessionDetectTimer = setInterval(() => {
          if (!sessions.has(sessionId) || ++attempts > 15) {
            clearInterval(session.sessionDetectTimer!);
            session.sessionDetectTimer = undefined;
            return;
          }
          const fsSessionId = detectSessionIdFromFs(options.agentType!, cwd);
          if (fsSessionId && fsSessionId !== session.agentSessionId) {
            session.agentSessionId = fsSessionId;
            broadcastToRenderer(session.webContentsId, IPC_CHANNELS.AGENT_SESSION_ID, sessionId, fsSessionId);
            clearInterval(session.sessionDetectTimer!);
            session.sessionDetectTimer = undefined;
          }
        }, 1000);
      }

      return { ok: true as const, sessionId };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_WRITE,
    (_event, sessionId: string, data: string) => {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastUserInputAt = Date.now();
        statusDetector.notifyUserInput(sessionId);
        session.handle.write(data);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_RESIZE,
    (_event, sessionId: string, cols: number, rows: number) => {
      const session = sessions.get(sessionId);
      if (session) {
        session.handle.resize(cols, rows);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, (_event, sessionId: string) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.handle.kill();
      sessions.delete(sessionId);
      statusDetector.remove(sessionId);
    }
  });
}

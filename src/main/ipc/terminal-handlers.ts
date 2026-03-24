import { type IpcMain, BrowserWindow } from 'electron';
import * as pty from 'node-pty';
import os from 'os';
import { IPC_CHANNELS } from './channels';

interface PtySession {
  pty: pty.IPty;
  webContentsId: number;
}

const sessions = new Map<string, PtySession>();
let sessionCounter = 0;

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

export function registerTerminalHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_SPAWN,
    (event, options?: { shell?: string; cwd?: string }) => {
      const shell = options?.shell || getDefaultShell();
      const cwd = options?.cwd || os.homedir();
      const sessionId = `term-${++sessionCounter}`;

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as Record<string, string>,
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
      });

      ptyProcess.onExit(() => {
        sessions.delete(sessionId);
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
    }
  });
}

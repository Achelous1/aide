import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipc/channels';
import type { AideAPI, TerminalSpawnOptions } from '../types/ipc';

const aideAPI: AideAPI = {
  terminal: {
    spawn: (options?: TerminalSpawnOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_SPAWN, options),

    write: (sessionId: string, data: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, sessionId, data),

    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, sessionId, cols, rows),

    kill: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_KILL, sessionId),

    onData: (callback: (sessionId: string, data: string) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        sessionId: string,
        data: string
      ) => {
        callback(sessionId, data);
      };
      ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld('aide', aideAPI);

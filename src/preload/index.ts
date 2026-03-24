import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipc/channels';
import type { AideAPI, AgentStatus, TerminalSpawnOptions } from '../types/ipc';

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

  workspace: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST),
    create: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE, path),
    open: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_OPEN, path),
    remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_REMOVE, id),
    recent: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_RECENT),
  },

  agent: {
    detect: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_DETECT),
    onStatus: (callback: (sessionId: string, status: AgentStatus) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        sessionId: string,
        status: AgentStatus
      ) => {
        callback(sessionId, status);
      };
      ipcRenderer.on(IPC_CHANNELS.AGENT_STATUS, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STATUS, listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld('aide', aideAPI);

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipc/channels';
import type { AideAPI, AgentStatus, GitStatus, TerminalSpawnOptions, PluginSpec, McpStatus, PluginTool, WorkspaceSettings, SavedSession, UpdateInfo } from '../types/ipc';

const aideAPI: AideAPI = {
  fs: {
    readTree: (dirPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_READ_TREE, dirPath),

    readFile: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, filePath),

    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, filePath, content),

    delete: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE, filePath),

    onChanged: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.FS_CHANGED, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.FS_CHANGED, listener);
      };
    },
  },

  git: {
    status: (cwd: string): Promise<GitStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, cwd),
    commit: (cwd: string, message: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, cwd, message),
    push: (cwd: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_PUSH, cwd),
    pull: (cwd: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL, cwd),
    branch: (cwd: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCH, cwd),
    log: (cwd: string, limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_LOG, cwd, limit),
    remoteUrl: (cwd: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_REMOTE_URL, cwd),
  },

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

    onAgentSessionId: (callback: (sessionId: string, agentSessionId: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, sessionId: string, agentSessionId: string) =>
        callback(sessionId, agentSessionId);
      ipcRenderer.on(IPC_CHANNELS.AGENT_SESSION_ID, handler);
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.AGENT_SESSION_ID, handler); };
    },
  },

  workspace: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST),
    create: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE, path),
    open: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_OPEN, path),
    remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_REMOVE, id),
    recent: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_RECENT),
    openDialog: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_OPEN_DIALOG),
    createProject: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE_PROJECT, name),
    rename: (id: string, name: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_RENAME, id, name),
    showInFinder: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SHOW_IN_FINDER, path),
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

  plugin: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_LIST),
    generateSpec: (name: string, description: string): Promise<PluginSpec> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_GENERATE_SPEC, name, description),
    generate: (name: string, description: string): Promise<PluginSpec> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_GENERATE, name, description),
    activate: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_ACTIVATE, id),
    deactivate: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_DEACTIVATE, id),
    delete: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_DELETE, name),
    invoke: (pluginId: string, toolName: string, args: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_INVOKE, pluginId, toolName, args),
    getHtml: (id: string): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_GET_HTML, id),
    onChanged: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.PLUGINS_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PLUGINS_CHANGED, listener);
    },
    onDataChanged: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.PLUGIN_DATA_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PLUGIN_DATA_CHANGED, listener);
    },
    onHtmlChanged: (callback: (pluginName: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, pluginName: string) => callback(pluginName);
      ipcRenderer.on(IPC_CHANNELS.PLUGIN_HTML_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PLUGIN_HTML_CHANGED, listener);
    },
    reload: (pluginId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_RELOAD, pluginId),
  },

  mcp: {
    status: (): Promise<McpStatus> => ipcRenderer.invoke(IPC_CHANNELS.MCP_STATUS),
    tools: (): Promise<PluginTool[]> => ipcRenderer.invoke(IPC_CHANNELS.MCP_TOOLS),
  },

  github: {
    listPRs: (owner: string, repo: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GITHUB_LIST_PRS, owner, repo),
    listIssues: (owner: string, repo: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GITHUB_LIST_ISSUES, owner, repo),
    getPR: (owner: string, repo: string, prNumber: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GITHUB_GET_PR, owner, repo, prNumber),
  },

  settings: {
    read: (): Promise<WorkspaceSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_READ),
    write: (settings: WorkspaceSettings): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_WRITE, settings),
  },

  session: {
    save: (session: SavedSession): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_SAVE, session),
    saveSync: (session: SavedSession): void =>
      ipcRenderer.sendSync(IPC_CHANNELS.SESSION_SAVE_SYNC, session),
    load: (workspaceId: string): Promise<SavedSession | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_LOAD, workspaceId),
  },

  files: {
    onReveal: (callback: (filePath: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filePath: string) =>
        callback(filePath);
      ipcRenderer.on(IPC_CHANNELS.FILES_REVEAL, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.FILES_REVEAL, listener);
    },
    onSelect: (callback: (filePath: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filePath: string) =>
        callback(filePath);
      ipcRenderer.on(IPC_CHANNELS.FILES_SELECT, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.FILES_SELECT, listener);
    },
    onRefresh: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.FILES_REFRESH, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.FILES_REFRESH, listener);
    },
  },

  updater: {
    check: (): Promise<UpdateInfo | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
    getInfo: (): Promise<UpdateInfo | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_GET_INFO),
    download: (): Promise<{ ok: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),
    onChanged: (callback: (info: UpdateInfo | null) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfo | null) =>
        callback(info);
      ipcRenderer.on(IPC_CHANNELS.UPDATER_INFO_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_INFO_CHANGED, listener);
    },
  },
};

contextBridge.exposeInMainWorld('aide', aideAPI);

/** Terminal spawn options */
export interface TerminalSpawnOptions {
  shell?: string;
  cwd?: string;
}

/** File tree node */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked';
}

/** Plugin info for UI display */
export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  tools: PluginTool[];
}

/** Plugin tool definition */
export interface PluginTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; required?: boolean }>;
}

/** Agent config */
export interface AgentConfig {
  id: string;
  name: string;
  command: string;
  installed: boolean;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  path: string;
  color: string;
  lastOpened: number;
}

export type AgentStatus = 'idle' | 'processing' | 'awaiting-input';

export interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface TerminalTab {
  id: string;
  type: 'agent' | 'shell';
  agentId?: string;
  sessionId: string;
  title: string;
}

/** IPC API exposed to renderer via contextBridge */
export interface AideAPI {
  fs: {
    readTree(dirPath: string): Promise<FileTreeNode[]>;
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    delete(filePath: string): Promise<void>;
    onChanged(callback: () => void): () => void;
  };
  git: {
    status(cwd: string): Promise<GitStatus>;
    commit(cwd: string, message: string): Promise<unknown>;
    push(cwd: string): Promise<unknown>;
    pull(cwd: string): Promise<unknown>;
    branch(cwd: string): Promise<unknown>;
    log(cwd: string, limit?: number): Promise<unknown>;
  };
  terminal: {
    spawn(options?: TerminalSpawnOptions): Promise<string>;
    write(sessionId: string, data: string): Promise<void>;
    resize(sessionId: string, cols: number, rows: number): Promise<void>;
    kill(sessionId: string): Promise<void>;
    onData(callback: (sessionId: string, data: string) => void): () => void;
  };
  workspace: {
    list(): Promise<WorkspaceInfo[]>;
    create(path: string): Promise<WorkspaceInfo>;
    open(path: string): Promise<void>;
    remove(id: string): Promise<void>;
    recent(): Promise<WorkspaceInfo[]>;
    openDialog(): Promise<string | null>;
    createProject(name: string): Promise<WorkspaceInfo | null>;
  };
  agent: {
    detect(): Promise<AgentConfig[]>;
    onStatus(callback: (sessionId: string, status: AgentStatus) => void): () => void;
  };
}

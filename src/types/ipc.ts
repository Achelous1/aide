/** Terminal spawn options */
export interface TerminalSpawnOptions {
  shell?: string;
  cwd?: string;
  agentType?: 'claude' | 'gemini' | 'codex' | 'shell';
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
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  active: boolean;
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

/** GitHub PR summary */
export interface GithubPR {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  draft: boolean;
}

/** GitHub Issue summary */
export interface GithubIssue {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
}

/** Plugin specification */
export interface PluginSpec {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
  entryPoint: string;
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
    remoteUrl(cwd: string): Promise<{ owner: string; repo: string } | null>;
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
  plugin: {
    list(): Promise<PluginInfo[]>;
    generateSpec(name: string, description: string): Promise<PluginSpec>;
    generate(name: string, description: string): Promise<PluginSpec>;
    activate(id: string): Promise<void>;
    deactivate(id: string): Promise<void>;
    delete(name: string): Promise<void>;
  };
  github: {
    listPRs(owner: string, repo: string): Promise<GithubPR[]>;
    listIssues(owner: string, repo: string): Promise<GithubIssue[]>;
    getPR(owner: string, repo: string, prNumber: number): Promise<GithubPR & { body: string; additions: number; deletions: number; changedFiles: number }>;
  };
}

/** Terminal spawn options */
export interface TerminalSpawnOptions {
  shell?: string;
  cwd?: string;
  agentType?: 'claude' | 'gemini' | 'codex' | 'shell';
  resumeSessionId?: string;  // Agent session ID for resume
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
  active: boolean;
  scope: 'local' | 'global';
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
  type: 'agent' | 'shell' | 'plugin';
  agentId?: string;
  pluginId?: string;
  sessionId?: string;
  agentSessionId?: string;  // Captured agent session ID for resume
  title: string;
}

/** Split-screen pane */
export interface Pane {
  id: string;
  tabs: TerminalTab[];
  activeTabId: string | null;
}

/** Recursive split layout node */
export interface SplitLayout {
  id: string;
  direction: 'horizontal' | 'vertical';
  children: LayoutNode[];
  sizes: number[];
}

/** A layout node is either a leaf Pane or a nested SplitLayout */
export type LayoutNode = Pane | SplitLayout;

/** Type guard: check if a LayoutNode is a SplitLayout */
export function isSplitLayout(node: LayoutNode): node is SplitLayout {
  return 'direction' in node && 'children' in node;
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

/** Request to create a plugin from agent-generated code */
export interface PluginCreateRequest {
  name: string;
  description: string;
  code: string;
  permissions: string[];
  tools: PluginTool[];
}

/** Request to invoke a registered plugin tool */
export interface PluginInvokeRequest {
  pluginId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/** Result from invoking a plugin tool */
export interface PluginInvokeResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/** A single event → tool binding in .aide/settings.json */
export interface EventBinding {
  plugin: string;
  tool: string;
  args: Record<string, unknown>;
}

/** Emit permissions for a plugin in .aide/settings.json */
export interface PluginPermissions {
  emit: string[];
}

/** Workspace-level settings stored in {workspace}/.aide/settings.json */
export interface WorkspaceSettings {
  eventBindings: Partial<Record<'file:clicked' | 'file:right-clicked', EventBinding[]>>;
  pluginBindings: Record<string, EventBinding[]>;
  pluginPermissions: Record<string, PluginPermissions>;
}

/** MCP server status */
export interface McpStatus {
  running: boolean;
  toolCount: number;
  pluginCount: number;
}

/** Serializable layout node for session persistence */
export type SerializableLayoutNode = SerializablePane | SerializableSplitLayout;

export interface SerializablePane {
  id: string;
  tabs: SavedTab[];
  activeTabId: string | null;
}

export interface SerializableSplitLayout {
  id: string;
  direction: 'horizontal' | 'vertical';
  children: SerializableLayoutNode[];
  sizes: number[];
}

export interface SavedTab {
  id: string;
  type: 'agent' | 'shell' | 'plugin';
  title: string;
  isActive: boolean;
  agentId?: string;
  pluginId?: string;
  agentSessionId?: string;
}

export interface SavedSession {
  version: 1;
  workspaceId: string;
  savedAt: number;
  layout: SerializableLayoutNode;
  focusedPaneId: string | null;
  activePlugins: string[];
  sidePanelTab: 'files' | 'plugins';
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
    onAgentSessionId(callback: (sessionId: string, agentSessionId: string) => void): () => void;
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
    invoke(pluginId: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
    getHtml: (id: string) => Promise<string | null>;
    onChanged(callback: () => void): () => void;
  };
  mcp: {
    status(): Promise<McpStatus>;
    tools(): Promise<PluginTool[]>;
  };
  settings: {
    read(): Promise<WorkspaceSettings>;
    write(settings: WorkspaceSettings): Promise<void>;
  };
  files: {
    onReveal(callback: (filePath: string) => void): () => void;
    onSelect(callback: (filePath: string) => void): () => void;
    onRefresh(callback: () => void): () => void;
  };
  github: {
    listPRs(owner: string, repo: string): Promise<GithubPR[]>;
    listIssues(owner: string, repo: string): Promise<GithubIssue[]>;
    getPR(owner: string, repo: string, prNumber: number): Promise<GithubPR & { body: string; additions: number; deletions: number; changedFiles: number }>;
  };
  session: {
    save(session: SavedSession): Promise<void>;
    load(workspaceId: string): Promise<SavedSession | null>;
  };
}

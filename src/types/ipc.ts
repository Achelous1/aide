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

/** IPC API exposed to renderer via contextBridge */
export interface AideAPI {
  terminal: {
    spawn(options?: TerminalSpawnOptions): Promise<string>;
    write(sessionId: string, data: string): Promise<void>;
    resize(sessionId: string, cols: number, rows: number): Promise<void>;
    kill(sessionId: string): Promise<void>;
    onData(callback: (sessionId: string, data: string) => void): () => void;
  };
}

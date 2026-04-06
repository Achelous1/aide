/**
 * IPC channel name constants.
 * Shared between main and preload to avoid typos.
 */
export const IPC_CHANNELS = {
  // Terminal
  TERMINAL_SPAWN: 'terminal:spawn',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_KILL: 'terminal:kill',
  TERMINAL_DATA: 'terminal:data',

  // File System
  FS_READ_TREE: 'fs:read-tree',
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_DELETE: 'fs:delete',
  FS_CHANGED: 'fs:changed',

  // Git
  GIT_STATUS: 'git:status',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_BRANCH: 'git:branch',
  GIT_LOG: 'git:log',
  GIT_REMOTE_URL: 'git:remote-url',

  // Plugin
  PLUGIN_LIST: 'plugin:list',
  PLUGIN_GENERATE_SPEC: 'plugin:generate-spec',
  PLUGIN_GENERATE: 'plugin:generate',
  PLUGIN_ACTIVATE: 'plugin:activate',
  PLUGIN_DEACTIVATE: 'plugin:deactivate',
  PLUGIN_DELETE: 'plugin:delete',
  PLUGIN_INVOKE: 'plugin:invoke',
  PLUGIN_GET_HTML: 'plugin:get-html',
  PLUGINS_CHANGED: 'plugins:changed',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',

  // Files (main → renderer push)
  FILES_REVEAL: 'files:reveal',
  FILES_SELECT: 'files:select',
  FILES_REFRESH: 'files:refresh',

  // MCP
  MCP_STATUS: 'mcp:status',
  MCP_TOOLS: 'mcp:tools',

  // Session
  SESSION_SAVE: 'session:save',
  SESSION_LOAD: 'session:load',

  // GitHub
  GITHUB_LIST_PRS: 'github:list-prs',
  GITHUB_LIST_ISSUES: 'github:list-issues',
  GITHUB_GET_PR: 'github:get-pr',

  // Agent
  AGENT_LIST_INSTALLED: 'agent:list-installed',
  AGENT_DETECT: 'agent:detect',
  AGENT_STATUS: 'agent:status',
  AGENT_SESSION_ID: 'agent:session-id',

  // Workspace
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_OPEN: 'workspace:open',
  WORKSPACE_REMOVE: 'workspace:remove',
  WORKSPACE_RECENT: 'workspace:recent',
  WORKSPACE_OPEN_DIALOG: 'workspace:open-dialog',
  WORKSPACE_CREATE_PROJECT: 'workspace:create-project',
} as const;

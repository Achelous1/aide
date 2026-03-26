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

  // Plugin
  PLUGIN_LIST: 'plugin:list',
  PLUGIN_ENABLE: 'plugin:enable',
  PLUGIN_DISABLE: 'plugin:disable',
  PLUGIN_REMOVE: 'plugin:remove',

  // Agent
  AGENT_LIST_INSTALLED: 'agent:list-installed',
  AGENT_DETECT: 'agent:detect',
  AGENT_STATUS: 'agent:status',

  // Workspace
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_OPEN: 'workspace:open',
  WORKSPACE_REMOVE: 'workspace:remove',
  WORKSPACE_RECENT: 'workspace:recent',
  WORKSPACE_OPEN_DIALOG: 'workspace:open-dialog',
  WORKSPACE_CREATE_PROJECT: 'workspace:create-project',
} as const;

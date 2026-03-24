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
} as const;

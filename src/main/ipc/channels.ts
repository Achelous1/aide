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
  FS_READ_TREE_WITH_ERROR: 'fs:read-tree-with-error',
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_DELETE: 'fs:delete',
  FS_CHANGED: 'fs:changed',

  // System
  OPEN_PRIVACY_SETTINGS: 'system:open-privacy-settings',

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
  PLUGIN_HTML_CHANGED: 'plugin:html-changed',
  PLUGIN_RELOAD: 'plugin:reload',
  PLUGINS_CHANGED: 'plugins:changed',
  PLUGIN_DATA_CHANGED: 'plugin:data-changed',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',

  // App Settings (global, not workspace-scoped)
  APP_SETTINGS_GET: 'app-settings:get',
  APP_SETTINGS_SET: 'app-settings:set',

  // Files (main → renderer push)
  FILES_REVEAL: 'files:reveal',
  FILES_SELECT: 'files:select',
  FILES_REFRESH: 'files:refresh',

  // MCP
  MCP_STATUS: 'mcp:status',
  MCP_TOOLS: 'mcp:tools',

  // Session
  SESSION_SAVE: 'session:save',
  SESSION_SAVE_SYNC: 'session:save-sync',
  SESSION_LOAD: 'session:load',

  // Updater
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_INFO_CHANGED: 'updater:info-changed',
  UPDATER_GET_INFO: 'updater:get-info',

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
  WORKSPACE_RENAME: 'workspace:rename',
  WORKSPACE_SHOW_IN_FINDER: 'workspace:show-in-finder',
} as const;

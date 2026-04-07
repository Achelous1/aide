import { IpcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import { IPC_CHANNELS } from './channels';
import { generatePluginSpec } from '../plugin/spec-generator';
import type { PluginSpec } from '../plugin/spec-generator';
import { generatePluginCode } from '../plugin/code-generator';
import { PluginRegistry } from '../plugin/registry';
import { getActiveWorkspacePath } from './workspace-handlers';
import { getHome } from '../utils/home';

const registry = new PluginRegistry();

function getGlobalPluginsDir(): string {
  return path.join(getHome(), '.aide', 'plugins');
}

function getLocalPluginsDir(cwd: string): string {
  return path.join(cwd, '.aide', 'plugins');
}

function readPluginSpec(pluginDir: string): PluginSpec | null {
  const specPath = path.join(pluginDir, 'plugin.spec.json');
  if (!fs.existsSync(specPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  } catch {
    return null;
  }
}

function loadDirIntoRegistry(dir: string, scope: 'local' | 'global'): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(dir, entry.name);
    const spec = readPluginSpec(pluginDir);
    if (spec && !registry.get(spec.id)) {
      registry.register(spec, pluginDir, scope);
    }
  }
}

/**
 * Incremental rescan — called from chokidar events AND from PLUGIN_LIST.
 * Registers newly added plugins and unregisters plugins whose spec has
 * disappeared. Unlike refreshLocalPlugins, this runs even when the workspace
 * path hasn't changed, so plugins created at runtime (e.g. via MCP
 * aide_create_plugin) are picked up without restarting the app.
 *
 * Self-healing: PLUGIN_LIST calls this for BOTH scopes so global plugins
 * added after startup become visible inside a workspace without restart.
 */
function rescanPluginsDir(dir: string, scope: 'local' | 'global'): void {
  // 1. Register any new plugins found on disk
  loadDirIntoRegistry(dir, scope);

  // 2. Unregister plugins whose pluginDir no longer exists or whose spec
  //    has disappeared (plugin deleted by user or MCP)
  const scoped = registry.list().filter((p) => p.scope === scope);
  for (const plugin of scoped) {
    if (!plugin.pluginDir.startsWith(dir)) continue;
    const specExists = fs.existsSync(path.join(plugin.pluginDir, 'plugin.spec.json'));
    if (!specExists) {
      registry.unregister(plugin.id);
    }
  }
}

function ensurePluginsDirs(cwd: string): void {
  try {
    const globalDir = getGlobalPluginsDir();
    if (!fs.existsSync(globalDir)) fs.mkdirSync(globalDir, { recursive: true });
  } catch { /* non-fatal */ }
  try {
    const localDir = getLocalPluginsDir(cwd);
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  } catch { /* non-fatal */ }
}

// 활성 워크스페이스 경로를 반환 — 없으면 시작 시 cwd로 폴백
function getEffectiveCwd(fallbackCwd: string): string {
  return getActiveWorkspacePath() ?? fallbackCwd;
}

function loadRegistryFromDisk(cwd: string): void {
  ensurePluginsDirs(cwd);
  loadDirIntoRegistry(getGlobalPluginsDir(), 'global');
  loadDirIntoRegistry(getLocalPluginsDir(cwd), 'local');
}

function broadcastPluginsChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.PLUGINS_CHANGED);
  }
}

function broadcastHtmlChanged(pluginName: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.PLUGIN_HTML_CHANGED, pluginName);
  }
}

let localPluginsWatcher: ReturnType<typeof chokidar.watch> | null = null;
let localHtmlWatcher: ReturnType<typeof chokidar.watch> | null = null;
let lastLocalDir: string | null = null;
let dataWatcher: ReturnType<typeof chokidar.watch> | null = null;
const localHtmlDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function broadcastDataChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.PLUGIN_DATA_CHANGED);
  }
}

// Clears local plugins and reloads from the new workspace directory.
// No-op if the workspace hasn't changed.
function refreshLocalPlugins(cwd: string): void {
  const localDir = getLocalPluginsDir(cwd);
  if (lastLocalDir === localDir) return;
  registry.clearLocalPlugins();
  lastLocalDir = localDir;
  ensurePluginsDirs(cwd);
  loadDirIntoRegistry(localDir, 'local');
  // Re-watch local plugins dir for add/remove changes.
  // On any filesystem event, rescan the directory to register newly added
  // plugins (e.g. created by MCP aide_create_plugin at runtime) and drop
  // plugins whose spec no longer exists.
  localPluginsWatcher?.close();
  localPluginsWatcher = chokidar
    .watch(localDir, { ignoreInitial: true, depth: 2, ignored: /\/dev\/fd\// })
    .on('all', () => {
      rescanPluginsDir(localDir, 'local');
      broadcastPluginsChanged();
    });
  // Re-watch local plugins dir for index.html changes (debounced 300ms)
  localHtmlWatcher?.close();
  localHtmlWatcher = chokidar
    .watch(path.join(localDir, '**/index.html'), { ignoreInitial: true, ignored: /\/dev\/fd\// })
    .on('change', (filePath: string) => {
      const pluginName = path.basename(path.dirname(filePath));
      const existing = localHtmlDebounceTimers.get(pluginName);
      if (existing) clearTimeout(existing);
      localHtmlDebounceTimers.set(pluginName, setTimeout(() => {
        localHtmlDebounceTimers.delete(pluginName);
        broadcastHtmlChanged(pluginName);
      }, 300));
    });
  // Re-watch .aide/ data files so MCP-triggered writes refresh the UI
  dataWatcher?.close();
  const aideDir = path.join(cwd, '.aide');
  dataWatcher = chokidar
    .watch(aideDir, { ignoreInitial: true, depth: 0, ignored: /\/dev\/fd\// })
    .on('change', (filePath: string) => {
      if (filePath.endsWith('.json') && !filePath.endsWith('settings.json')) {
        broadcastDataChanged();
      }
    });
}

function makeEmitterFactory(getCwd: () => string) {
  return (emittingPluginId: string) => (event: string, data: Record<string, unknown>): void => {
    const cwd = getCwd();
    const settingsPath = path.join(cwd, '.aide', 'settings.json');
    let settings: { pluginBindings?: Record<string, Array<{ plugin: string; tool: string; args: Record<string, unknown> }>>; pluginPermissions?: Record<string, { emit: string[] }> };
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      return;
    }
    const permissions = settings.pluginPermissions?.[emittingPluginId];
    if (!permissions?.emit?.includes(event)) {
      console.warn(`[plugin-bridge] ${emittingPluginId} not permitted to emit: ${event}`);
      return;
    }
    const bindings = settings.pluginBindings?.[event] ?? [];
    for (const binding of bindings) {
      try {
        registry.invokeTool(binding.plugin, binding.tool, { ...binding.args, ...data }, cwd);
      } catch (err) {
        console.error(`[plugin-bridge] Error routing ${event} → ${binding.plugin}.${binding.tool}:`, err);
      }
    }
  };
}

export function registerPluginHandlers(ipcMain: IpcMain, cwd: string): void {
  loadRegistryFromDisk(cwd);
  registry.setEmitterFactory(makeEmitterFactory(getEffectiveCwd.bind(null, cwd)));

  // Broadcast existing plugins immediately so the UI shows them on launch
  broadcastPluginsChanged();

  // Watch global plugins dir for add/remove changes.
  // Rescan on any event so runtime-added plugins become visible without restart.
  const globalDir = getGlobalPluginsDir();
  chokidar
    .watch(globalDir, { ignoreInitial: true, depth: 2, ignored: /\/dev\/fd\// })
    .on('all', () => {
      rescanPluginsDir(globalDir, 'global');
      broadcastPluginsChanged();
    });

  // Watch global plugins dir for index.html changes (debounced 300ms)
  const htmlDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  chokidar
    .watch(path.join(globalDir, '**/index.html'), { ignoreInitial: true, ignored: /\/dev\/fd\// })
    .on('change', (filePath: string) => {
      const pluginName = path.basename(path.dirname(filePath));
      const existing = htmlDebounceTimers.get(pluginName);
      if (existing) clearTimeout(existing);
      htmlDebounceTimers.set(pluginName, setTimeout(() => {
        htmlDebounceTimers.delete(pluginName);
        broadcastHtmlChanged(pluginName);
      }, 300));
    });

  // Spec-only: generate and return spec without writing to disk
  ipcMain.handle(IPC_CHANNELS.PLUGIN_GENERATE_SPEC, async (_event, name: string, description: string) => {
    return generatePluginSpec(name, description);
  });

  // Full pipeline: natural language → spec → code → register (with cleanup on failure)
  ipcMain.handle(IPC_CHANNELS.PLUGIN_GENERATE, async (_event, name: string, description: string) => {
    const effectiveCwd = getEffectiveCwd(cwd);
    ensurePluginsDirs(effectiveCwd);
    const localDir = getLocalPluginsDir(effectiveCwd);
    const spec = generatePluginSpec(name, description);
    const pluginDir = path.join(localDir, spec.name);
    try {
      generatePluginCode(spec, pluginDir);
      registry.register(spec, pluginDir, 'local');
    } catch (err) {
      // Cleanup orphaned files on pipeline failure
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true });
      }
      throw err;
    }
    return spec;
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_LIST, async () => {
    const effectiveCwd = getEffectiveCwd(cwd);
    // Clears stale local plugins when workspace changes, then reloads from current workspace
    refreshLocalPlugins(effectiveCwd);
    // Self-healing: rescan both scopes so plugins added at runtime (e.g. global
    // plugins installed via MCP or a file manager after startup) become visible
    // without restarting the app.
    rescanPluginsDir(getGlobalPluginsDir(), 'global');
    rescanPluginsDir(getLocalPluginsDir(effectiveCwd), 'local');
    return registry.list();
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_ACTIVATE, async (_event, pluginId: string, workspacePath?: string) => {
    const activeCwd = workspacePath || getEffectiveCwd(cwd);
    const exports = registry.activate(pluginId, activeCwd);
    return { id: pluginId, active: exports !== null };
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_DEACTIVATE, async (_event, pluginId: string) => {
    registry.deactivate(pluginId);
    return { id: pluginId, active: false };
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_INVOKE, async (_event, pluginId: string, toolName: string, args: Record<string, unknown>) => {
    const effectiveCwd = getEffectiveCwd(cwd);
    const result = registry.invokeTool(pluginId, toolName, args, effectiveCwd);
    broadcastDataChanged();
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.MCP_STATUS, async () => {
    const plugins = registry.list();
    const tools = registry.getRegisteredTools();
    return { running: true, toolCount: tools.length, pluginCount: plugins.length };
  });

  ipcMain.handle(IPC_CHANNELS.MCP_TOOLS, async () => {
    return registry.getRegisteredTools();
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_GET_HTML, async (_event, pluginId: string) => {
    // Try active registry first
    const plugin = registry.get(pluginId);
    let pluginDir: string | null = plugin?.pluginDir ?? null;

    // Fallback: scan filesystem — plugin may be installed but not activated (OFF)
    if (!pluginDir) {
      const effectiveCwd = getEffectiveCwd(cwd);
      for (const dir of [getLocalPluginsDir(effectiveCwd), getGlobalPluginsDir()]) {
        if (!fs.existsSync(dir)) continue;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const candidate = path.join(dir, entry.name);
          const spec = readPluginSpec(candidate);
          if (spec && (spec.id === pluginId || spec.name === pluginId)) {
            pluginDir = candidate;
            break;
          }
        }
        if (pluginDir) break;
      }
    }

    if (!pluginDir) return null;
    const htmlPath = path.join(pluginDir, 'index.html');
    if (!fs.existsSync(htmlPath)) return null;
    return fs.readFileSync(htmlPath, 'utf-8');
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_RELOAD, async (_event, pluginId: string) => {
    const plugin = registry.get(pluginId);
    if (!plugin) return false;
    const wasActive = plugin.active;
    if (wasActive) registry.deactivate(pluginId);
    // Re-read spec from disk in case it changed
    const freshSpec = readPluginSpec(plugin.pluginDir);
    if (freshSpec) {
      registry.unregister(pluginId);
      registry.register(freshSpec, plugin.pluginDir, plugin.scope);
      if (wasActive) {
        const effectiveCwd = getEffectiveCwd(cwd);
        registry.activate(freshSpec.id, effectiveCwd);
      }
    }
    broadcastPluginsChanged();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_DELETE, async (_event, pluginName: string) => {
    const effectiveCwd = getEffectiveCwd(cwd);
    // Search local first, then global
    const localDir = getLocalPluginsDir(effectiveCwd);
    const globalDir = getGlobalPluginsDir();

    let pluginDir = path.join(localDir, pluginName);
    let baseDir = localDir;

    if (!fs.existsSync(pluginDir)) {
      pluginDir = path.join(globalDir, pluginName);
      baseDir = globalDir;
    }

    // Prevent path traversal — pluginDir must be inside baseDir
    if (!pluginDir.startsWith(baseDir + path.sep)) {
      throw new Error('Invalid plugin name');
    }

    // Find and unregister from registry
    const plugins = registry.list();
    const match = plugins.find((p) => p.name === pluginName);
    if (match) {
      registry.unregister(match.id);
    }
    if (fs.existsSync(pluginDir)) {
      fs.rmSync(pluginDir, { recursive: true });
    }
    return { deleted: true };
  });
}

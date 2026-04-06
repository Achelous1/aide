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

let localPluginsWatcher: ReturnType<typeof chokidar.watch> | null = null;
let lastLocalDir: string | null = null;

// Clears local plugins and reloads from the new workspace directory.
// No-op if the workspace hasn't changed.
function refreshLocalPlugins(cwd: string): void {
  const localDir = getLocalPluginsDir(cwd);
  if (lastLocalDir === localDir) return;
  registry.clearLocalPlugins();
  lastLocalDir = localDir;
  ensurePluginsDirs(cwd);
  loadDirIntoRegistry(localDir, 'local');
  // Re-watch local plugins dir for the new workspace
  localPluginsWatcher?.close();
  localPluginsWatcher = chokidar
    .watch(localDir, { ignoreInitial: true, depth: 2, ignored: /\/dev\/fd\// })
    .on('all', broadcastPluginsChanged);
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
  // Watch global plugins dir for changes
  const globalDir = getGlobalPluginsDir();
  chokidar
    .watch(globalDir, { ignoreInitial: true, depth: 2, ignored: /\/dev\/fd\// })
    .on('all', broadcastPluginsChanged);

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
    return registry.invokeTool(pluginId, toolName, args, effectiveCwd);
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

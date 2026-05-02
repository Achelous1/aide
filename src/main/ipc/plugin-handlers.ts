import { IpcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from './channels';
import { WATCHER_EXCLUSIONS } from './watcher-exclusions';
import { getNativeMod } from './fs-handlers';
import { generatePluginSpec } from '../plugin/spec-generator';
import type { PluginSpec } from '../plugin/spec-generator';
import { generatePluginCode } from '../plugin/code-generator';
import { PluginRegistry } from '../plugin/registry';
import { getActiveWorkspacePath } from './workspace-handlers';
import * as registryGlobal from '../plugin/registry-global';

const registry = new PluginRegistry();

function getLocalPluginsDir(cwd: string): string {
  return path.join(cwd, '.smalti', 'plugins');
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

function loadDirIntoRegistry(dir: string): void {
  if (!fs.existsSync(dir)) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    // EPERM on macOS when the workspace path is in a TCC-restricted location
    // (e.g. Documents without Full Disk Access). Treat as "no plugins" so the
    // PLUGIN_LIST IPC doesn't fail and abort the renderer's workspace flow.
    console.warn('[smalti] Could not scan plugins dir', dir, ':', (err as Error).message);
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(dir, entry.name);
    const spec = readPluginSpec(pluginDir);
    if (spec && !registry.get(spec.id)) {
      registry.register(spec, pluginDir);
    }
  }
}

/**
 * Incremental rescan — called from watcher events AND from PLUGIN_LIST.
 * Registers newly added plugins and unregisters plugins whose spec has
 * disappeared. Runs even when the workspace path hasn't changed, so plugins
 * created at runtime (e.g. via MCP aide_create_plugin) are picked up without
 * restarting the app.
 */
function rescanPluginsDir(dir: string): void {
  // 1. Register any new plugins found on disk
  loadDirIntoRegistry(dir);

  // 2. Unregister plugins whose pluginDir no longer exists or whose spec
  //    has disappeared (plugin deleted by user or MCP)
  for (const plugin of registry.list()) {
    if (!plugin.pluginDir.startsWith(dir)) continue;
    const specExists = fs.existsSync(path.join(plugin.pluginDir, 'plugin.spec.json'));
    if (!specExists) {
      registry.unregister(plugin.id);
    }
  }
}

function ensurePluginsDirs(cwd: string): void {
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
  loadDirIntoRegistry(getLocalPluginsDir(cwd));
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

interface WatcherHandle { stop(): void; }

let localPluginsWatcher: WatcherHandle | null = null;
let localHtmlWatcher: WatcherHandle | null = null;
let lastLocalDir: string | null = null;
let dataWatcher: WatcherHandle | null = null;
const localHtmlDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function broadcastDataChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.PLUGIN_DATA_CHANGED);
  }
}

// Clears all plugins and reloads from the new workspace directory.
// No-op if the workspace hasn't changed.
function refreshPlugins(cwd: string): void {
  const localDir = getLocalPluginsDir(cwd);
  if (lastLocalDir === localDir) return;
  registry.clearPlugins();
  lastLocalDir = localDir;
  ensurePluginsDirs(cwd);
  loadDirIntoRegistry(localDir);
  // Re-watch local plugins dir for add/remove changes.
  // On any filesystem event, rescan the directory to register newly added
  // plugins (e.g. created by MCP aide_create_plugin at runtime) and drop
  // plugins whose spec no longer exists.
  localPluginsWatcher?.stop();
  localPluginsWatcher = getNativeMod().startWatcher(
    localDir,
    2,
    WATCHER_EXCLUSIONS,
    () => {
      rescanPluginsDir(localDir);
      broadcastPluginsChanged();
    },
  );
  // Re-watch local plugins dir for index.html changes (debounced 300ms).
  // Rust watcher emits all events; filter to index.html in the callback.
  localHtmlWatcher?.stop();
  localHtmlWatcher = getNativeMod().startWatcher(
    localDir,
    undefined,
    WATCHER_EXCLUSIONS,
    (ev) => {
      if (!ev.path.endsWith('index.html')) return;
      if (ev.kind !== 'modify' && ev.kind !== 'add') return;
      const pluginName = path.basename(path.dirname(ev.path));
      const existing = localHtmlDebounceTimers.get(pluginName);
      if (existing) clearTimeout(existing);
      localHtmlDebounceTimers.set(pluginName, setTimeout(() => {
        localHtmlDebounceTimers.delete(pluginName);
        broadcastHtmlChanged(pluginName);
      }, 300));
    },
  );
  // Re-watch .smalti/ data files so MCP-triggered writes refresh the UI.
  // depth=1 emits events for direct children of smaltiDir (depth 0 would only
  // fire on the directory itself — wrong for file-write detection).
  dataWatcher?.stop();
  const aideDir = path.join(cwd, '.smalti');
  dataWatcher = getNativeMod().startWatcher(
    aideDir,
    1,
    WATCHER_EXCLUSIONS,
    (ev) => {
      if (ev.path.endsWith('.json') && !ev.path.endsWith('settings.json')) {
        broadcastDataChanged();
      }
    },
  );
}

function makeEmitterFactory(getCwd: () => string) {
  return (emittingPluginId: string) => (event: string, data: Record<string, unknown>): void => {
    const cwd = getCwd();
    const settingsPath = path.join(cwd, '.smalti', 'settings.json');
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
    const specJsonPath = path.join(pluginDir, 'plugin.spec.json');
    try {
      generatePluginCode(spec, pluginDir);
      registry.register(spec, pluginDir);
    } catch (err) {
      // Cleanup orphaned files on pipeline failure
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true });
      }
      throw err;
    }
    // Auto-push to global registry. Failure is non-fatal — local plugin is still valid.
    try {
      const pushed = registryGlobal.pushPlugin(pluginDir, {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        version: spec.version,
      });
      spec.source = {
        registryId: spec.id,
        installedVersion: pushed.version,
        installedContentHash: pushed.contentHash,
      };
      fs.writeFileSync(specJsonPath, JSON.stringify(spec, null, 2));
    } catch (err) {
      console.error('[smalti] auto-push to global registry failed (plugin still created locally):', err);
    }
    return spec;
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_LIST, async () => {
    const effectiveCwd = getEffectiveCwd(cwd);
    // Clears stale plugins when workspace changes, then reloads from current workspace
    refreshPlugins(effectiveCwd);
    // Self-healing: rescan so plugins added at runtime become visible without restart
    rescanPluginsDir(getLocalPluginsDir(effectiveCwd));
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
      const localDir = getLocalPluginsDir(effectiveCwd);
      if (fs.existsSync(localDir)) {
        for (const entry of fs.readdirSync(localDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const candidate = path.join(localDir, entry.name);
          const spec = readPluginSpec(candidate);
          if (spec && (spec.id === pluginId || spec.name === pluginId)) {
            pluginDir = candidate;
            break;
          }
        }
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
      registry.register(freshSpec, plugin.pluginDir);
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
    const localDir = getLocalPluginsDir(effectiveCwd);

    const pluginDir = path.join(localDir, pluginName);

    // Prevent path traversal — pluginDir must be inside localDir
    if (!pluginDir.startsWith(localDir + path.sep)) {
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

  // ---------------------------------------------------------------------------
  // Global plugin registry IPC handlers
  // ---------------------------------------------------------------------------

  ipcMain.handle(IPC_CHANNELS.PLUGIN_REGISTRY_LIST, async () => {
    try {
      return registryGlobal.listPlugins();
    } catch (err) {
      console.error('[plugin-handlers] registry list error:', (err as Error).message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_REGISTRY_DIFF, async (_e, pluginName: string) => {
    try {
      const effectiveCwd = getEffectiveCwd(cwd);
      const localDir = getLocalPluginsDir(effectiveCwd);
      const pluginDir = path.join(localDir, pluginName);
      const spec = readPluginSpec(pluginDir);
      if (!spec || !spec.source) return null;
      return registryGlobal.diffPlugin(spec.source.registryId, pluginDir, {
        installedVersion: spec.source.installedVersion,
        installedContentHash: spec.source.installedContentHash,
      });
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_REGISTRY_PULL, async (_e, registryId: string, version?: string, targetName?: string, opts?: { overwrite?: boolean }) => {
    try {
      const effectiveCwd = getEffectiveCwd(cwd);
      const localDir = getLocalPluginsDir(effectiveCwd);

      // Resolve the name to use for the workspace directory
      const meta = registryGlobal.getPluginMeta(registryId);
      if (!meta) return { ok: false, reason: 'not-found' };
      const resolvedVersion = version ?? meta.latest;
      const dirName = targetName ?? meta.name;
      const destDir = path.join(localDir, dirName);

      // Name conflict check — skip if caller explicitly wants to overwrite
      if (fs.existsSync(destDir)) {
        if (opts?.overwrite) {
          fs.rmSync(destDir, { recursive: true, force: true });
        } else {
          return { ok: false, reason: 'name-conflict' };
        }
      }

      fs.mkdirSync(destDir, { recursive: true });
      const { contentHash } = registryGlobal.pullPlugin(registryId, resolvedVersion, destDir);

      // Write/update spec.source in the pulled plugin.spec.json
      const spec = readPluginSpec(destDir);
      if (spec) {
        spec.source = {
          registryId,
          installedVersion: resolvedVersion,
          installedContentHash: contentHash,
        };
        fs.writeFileSync(path.join(destDir, 'plugin.spec.json'), JSON.stringify(spec, null, 2));
      }

      return { ok: true, pluginPath: destDir, contentHash };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_REGISTRY_PUSH, async (_e, pluginName: string, opts?: { bumpPatch?: boolean }) => {
    try {
      const effectiveCwd = getEffectiveCwd(cwd);
      const localDir = getLocalPluginsDir(effectiveCwd);
      const pluginDir = path.join(localDir, pluginName);
      const spec = readPluginSpec(pluginDir);
      if (!spec) return { ok: false, error: 'plugin not found' };

      let version = spec.version;
      if (opts?.bumpPatch) {
        const parts = version.split('.').map(Number);
        parts[2] = (parts[2] ?? 0) + 1;
        version = parts.join('.');
        spec.version = version;
      }

      const pushed = registryGlobal.pushPlugin(pluginDir, {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        version,
      });

      spec.source = {
        registryId: spec.id,
        installedVersion: pushed.version,
        installedContentHash: pushed.contentHash,
      };
      fs.writeFileSync(path.join(pluginDir, 'plugin.spec.json'), JSON.stringify(spec, null, 2));

      return { ok: true, version: pushed.version, contentHash: pushed.contentHash };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_REGISTRY_REMOVE, async (_e, registryId: string) => {
    try {
      registryGlobal.removePlugin(registryId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_REGISTRY_MODIFIED_FILES, async (_e, pluginName: string) => {
    try {
      const effectiveCwd = getEffectiveCwd(cwd);
      const localDir = getLocalPluginsDir(effectiveCwd);
      const pluginDir = path.join(localDir, pluginName);
      const spec = readPluginSpec(pluginDir);
      if (!spec || !spec.source) return [];
      return registryGlobal.getModifiedFiles(pluginDir, {
        registryId: spec.source.registryId,
        installedVersion: spec.source.installedVersion,
      });
    } catch (err) {
      console.error('[plugin:registry:modified-files] error:', err);
      return [];
    }
  });
}

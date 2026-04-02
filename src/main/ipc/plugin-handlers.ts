import { IpcMain, app } from 'electron';
import * as fs from 'fs';
import { userInfo } from 'os';
import * as path from 'path';
import { IPC_CHANNELS } from './channels';
import { generatePluginSpec } from '../plugin/spec-generator';
import type { PluginSpec } from '../plugin/spec-generator';
import { generatePluginCode } from '../plugin/code-generator';
import { PluginRegistry } from '../plugin/registry';
import { getActiveWorkspacePath } from './workspace-handlers';

const registry = new PluginRegistry();

function getHome(): string {
  const env = process.env.HOME;
  if (env && env !== '/') return env;
  try { return userInfo().homedir; } catch { /* ignore */ }
  return app.getPath('home');
}

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

export function registerPluginHandlers(ipcMain: IpcMain, cwd: string): void {
  loadRegistryFromDisk(cwd);

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
    // 활성 워크스페이스가 바뀌었을 수 있으므로 로컬 플러그인을 다시 스캔
    const effectiveCwd = getEffectiveCwd(cwd);
    loadDirIntoRegistry(getLocalPluginsDir(effectiveCwd), 'local');
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
    const plugin = registry.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    if (!plugin.active) {
      registry.activate(pluginId, effectiveCwd);
    }
    // Re-read after activation — sandbox exports are on the module
    const activated = registry.get(pluginId);
    if (!activated?.sandbox) throw new Error(`Plugin ${pluginId} failed to activate`);
    const exports = activated.sandbox.run(effectiveCwd);
    if (typeof (exports as Record<string, unknown>).invoke !== 'function') {
      throw new Error(`Plugin ${pluginId} does not export an invoke function`);
    }
    return (exports as { invoke: (t: string, a: Record<string, unknown>) => unknown }).invoke(toolName, args);
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
    const plugin = registry.get(pluginId);
    if (!plugin) return null;
    const htmlPath = path.join(plugin.pluginDir, 'index.html');
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

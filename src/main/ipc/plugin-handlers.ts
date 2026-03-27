import { IpcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from './channels';
import { generatePluginSpec } from '../plugin/spec-generator';
import type { PluginSpec } from '../plugin/spec-generator';
import { generatePluginCode } from '../plugin/code-generator';
import { PluginRegistry } from '../plugin/registry';

const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins');
const registry = new PluginRegistry();

function ensurePluginsDir(): void {
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  }
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

function loadRegistryFromDisk(): void {
  ensurePluginsDir();
  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(PLUGINS_DIR, entry.name);
    const spec = readPluginSpec(pluginDir);
    if (spec && !registry.get(spec.id)) {
      registry.register(spec, pluginDir);
    }
  }
}

export function registerPluginHandlers(ipcMain: IpcMain): void {
  loadRegistryFromDisk();

  // Spec-only: generate and return spec without writing to disk
  ipcMain.handle(IPC_CHANNELS.PLUGIN_GENERATE_SPEC, async (_event, name: string, description: string) => {
    return generatePluginSpec(name, description);
  });

  // Full pipeline: natural language → spec → code → register (with cleanup on failure)
  ipcMain.handle(IPC_CHANNELS.PLUGIN_GENERATE, async (_event, name: string, description: string) => {
    ensurePluginsDir();
    const spec = generatePluginSpec(name, description);
    const pluginDir = path.join(PLUGINS_DIR, spec.name);
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
    return spec;
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_LIST, async () => {
    return registry.list();
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_ACTIVATE, async (_event, pluginId: string, workspacePath?: string) => {
    const cwd = workspacePath || process.cwd();
    const exports = registry.activate(pluginId, cwd);
    return { id: pluginId, active: exports !== null };
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_DEACTIVATE, async (_event, pluginId: string) => {
    registry.deactivate(pluginId);
    return { id: pluginId, active: false };
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_DELETE, async (_event, pluginName: string) => {
    const pluginDir = path.join(PLUGINS_DIR, pluginName);
    // Prevent path traversal — pluginDir must be inside PLUGINS_DIR
    if (!pluginDir.startsWith(PLUGINS_DIR + path.sep)) {
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

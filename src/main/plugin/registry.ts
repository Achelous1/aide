import * as fs from 'fs';
import * as path from 'path';
import type { PluginSpec, PluginTool } from './spec-generator';
import { PluginSandbox } from './sandbox';

interface RegisteredPlugin {
  spec: PluginSpec;
  sandbox: PluginSandbox | null;
  active: boolean;
  pluginDir: string;
  scope: 'local' | 'global';
}

interface RegisteredTool {
  pluginId: string;
  tool: PluginTool;
}

export class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private tools: Map<string, RegisteredTool> = new Map();

  register(spec: PluginSpec, pluginDir: string, scope: 'local' | 'global' = 'local'): void {
    this.plugins.set(spec.id, {
      spec,
      sandbox: new PluginSandbox(pluginDir, spec),
      active: false,
      pluginDir,
      scope,
    });
  }

  unregister(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    if (plugin.active && plugin.sandbox) {
      plugin.sandbox.stop();
    }
    this._deregisterTools(id);
    this.plugins.delete(id);
    return true;
  }

  activate(id: string, workspacePath: string): Record<string, unknown> | null {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.sandbox) return null;
    const exports = plugin.sandbox.run(workspacePath);
    plugin.active = true;
    this._loadTools(plugin);
    return exports;
  }

  deactivate(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    if (plugin.sandbox) {
      plugin.sandbox.stop();
    }
    plugin.active = false;
    this._deregisterTools(id);
    return true;
  }

  list(): Array<PluginSpec & { active: boolean; scope: 'local' | 'global' }> {
    return Array.from(this.plugins.values()).map((p) => ({
      ...p.spec,
      active: p.active,
      scope: p.scope,
    }));
  }

  get(id: string): RegisteredPlugin | undefined {
    return this.plugins.get(id);
  }

  clearLocalPlugins(): void {
    for (const [id, plugin] of this.plugins) {
      if (plugin.scope !== 'local') continue;
      if (plugin.active && plugin.sandbox) {
        plugin.sandbox.stop();
      }
      this._deregisterTools(id);
      this.plugins.delete(id);
    }
  }

  getRegisteredTools(): PluginTool[] {
    return Array.from(this.tools.values()).map((t) => t.tool);
  }

  private _loadTools(plugin: RegisteredPlugin): void {
    const toolManifestPath = path.join(plugin.pluginDir, 'tool.json');
    if (!fs.existsSync(toolManifestPath)) {
      // Fall back to spec tools
      for (const tool of plugin.spec.tools) {
        this.tools.set(`${plugin.spec.id}:${tool.name}`, {
          pluginId: plugin.spec.id,
          tool,
        });
      }
      return;
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(toolManifestPath, 'utf-8'));
      const toolList: PluginTool[] = Array.isArray(manifest.tools) ? manifest.tools : [];
      for (const tool of toolList) {
        this.tools.set(`${plugin.spec.id}:${tool.name}`, {
          pluginId: plugin.spec.id,
          tool,
        });
      }
    } catch {
      // If tool.json is malformed, fall back to spec tools
      for (const tool of plugin.spec.tools) {
        this.tools.set(`${plugin.spec.id}:${tool.name}`, {
          pluginId: plugin.spec.id,
          tool,
        });
      }
    }
  }

  private _deregisterTools(pluginId: string): void {
    for (const key of this.tools.keys()) {
      if (key.startsWith(`${pluginId}:`)) {
        this.tools.delete(key);
      }
    }
  }
}

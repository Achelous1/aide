import type { PluginSpec } from './spec-generator';
import { PluginSandbox } from './sandbox';

interface RegisteredPlugin {
  spec: PluginSpec;
  sandbox: PluginSandbox | null;
  active: boolean;
}

export class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();

  register(spec: PluginSpec, pluginDir: string): void {
    this.plugins.set(spec.id, {
      spec,
      sandbox: new PluginSandbox(pluginDir, spec),
      active: false,
    });
  }

  unregister(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    if (plugin.active && plugin.sandbox) {
      plugin.sandbox.stop();
    }
    this.plugins.delete(id);
    return true;
  }

  activate(id: string, workspacePath: string): Record<string, unknown> | null {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.sandbox) return null;
    const exports = plugin.sandbox.run(workspacePath);
    plugin.active = true;
    return exports;
  }

  deactivate(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    if (plugin.sandbox) {
      plugin.sandbox.stop();
    }
    plugin.active = false;
    return true;
  }

  list(): Array<PluginSpec & { active: boolean }> {
    return Array.from(this.plugins.values()).map((p) => ({
      ...p.spec,
      active: p.active,
    }));
  }

  get(id: string): RegisteredPlugin | undefined {
    return this.plugins.get(id);
  }
}

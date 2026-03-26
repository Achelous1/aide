import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import type { PluginSpec } from './spec-generator';

export class PluginSandbox {
  private context: vm.Context | null = null;
  private spec: PluginSpec;
  private pluginDir: string;

  constructor(pluginDir: string, spec: PluginSpec) {
    this.pluginDir = pluginDir;
    this.spec = spec;
  }

  run(workspacePath: string): Record<string, unknown> {
    const entryPath = path.join(this.pluginDir, this.spec.entryPoint);
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Plugin entry point not found: ${entryPath}`);
    }

    const code = fs.readFileSync(entryPath, 'utf-8');

    // Scoped filesystem API - only allows access within workspace and plugin dir
    const scopedFs = {
      read: (filePath: string): string => {
        const resolved = path.resolve(workspacePath, filePath);
        if (!resolved.startsWith(workspacePath + path.sep) && resolved !== workspacePath) {
          throw new Error('Access denied: path outside workspace');
        }
        return fs.readFileSync(resolved, 'utf-8');
      },
      write: (filePath: string, content: string): void => {
        if (!this.spec.permissions.includes('fs:write')) {
          throw new Error('Permission denied: fs:write not granted');
        }
        const resolved = path.resolve(workspacePath, filePath);
        if (!resolved.startsWith(workspacePath + path.sep) && resolved !== workspacePath) {
          throw new Error('Access denied: path outside workspace');
        }
        fs.writeFileSync(resolved, content);
      },
    };

    const sandbox = {
      module: { exports: {} as Record<string, unknown> },
      exports: {} as Record<string, unknown>,
      require: () => {
        throw new Error('require() is not allowed in plugin sandbox');
      },
      console: {
        log: (...args: unknown[]) => console.log(`[plugin:${this.spec.name}]`, ...args),
        error: (...args: unknown[]) => console.error(`[plugin:${this.spec.name}]`, ...args),
        warn: (...args: unknown[]) => console.warn(`[plugin:${this.spec.name}]`, ...args),
      },
      aide: {
        fs: scopedFs,
        plugin: {
          id: this.spec.id,
          name: this.spec.name,
          version: this.spec.version,
        },
      },
    };

    this.context = vm.createContext(sandbox);
    vm.runInContext(code, this.context, {
      filename: this.spec.entryPoint,
      timeout: 5000,
    });

    return sandbox.module.exports;
  }

  stop(): void {
    this.context = null;
  }
}

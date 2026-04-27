import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import type { PluginSpec } from './spec-generator';

export type PluginEmitter = (event: string, data: Record<string, unknown>) => void;

/**
 * Resolve a workspace-relative path, rewriting a leading `.aide/` segment to
 * `.smalti/` so legacy plugins (v0.1.x) that hardcode `.aide/` as their data
 * directory transparently see the migrated location.
 *
 * Only the first path segment is rewritten — `.aide/` buried inside a deeper
 * path (e.g. `a/.aide/x`) is left untouched because that cannot be a workspace
 * root data directory.
 *
 * Removed in v0.3.x once all generated plugins use `.smalti/` natively.
 */
export function resolveWorkspaceRel(workspacePath: string, filePath: string): string {
  // v0.1.x compat: pre-rebrand plugins hardcode `.aide/` as a workspace data
  // dir. Rewrite first segment to `.smalti/` so legacy plugins see migrated
  // data without needing regeneration.
  const normalized = filePath.replace(/^(\.\/?)?\.aide(\/|$)/, '$1.smalti$2');
  return path.resolve(workspacePath, normalized);
}

function sendToRenderer(channel: string, payload?: unknown): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send(channel, payload);
}

export class PluginSandbox {
  private context: vm.Context | null = null;
  private spec: PluginSpec;
  private pluginDir: string;

  constructor(pluginDir: string, spec: PluginSpec) {
    this.pluginDir = pluginDir;
    this.spec = spec;
  }

  run(workspacePath: string, pluginEmitter?: PluginEmitter): Record<string, unknown> {
    const entryPath = path.join(this.pluginDir, this.spec.entryPoint);
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Plugin entry point not found: ${entryPath}`);
    }

    const code = fs.readFileSync(entryPath, 'utf-8');

    // Scoped filesystem API - only allows access within workspace and plugin dir
    const assertInWorkspace = (resolved: string): void => {
      if (!resolved.startsWith(workspacePath + path.sep) && resolved !== workspacePath) {
        throw new Error('Access denied: path outside workspace');
      }
    };
    const assertRead = (): void => {
      if (!this.spec.permissions.includes('fs:read')) {
        throw new Error('Permission denied: fs:read not granted');
      }
    };
    const assertWrite = (): void => {
      if (!this.spec.permissions.includes('fs:write')) {
        throw new Error('Permission denied: fs:write not granted');
      }
    };

    const scopedFs = {
      // Legacy methods (backward compat)
      read: (filePath: string): string => {
        const resolved = resolveWorkspaceRel(workspacePath, filePath);
        assertInWorkspace(resolved);
        return fs.readFileSync(resolved, 'utf-8');
      },
      write: (filePath: string, content: string): void => {
        assertWrite();
        const resolved = resolveWorkspaceRel(workspacePath, filePath);
        assertInWorkspace(resolved);
        fs.writeFileSync(resolved, content);
      },
      // Standard fs methods
      existsSync: (filePath: string): boolean => {
        const resolved = resolveWorkspaceRel(workspacePath, filePath);
        assertInWorkspace(resolved);
        return fs.existsSync(resolved);
      },
      readFileSync: (filePath: string, encoding?: BufferEncoding): string | Buffer => {
        assertRead();
        const resolved = resolveWorkspaceRel(workspacePath, filePath);
        assertInWorkspace(resolved);
        return encoding ? fs.readFileSync(resolved, encoding) : fs.readFileSync(resolved);
      },
      writeFileSync: (filePath: string, content: string | Buffer): void => {
        assertWrite();
        const resolved = resolveWorkspaceRel(workspacePath, filePath);
        assertInWorkspace(resolved);
        fs.writeFileSync(resolved, content);
      },
      mkdirSync: (dirPath: string, options?: fs.MakeDirectoryOptions): void => {
        assertWrite();
        const resolved = resolveWorkspaceRel(workspacePath, dirPath);
        assertInWorkspace(resolved);
        fs.mkdirSync(resolved, options);
      },
      readdirSync: (dirPath: string, options?: Parameters<typeof fs.readdirSync>[1]): string[] | Buffer[] | fs.Dirent[] => {
        assertRead();
        const resolved = resolveWorkspaceRel(workspacePath, dirPath);
        assertInWorkspace(resolved);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (fs.readdirSync as any)(resolved, options);
      },
      statSync: (filePath: string): fs.Stats => {
        const resolved = resolveWorkspaceRel(workspacePath, filePath);
        assertInWorkspace(resolved);
        return fs.statSync(resolved);
      },
      unlinkSync: (filePath: string): void => {
        assertWrite();
        const resolved = resolveWorkspaceRel(workspacePath, filePath);
        assertInWorkspace(resolved);
        fs.unlinkSync(resolved);
      },
    };

    const hasFsPermission =
      this.spec.permissions.includes('fs:read') || this.spec.permissions.includes('fs:write');

    const sandboxRequire = (id: string): unknown => {
      if (id === 'path') return path;
      if (id === 'fs' && hasFsPermission) return scopedFs;
      throw new Error(`require('${id}') is not allowed in plugin sandbox`);
    };

    const sandbox = {
      module: { exports: {} as Record<string, unknown> },
      exports: {} as Record<string, unknown>,
      require: sandboxRequire,
      Buffer,
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
        files: {
          reveal: (filePath: string) => sendToRenderer(IPC_CHANNELS.FILES_REVEAL, filePath),
          select: (filePath: string) => sendToRenderer(IPC_CHANNELS.FILES_SELECT, filePath),
          refresh: () => sendToRenderer(IPC_CHANNELS.FILES_REFRESH),
        },
        plugins: {
          emit: (event: string, data: Record<string, unknown>) => {
            if (pluginEmitter) pluginEmitter(event, data);
          },
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

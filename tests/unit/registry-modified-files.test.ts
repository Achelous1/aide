import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  pushPlugin,
  getModifiedFiles,
  _setRegistryRootForTesting,
} from '../../src/main/plugin/registry-global';

let sandbox: string;

function mkSandbox(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aide-modified-files-'));
}

function makePluginDir(base: string, name: string, files: Record<string, string> = {}): string {
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.js'), files['index.js'] ?? `// ${name}\nexports.run = () => {};`);
  for (const [rel, content] of Object.entries(files)) {
    if (rel === 'index.js') continue;
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

const BASE_OPTS = {
  id: 'plugin-abc123',
  name: 'my-plugin',
  description: 'test plugin',
  version: '0.1.0',
} as const;

beforeEach(() => {
  sandbox = mkSandbox();
  _setRegistryRootForTesting(path.join(sandbox, 'registry'));
});

afterEach(() => {
  _setRegistryRootForTesting(null);
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('getModifiedFiles', () => {
  it('identical workspace and registry → returns []', () => {
    const workspaceDir = makePluginDir(sandbox, 'my-plugin', {
      'index.js': 'exports.run = () => {};',
    });
    const pushed = pushPlugin(workspaceDir, BASE_OPTS);
    const source = { registryId: BASE_OPTS.id, installedVersion: pushed.version };

    const result = getModifiedFiles(workspaceDir, source);

    expect(result).toEqual([]);
  });

  it('workspace has modified file → returns ["modified src/index.js"]', () => {
    const workspaceDir = makePluginDir(sandbox, 'my-plugin', {
      'index.js': 'exports.run = () => {};',
    });
    const pushed = pushPlugin(workspaceDir, BASE_OPTS);
    const source = { registryId: BASE_OPTS.id, installedVersion: pushed.version };

    // Modify workspace after push
    fs.writeFileSync(path.join(workspaceDir, 'index.js'), 'exports.run = () => { return 42; };');

    const result = getModifiedFiles(workspaceDir, source);

    expect(result).toContain('modified index.js');
    expect(result.length).toBe(1);
  });

  it('workspace has new file → returns ["added <path>"]', () => {
    const workspaceDir = makePluginDir(sandbox, 'my-plugin', {
      'index.js': 'exports.run = () => {};',
    });
    const pushed = pushPlugin(workspaceDir, BASE_OPTS);
    const source = { registryId: BASE_OPTS.id, installedVersion: pushed.version };

    // Add new file after push
    fs.writeFileSync(path.join(workspaceDir, 'utils.js'), 'exports.util = () => {};');

    const result = getModifiedFiles(workspaceDir, source);

    expect(result).toContain('added utils.js');
    expect(result.length).toBe(1);
  });

  it('workspace has deleted file → returns ["removed <path>"]', () => {
    const workspaceDir = makePluginDir(sandbox, 'my-plugin', {
      'index.js': 'exports.run = () => {};',
      'extra.js': 'exports.extra = () => {};',
    });
    const pushed = pushPlugin(workspaceDir, BASE_OPTS);
    const source = { registryId: BASE_OPTS.id, installedVersion: pushed.version };

    // Delete file after push
    fs.rmSync(path.join(workspaceDir, 'extra.js'));

    const result = getModifiedFiles(workspaceDir, source);

    expect(result).toContain('removed extra.js');
    expect(result.length).toBe(1);
  });

  it('registry zip not found for installedVersion → returns []', () => {
    const workspaceDir = makePluginDir(sandbox, 'my-plugin', {
      'index.js': 'exports.run = () => {};',
    });
    // Push so registryId exists in meta but use a non-existent version
    pushPlugin(workspaceDir, BASE_OPTS);
    const source = { registryId: BASE_OPTS.id, installedVersion: '99.99.99' };

    const result = getModifiedFiles(workspaceDir, source);

    expect(result).toEqual([]);
  });

  it('completely unknown registryId (no zip, no meta) → returns []', () => {
    const workspaceDir = makePluginDir(sandbox, 'my-plugin', {
      'index.js': 'exports.run = () => {};',
    });
    const source = { registryId: 'unknown-id-xyz', installedVersion: '0.1.0' };

    const result = getModifiedFiles(workspaceDir, source);

    expect(result).toEqual([]);
  });
});

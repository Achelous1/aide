/**
 * Tests for PLUGIN_REGISTRY_MODIFIED_FILES IPC handler logic.
 *
 * Strategy: extract the handler logic and test it directly against a real
 * sandbox filesystem + _setRegistryRootForTesting (same pattern as
 * plugin-handlers-registry.test.ts).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  pushPlugin,
  getModifiedFiles,
  _setRegistryRootForTesting,
} from '../../src/main/plugin/registry-global';
import type { PluginSpec } from '../../src/main/plugin/spec-generator';

// ---------------------------------------------------------------------------
// Sandbox helpers
// ---------------------------------------------------------------------------

let sandbox: string;
let workspacePluginsDir: string;

function mkSandbox(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aide-handlers-modified-'));
}

function makeWorkspacePlugin(
  name: string,
  extraFiles: Record<string, string> = {},
  specOverride: Partial<PluginSpec> = {},
): { pluginDir: string; spec: PluginSpec } {
  const pluginDir = path.join(workspacePluginsDir, name);
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'index.js'), `// ${name}\nexports.run = () => {};`);
  for (const [rel, content] of Object.entries(extraFiles)) {
    const full = path.join(pluginDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  const spec: PluginSpec = {
    id: specOverride.id ?? `plugin-${name.replace(/[^a-z0-9]/g, '')}`,
    name,
    description: specOverride.description ?? `${name} plugin`,
    version: specOverride.version ?? '0.1.0',
    permissions: [],
    entryPoint: 'src/index.js',
    dependencies: {},
    tools: [],
    ...specOverride,
  };
  fs.writeFileSync(path.join(pluginDir, 'plugin.spec.json'), JSON.stringify(spec, null, 2));
  return { pluginDir, spec };
}

function readSpec(pluginDir: string): PluginSpec {
  return JSON.parse(fs.readFileSync(path.join(pluginDir, 'plugin.spec.json'), 'utf-8')) as PluginSpec;
}

// ---------------------------------------------------------------------------
// Simulate PLUGIN_REGISTRY_MODIFIED_FILES handler logic
// (mirrors what plugin-handlers.ts would wire up)
// ---------------------------------------------------------------------------

async function handleModifiedFiles(pluginName: string): Promise<string[]> {
  try {
    const pluginDir = path.join(workspacePluginsDir, pluginName);
    if (!fs.existsSync(pluginDir)) return [];
    const specPath = path.join(pluginDir, 'plugin.spec.json');
    if (!fs.existsSync(specPath)) return [];
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8')) as PluginSpec;
    if (!spec.source) return [];
    return getModifiedFiles(pluginDir, {
      registryId: spec.source.registryId,
      installedVersion: spec.source.installedVersion,
    });
  } catch (err) {
    console.error('[plugin:registry:modified-files] error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  sandbox = mkSandbox();
  workspacePluginsDir = path.join(sandbox, 'workspace', '.smalti', 'plugins');
  fs.mkdirSync(workspacePluginsDir, { recursive: true });
  _setRegistryRootForTesting(path.join(sandbox, 'registry'));
});

afterEach(() => {
  _setRegistryRootForTesting(null);
  fs.rmSync(sandbox, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PLUGIN_REGISTRY_MODIFIED_FILES handler', () => {
  it('spec has no source block → returns []', async () => {
    const { pluginDir } = makeWorkspacePlugin('no-source');
    // Spec written without source — already the case from makeWorkspacePlugin
    expect(readSpec(pluginDir).source).toBeUndefined();

    const result = await handleModifiedFiles('no-source');

    expect(result).toEqual([]);
  });

  it('spec has source and workspace has changes → returns change list', async () => {
    const { pluginDir, spec } = makeWorkspacePlugin('my-plugin');
    const pushed = pushPlugin(pluginDir, {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      version: spec.version,
    });
    // Write source back to spec
    spec.source = {
      registryId: spec.id,
      installedVersion: pushed.version,
      installedContentHash: pushed.contentHash,
    };
    fs.writeFileSync(path.join(pluginDir, 'plugin.spec.json'), JSON.stringify(spec, null, 2));

    // Modify workspace after push
    fs.writeFileSync(path.join(pluginDir, 'index.js'), 'exports.run = () => { return 42; };');

    const result = await handleModifiedFiles('my-plugin');

    expect(result).toContain('modified index.js');
    expect(result.length).toBeGreaterThan(0);
  });

  it('getModifiedFiles throws → handler catches and returns []', async () => {
    const { pluginDir, spec } = makeWorkspacePlugin('error-plugin');
    const pushed = pushPlugin(pluginDir, {
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
    fs.writeFileSync(path.join(pluginDir, 'plugin.spec.json'), JSON.stringify(spec, null, 2));

    // Make workspaceDir unreadable to provoke an error from getModifiedFiles
    vi.spyOn(fs, 'readdirSync').mockImplementationOnce(() => {
      throw new Error('EPERM: permission denied');
    });

    const result = await handleModifiedFiles('error-plugin');

    expect(result).toEqual([]);
  });

  it('plugin name does not exist on disk → returns []', async () => {
    const result = await handleModifiedFiles('nonexistent-plugin');

    expect(result).toEqual([]);
  });
});

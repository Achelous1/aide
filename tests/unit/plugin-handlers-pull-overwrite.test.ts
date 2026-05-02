/**
 * TDD tests for PLUGIN_REGISTRY_PULL overwrite option.
 *
 * Strategy: mirror the handler logic from plugin-handlers.ts into a local
 * helper (handleRegistryPullWithOpts) that accepts the opts param, then
 * verify the 4 required cases before implementing the real fix.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  pushPlugin,
  pullPlugin,
  getPluginMeta,
  _setRegistryRootForTesting,
} from '../../src/main/plugin/registry-global';
import { generatePluginSpec } from '../../src/main/plugin/spec-generator';
import type { PluginSpec } from '../../src/main/plugin/spec-generator';

// ---------------------------------------------------------------------------
// Sandbox helpers
// ---------------------------------------------------------------------------

let sandbox: string;
let workspacePluginsDir: string;

function mkSandbox(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aide-pull-overwrite-'));
}

function readSpec(pluginDir: string): PluginSpec {
  return JSON.parse(fs.readFileSync(path.join(pluginDir, 'plugin.spec.json'), 'utf-8')) as PluginSpec;
}

/**
 * Push a plugin into the registry (simulates auto-push after generate).
 */
function setupRegistryPlugin(name: string, version = '0.1.0'): { registryId: string; contentHash: string } {
  const spec = generatePluginSpec(name, `${name} plugin`);
  spec.version = version;
  const pluginDir = path.join(sandbox, 'source', name);
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'index.js'), `// ${name} v${version}\nexports.run = () => {};`);
  fs.writeFileSync(path.join(pluginDir, 'plugin.spec.json'), JSON.stringify(spec, null, 2));

  const pushed = pushPlugin(pluginDir, {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    version: spec.version,
  });
  return { registryId: spec.id, contentHash: pushed.contentHash };
}

/**
 * Push a second version of the plugin into the registry.
 */
function pushNewVersion(name: string, version: string, registryId: string): string {
  const pluginDir = path.join(sandbox, 'source', name);
  fs.writeFileSync(path.join(pluginDir, 'index.js'), `// ${name} v${version} updated\nexports.run = () => 'new';`);
  fs.writeFileSync(path.join(pluginDir, 'newfile.js'), `// new file in ${version}`);
  const spec = readSpec(pluginDir);
  spec.version = version;
  fs.writeFileSync(path.join(pluginDir, 'plugin.spec.json'), JSON.stringify(spec, null, 2));

  const pushed = pushPlugin(pluginDir, {
    id: registryId,
    name: spec.name,
    description: spec.description,
    version,
  });
  return pushed.contentHash;
}

// ---------------------------------------------------------------------------
// Handler helper (mirrors plugin-handlers.ts PLUGIN_REGISTRY_PULL logic,
// extended with opts.overwrite — this is what we expect after the fix)
// ---------------------------------------------------------------------------

function handleRegistryPullWithOpts(
  registryId: string,
  version?: string,
  targetName?: string,
  opts?: { overwrite?: boolean },
): { ok: true; pluginPath: string; contentHash: string } | { ok: false; reason?: string; error?: string } {
  try {
    const meta = getPluginMeta(registryId);
    if (!meta) return { ok: false, reason: 'not-found' };
    const resolvedVersion = version ?? meta.latest;
    const dirName = targetName ?? meta.name;
    const destDir = path.join(workspacePluginsDir, dirName);

    if (fs.existsSync(destDir)) {
      if (opts?.overwrite) {
        fs.rmSync(destDir, { recursive: true, force: true });
      } else {
        return { ok: false, reason: 'name-conflict' };
      }
    }

    fs.mkdirSync(destDir, { recursive: true });
    const { contentHash } = pullPlugin(registryId, resolvedVersion, destDir);

    const specPath = path.join(destDir, 'plugin.spec.json');
    if (fs.existsSync(specPath)) {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8')) as PluginSpec;
      spec.source = {
        registryId,
        installedVersion: resolvedVersion,
        installedContentHash: contentHash,
      };
      fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
    }

    return { ok: true, pluginPath: destDir, contentHash };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
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
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PLUGIN_REGISTRY_PULL overwrite option', () => {
  it('case 1: destDir exists + no overwrite → name-conflict (existing behavior preserved)', () => {
    const { registryId } = setupRegistryPlugin('my-plugin');

    // Pre-create the destination directory to simulate an already-installed plugin
    const destDir = path.join(workspacePluginsDir, 'my-plugin');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, 'existing.txt'), 'old content');

    const result = handleRegistryPullWithOpts(registryId, undefined, 'my-plugin');
    expect(result).toEqual({ ok: false, reason: 'name-conflict' });
  });

  it('case 2: destDir exists + overwrite=true → removes old dir and unpacks successfully', () => {
    const { registryId } = setupRegistryPlugin('update-plugin');

    // Pre-create destination with old content
    const destDir = path.join(workspacePluginsDir, 'update-plugin');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, 'old-file.txt'), 'old content that should be removed');

    const result = handleRegistryPullWithOpts(registryId, undefined, 'update-plugin', { overwrite: true });
    expect(result).toMatchObject({ ok: true });
    expect(fs.existsSync(destDir)).toBe(true);
    // old file should be gone
    expect(fs.existsSync(path.join(destDir, 'old-file.txt'))).toBe(false);
  });

  it('case 3: overwrite=true replaces old files with new zip contents', () => {
    const { registryId } = setupRegistryPlugin('evolving-plugin', '0.1.0');

    // First pull — install v0.1.0
    const firstResult = handleRegistryPullWithOpts(registryId, '0.1.0', 'evolving-plugin');
    expect(firstResult).toMatchObject({ ok: true });

    const destDir = path.join(workspacePluginsDir, 'evolving-plugin');

    // Push v0.2.0 with a new file
    const v2Hash = pushNewVersion('evolving-plugin', '0.2.0', registryId);

    // Second pull with overwrite — should update to v0.2.0
    const secondResult = handleRegistryPullWithOpts(registryId, '0.2.0', 'evolving-plugin', { overwrite: true });
    expect(secondResult).toMatchObject({ ok: true, contentHash: v2Hash });

    // New file from v0.2.0 should exist
    expect(fs.existsSync(path.join(destDir, 'newfile.js'))).toBe(true);

    // spec.source should reflect v0.2.0
    const spec = readSpec(destDir);
    expect(spec.source?.installedVersion).toBe('0.2.0');
    expect(spec.source?.installedContentHash).toBe(v2Hash);
  });

  it('case 4: destDir does not exist + overwrite=true → normal fresh unpack (non-destructive)', () => {
    const { registryId } = setupRegistryPlugin('brand-new-plugin');

    // destDir does NOT exist
    const destDir = path.join(workspacePluginsDir, 'brand-new-plugin');
    expect(fs.existsSync(destDir)).toBe(false);

    const result = handleRegistryPullWithOpts(registryId, undefined, 'brand-new-plugin', { overwrite: true });
    expect(result).toMatchObject({ ok: true });
    expect(fs.existsSync(destDir)).toBe(true);
  });
});

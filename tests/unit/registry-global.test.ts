import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  getRegistryRoot,
  ensureRegistryRoot,
  pushPlugin,
  pullPlugin,
  listPlugins,
  getPluginMeta,
  diffPlugin,
  removePlugin,
  _setRegistryRootForTesting,
} from '../../src/main/plugin/registry-global';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let sandbox: string;

function mkSandbox(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aide-registry-'));
}

/** Write minimal plugin files into a directory and return its path. */
function makePluginDir(base: string, name: string, files: Record<string, string> = {}): string {
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  // Default file so the directory is non-empty
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
  id: 'plugin-a1b2c3d4',
  name: 'My Plugin',
  description: 'A test plugin',
  version: '0.1.0',
} as const;

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  sandbox = mkSandbox();
  _setRegistryRootForTesting(path.join(sandbox, 'registry'));
});

afterEach(() => {
  _setRegistryRootForTesting(null);
  fs.rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. getRegistryRoot
// ---------------------------------------------------------------------------

describe('getRegistryRoot', () => {
  it('returns the override path when set via _setRegistryRootForTesting', () => {
    const expected = path.join(sandbox, 'registry');
    expect(getRegistryRoot()).toBe(expected);
  });

  it('resets to default (getHome()-based) path after null reset', () => {
    _setRegistryRootForTesting(null);
    const root = getRegistryRoot();
    // Should be absolute and contain .smalti/registry
    expect(path.isAbsolute(root)).toBe(true);
    expect(root).toMatch(/\.smalti[/\\]registry$/);
    // Put override back for the rest of this test's cleanup
    _setRegistryRootForTesting(path.join(sandbox, 'registry'));
  });
});

// ---------------------------------------------------------------------------
// 2. ensureRegistryRoot
// ---------------------------------------------------------------------------

describe('ensureRegistryRoot', () => {
  it('creates the registry root directory when it does not exist', () => {
    const root = getRegistryRoot();
    expect(fs.existsSync(root)).toBe(false);
    ensureRegistryRoot();
    expect(fs.existsSync(root)).toBe(true);
  });

  it('is idempotent — calling twice does not throw', () => {
    ensureRegistryRoot();
    expect(() => ensureRegistryRoot()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. listPlugins (empty)
// ---------------------------------------------------------------------------

describe('listPlugins (empty registry)', () => {
  it('returns [] when registry is empty', () => {
    expect(listPlugins()).toEqual([]);
  });

  it('returns [] when registry root does not exist yet', () => {
    // Don't call ensureRegistryRoot
    expect(listPlugins()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. pushPlugin (new)
// ---------------------------------------------------------------------------

describe('pushPlugin — new plugin', () => {
  it('creates versions/<version>/plugin.zip and contentHash.txt', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    const result = pushPlugin(pluginDir, BASE_OPTS);

    const root = getRegistryRoot();
    const zipPath = path.join(root, 'plugins', BASE_OPTS.id, 'versions', BASE_OPTS.version, 'plugin.zip');
    const hashPath = path.join(root, 'plugins', BASE_OPTS.id, 'versions', BASE_OPTS.version, 'contentHash.txt');

    expect(fs.existsSync(zipPath)).toBe(true);
    expect(fs.existsSync(hashPath)).toBe(true);
    expect(result.idempotent).toBe(false);
    expect(result.version).toBe(BASE_OPTS.version);
  });

  it('creates meta.json with correct fields', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    pushPlugin(pluginDir, BASE_OPTS);

    const meta = getPluginMeta(BASE_OPTS.id);
    expect(meta).not.toBeNull();
    expect(meta!.id).toBe(BASE_OPTS.id);
    expect(meta!.name).toBe(BASE_OPTS.name);
    expect(meta!.description).toBe(BASE_OPTS.description);
    expect(meta!.latest).toBe(BASE_OPTS.version);
    expect(meta!.history).toHaveLength(1);
    expect(meta!.history[0].version).toBe(BASE_OPTS.version);
    expect(meta!.history[0].contentHash).toBeTruthy();
  });

  it('adds an entry to index.json', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    pushPlugin(pluginDir, BASE_OPTS);

    const plugins = listPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].id).toBe(BASE_OPTS.id);
    expect(plugins[0].name).toBe(BASE_OPTS.name);
    expect(plugins[0].latest).toBe(BASE_OPTS.version);
  });

  it('returned contentHash matches computeDirectoryContentHash output', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    const result = pushPlugin(pluginDir, BASE_OPTS);

    // The stored contentHash.txt should match
    const root = getRegistryRoot();
    const hashPath = path.join(root, 'plugins', BASE_OPTS.id, 'versions', BASE_OPTS.version, 'contentHash.txt');
    const stored = fs.readFileSync(hashPath, 'utf8').trim();
    expect(result.contentHash).toBe(stored);
  });
});

// ---------------------------------------------------------------------------
// 5. pushPlugin (idempotent)
// ---------------------------------------------------------------------------

describe('pushPlugin — idempotent', () => {
  it('returns idempotent:true when same version+hash already exists', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    pushPlugin(pluginDir, BASE_OPTS);

    const result2 = pushPlugin(pluginDir, BASE_OPTS);
    expect(result2.idempotent).toBe(true);
  });

  it('does not modify meta.history when idempotent push occurs', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    pushPlugin(pluginDir, BASE_OPTS);
    pushPlugin(pluginDir, BASE_OPTS);

    const meta = getPluginMeta(BASE_OPTS.id);
    expect(meta!.history).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 6. pushPlugin (immutable violation)
// ---------------------------------------------------------------------------

describe('pushPlugin — immutable violation', () => {
  it('throws when same (id, version) pushed with different content', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin', { 'index.js': '// v1' });
    pushPlugin(pluginDir, BASE_OPTS);

    // Modify the plugin content
    fs.writeFileSync(path.join(pluginDir, 'index.js'), '// v1-modified');

    expect(() => pushPlugin(pluginDir, BASE_OPTS)).toThrow(/version is immutable/);
    expect(() => pushPlugin(pluginDir, BASE_OPTS)).toThrow(
      new RegExp(`${BASE_OPTS.id}@${BASE_OPTS.version}`),
    );
  });
});

// ---------------------------------------------------------------------------
// 7. pushPlugin — new version, latest update
// ---------------------------------------------------------------------------

describe('pushPlugin — new version bumps latest', () => {
  it('updates meta.latest and history when pushing a newer version', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    pushPlugin(pluginDir, BASE_OPTS);

    const v2Dir = makePluginDir(sandbox, 'my-plugin-v2', { 'index.js': '// v2' });
    pushPlugin(v2Dir, { ...BASE_OPTS, version: '0.2.0' });

    const meta = getPluginMeta(BASE_OPTS.id);
    expect(meta!.latest).toBe('0.2.0');
    expect(meta!.history).toHaveLength(2);

    const idx = listPlugins().find((p) => p.id === BASE_OPTS.id);
    expect(idx!.latest).toBe('0.2.0');
  });
});

// ---------------------------------------------------------------------------
// 8. pushPlugin — older version does not downgrade latest
// ---------------------------------------------------------------------------

describe('pushPlugin — older version does not downgrade latest', () => {
  it('adds to history but keeps latest at the higher version', () => {
    ensureRegistryRoot();
    const v2Dir = makePluginDir(sandbox, 'my-plugin-v2', { 'index.js': '// v2' });
    pushPlugin(v2Dir, { ...BASE_OPTS, version: '0.2.0' });

    const v1Dir = makePluginDir(sandbox, 'my-plugin-v1', { 'index.js': '// v1' });
    pushPlugin(v1Dir, { ...BASE_OPTS, version: '0.1.5' });

    const meta = getPluginMeta(BASE_OPTS.id);
    expect(meta!.latest).toBe('0.2.0');
    expect(meta!.history).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 9. pullPlugin
// ---------------------------------------------------------------------------

describe('pullPlugin', () => {
  it('unpacks the zip into destDir with the same file tree', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'src-plugin', {
      'index.js': '// hello',
      'sub/helper.js': '// helper',
    });
    pushPlugin(pluginDir, BASE_OPTS);

    const destDir = path.join(sandbox, 'pulled');
    fs.mkdirSync(destDir, { recursive: true });
    const { contentHash } = pullPlugin(BASE_OPTS.id, BASE_OPTS.version, destDir);

    // Files should exist in destDir
    expect(fs.existsSync(path.join(destDir, 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'sub', 'helper.js'))).toBe(true);
    expect(fs.readFileSync(path.join(destDir, 'index.js'), 'utf8')).toBe('// hello');

    // contentHash should match what was pushed
    const meta = getPluginMeta(BASE_OPTS.id);
    expect(contentHash).toBe(meta!.history[0].contentHash);
  });
});

// ---------------------------------------------------------------------------
// 10. pullPlugin (not found)
// ---------------------------------------------------------------------------

describe('pullPlugin — not found', () => {
  it('throws when plugin id does not exist', () => {
    ensureRegistryRoot();
    const destDir = path.join(sandbox, 'dest');
    fs.mkdirSync(destDir, { recursive: true });
    expect(() => pullPlugin('plugin-nonexistent', '0.1.0', destDir)).toThrow();
  });

  it('throws when version does not exist', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'src-plugin');
    pushPlugin(pluginDir, BASE_OPTS);

    const destDir = path.join(sandbox, 'dest');
    fs.mkdirSync(destDir, { recursive: true });
    expect(() => pullPlugin(BASE_OPTS.id, '9.9.9', destDir)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 11. listPlugins — multiple plugins
// ---------------------------------------------------------------------------

describe('listPlugins — multiple plugins', () => {
  it('returns correct summaries for 2 pushed plugins', () => {
    ensureRegistryRoot();

    const dir1 = makePluginDir(sandbox, 'plugin1', { 'index.js': '// p1' });
    pushPlugin(dir1, { id: 'plugin-aaaaaaaa', name: 'Plugin A', description: 'Desc A', version: '1.0.0' });

    const dir2 = makePluginDir(sandbox, 'plugin2', { 'index.js': '// p2' });
    pushPlugin(dir2, { id: 'plugin-bbbbbbbb', name: 'Plugin B', description: 'Desc B', version: '2.0.0' });

    const list = listPlugins();
    expect(list).toHaveLength(2);

    const a = list.find((p) => p.id === 'plugin-aaaaaaaa');
    const b = list.find((p) => p.id === 'plugin-bbbbbbbb');
    expect(a).toBeDefined();
    expect(a!.latest).toBe('1.0.0');
    expect(b).toBeDefined();
    expect(b!.latest).toBe('2.0.0');
  });
});

// ---------------------------------------------------------------------------
// 12. getPluginMeta
// ---------------------------------------------------------------------------

describe('getPluginMeta', () => {
  it('returns full meta after push', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    const result = pushPlugin(pluginDir, BASE_OPTS);

    const meta = getPluginMeta(BASE_OPTS.id);
    expect(meta).not.toBeNull();
    expect(meta!.history[0].contentHash).toBe(result.contentHash);
    expect(meta!.history[0].publishedAt).toBeTruthy();
  });

  it('returns null when plugin does not exist', () => {
    expect(getPluginMeta('plugin-missing')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 13. diffPlugin — synced
// ---------------------------------------------------------------------------

describe('diffPlugin — synced', () => {
  it('returns synced when workspace matches installed version', () => {
    ensureRegistryRoot();
    const srcDir = makePluginDir(sandbox, 'src-plugin');
    const result = pushPlugin(srcDir, BASE_OPTS);

    // Simulate a pull: workspace has the same files
    const wsDir = makePluginDir(sandbox, 'ws-plugin', {
      'index.js': fs.readFileSync(path.join(srcDir, 'index.js'), 'utf8'),
    });

    const diff = diffPlugin(BASE_OPTS.id, wsDir, {
      installedVersion: BASE_OPTS.version,
      installedContentHash: result.contentHash,
    });

    expect(diff.status).toBe('synced');
    expect(diff.registryId).toBe(BASE_OPTS.id);
    expect(diff.installedVersion).toBe(BASE_OPTS.version);
    expect(diff.latestVersion).toBe(BASE_OPTS.version);
  });
});

// ---------------------------------------------------------------------------
// 14. diffPlugin — update-available
// ---------------------------------------------------------------------------

describe('diffPlugin — update-available', () => {
  it('returns update-available when registry has a newer version', () => {
    ensureRegistryRoot();
    const dir1 = makePluginDir(sandbox, 'plugin-v1', { 'index.js': '// v1' });
    const r1 = pushPlugin(dir1, { ...BASE_OPTS, version: '0.1.0' });

    // Push a newer version
    const dir2 = makePluginDir(sandbox, 'plugin-v2', { 'index.js': '// v2' });
    pushPlugin(dir2, { ...BASE_OPTS, version: '0.2.0' });

    // Workspace still on 0.1.0 and matches installed hash
    const diff = diffPlugin(BASE_OPTS.id, dir1, {
      installedVersion: '0.1.0',
      installedContentHash: r1.contentHash,
    });

    expect(diff.status).toBe('update-available');
    expect(diff.latestVersion).toBe('0.2.0');
  });
});

// ---------------------------------------------------------------------------
// 15. diffPlugin — locally-modified
// ---------------------------------------------------------------------------

describe('diffPlugin — locally-modified', () => {
  it('returns locally-modified when workspace content differs from installed hash', () => {
    ensureRegistryRoot();
    const srcDir = makePluginDir(sandbox, 'src-plugin', { 'index.js': '// original' });
    const result = pushPlugin(srcDir, BASE_OPTS);

    // Simulate workspace modification
    const wsDir = makePluginDir(sandbox, 'ws-plugin', { 'index.js': '// original' });
    // Modify the workspace file
    fs.writeFileSync(path.join(wsDir, 'index.js'), '// modified by user');

    const diff = diffPlugin(BASE_OPTS.id, wsDir, {
      installedVersion: BASE_OPTS.version,
      installedContentHash: result.contentHash,
    });

    expect(diff.status).toBe('locally-modified');
  });

  it('returns locally-modified even when update-available (dirty beats update-available)', () => {
    ensureRegistryRoot();
    const dir1 = makePluginDir(sandbox, 'plugin-v1', { 'index.js': '// v1' });
    const r1 = pushPlugin(dir1, { ...BASE_OPTS, version: '0.1.0' });

    const dir2 = makePluginDir(sandbox, 'plugin-v2', { 'index.js': '// v2' });
    pushPlugin(dir2, { ...BASE_OPTS, version: '0.2.0' });

    // Workspace is on 0.1.0 but also locally modified
    const wsDir = makePluginDir(sandbox, 'ws-modified', { 'index.js': '// user modified' });

    const diff = diffPlugin(BASE_OPTS.id, wsDir, {
      installedVersion: '0.1.0',
      installedContentHash: r1.contentHash,
    });

    expect(diff.status).toBe('locally-modified');
  });
});

// ---------------------------------------------------------------------------
// 16. diffPlugin — unknown
// ---------------------------------------------------------------------------

describe('diffPlugin — unknown', () => {
  it('returns unknown when plugin id is not in the registry', () => {
    ensureRegistryRoot();

    const wsDir = makePluginDir(sandbox, 'ws-plugin');
    const diff = diffPlugin('plugin-nonexistent', wsDir, {
      installedVersion: '0.1.0',
      installedContentHash: 'sha256:abc',
    });

    expect(diff.status).toBe('unknown');
    expect(diff.latestVersion).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 17. removePlugin
// ---------------------------------------------------------------------------

describe('removePlugin', () => {
  it('removes the plugin directory, index entry, and meta', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    pushPlugin(pluginDir, BASE_OPTS);

    expect(listPlugins()).toHaveLength(1);

    removePlugin(BASE_OPTS.id);

    const root = getRegistryRoot();
    expect(fs.existsSync(path.join(root, 'plugins', BASE_OPTS.id))).toBe(false);
    expect(listPlugins()).toHaveLength(0);
    expect(getPluginMeta(BASE_OPTS.id)).toBeNull();
  });

  it('does not throw when removing a non-existent plugin', () => {
    ensureRegistryRoot();
    expect(() => removePlugin('plugin-nonexistent')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 18. Atomic write — tmp file pattern
// ---------------------------------------------------------------------------

describe('atomic write pattern', () => {
  it('index.json is written atomically (no .tmp. file left behind)', () => {
    ensureRegistryRoot();
    const pluginDir = makePluginDir(sandbox, 'my-plugin');
    pushPlugin(pluginDir, BASE_OPTS);

    const root = getRegistryRoot();
    const indexPath = path.join(root, 'index.json');

    // index.json should exist and be valid JSON
    expect(fs.existsSync(indexPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    expect(parsed.version).toBe(1);

    // No temp files should be left behind
    const files = fs.readdirSync(root);
    const tmpFiles = files.filter((f) => f.includes('.tmp.'));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 19. SemVer comparison — lexical vs numeric edge cases
// ---------------------------------------------------------------------------

describe('SemVer comparison', () => {
  it('treats 0.10.0 as greater than 0.9.0 (not lexical)', () => {
    ensureRegistryRoot();

    // Push 0.9.0 first
    const dir9 = makePluginDir(sandbox, 'plugin-9', { 'index.js': '// 0.9.0' });
    pushPlugin(dir9, { ...BASE_OPTS, version: '0.9.0' });

    // Push 0.10.0
    const dir10 = makePluginDir(sandbox, 'plugin-10', { 'index.js': '// 0.10.0' });
    pushPlugin(dir10, { ...BASE_OPTS, version: '0.10.0' });

    const meta = getPluginMeta(BASE_OPTS.id);
    // latest should be 0.10.0, not 0.9.0
    expect(meta!.latest).toBe('0.10.0');
  });

  it('going back from 0.10.0 to 0.2.0 keeps latest at 0.10.0', () => {
    ensureRegistryRoot();

    const dir10 = makePluginDir(sandbox, 'plugin-10', { 'index.js': '// 0.10.0' });
    pushPlugin(dir10, { ...BASE_OPTS, version: '0.10.0' });

    const dir2 = makePluginDir(sandbox, 'plugin-2', { 'index.js': '// 0.2.0' });
    pushPlugin(dir2, { ...BASE_OPTS, version: '0.2.0' });

    const meta = getPluginMeta(BASE_OPTS.id);
    expect(meta!.latest).toBe('0.10.0');
  });
});

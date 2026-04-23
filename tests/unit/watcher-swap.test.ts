/**
 * Regression tests for the Phase 1-C watcher swap.
 *
 * Verifies:
 *   1. setWorkspaceWatcher calls Rust startWatcher with the correct path and
 *      depth=3, not chokidar.
 *   2. setWorkspaceWatcher(null) calls stop() on the previous handle.
 *   3. chokidar is absent from package.json dependencies.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNativeDir(): { nativeDir: string; nodePath: string; cleanup: () => void } {
  const fsHandlersDir = path.resolve(__dirname, '../../src/main/ipc');
  const nativeDir = path.resolve(fsHandlersDir, 'native');
  const nodeFile = `index.${process.platform}-${process.arch}.node`;
  const nodePath = path.join(nativeDir, nodeFile);
  if (!fs.existsSync(nativeDir)) fs.mkdirSync(nativeDir, { recursive: true });
  if (!fs.existsSync(nodePath)) fs.writeFileSync(nodePath, '');
  return {
    nativeDir,
    nodePath,
    cleanup: () => {
      const requireCache = require.cache as Record<string, unknown>;
      delete requireCache[nodePath];
      vi.resetModules();
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('setWorkspaceWatcher uses Rust startWatcher, not chokidar', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-watcher-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('calls startWatcher with correct path and depth=3', async () => {
    const { nodePath, cleanup } = makeNativeDir();

    // Track startWatcher invocations
    let startWatcherPath: string | undefined;
    let startWatcherDepth: number | undefined;
    let startWatcherExclusions: string[] | undefined;
    const stopSpy = vi.fn();

    const mockHandle = { stop: stopSpy };
    const mockNative = {
      readTree: () => [],
      readTreeWithError: () => ({ nodes: [] }),
      readFile: () => '',
      writeFile: () => undefined,
      deletePath: () => undefined,
      startWatcher: (...args: [string, number, string[], unknown]) => {
        startWatcherPath = args[0];
        startWatcherDepth = args[1];
        startWatcherExclusions = args[2];
        return mockHandle;
      },
    };

    const requireCache = require.cache as Record<string, { exports: unknown }>;
    requireCache[nodePath] = { exports: mockNative };

    try {
      const { setWorkspaceWatcher } = await import(
        '../../src/main/ipc/fs-handlers.ts?watcher1=' + Date.now()
      );

      setWorkspaceWatcher(testDir);

      expect(startWatcherPath).toBe(testDir);
      expect(startWatcherDepth).toBe(3);
      expect(Array.isArray(startWatcherExclusions)).toBe(true);
      // All exclusions passed to Rust must be strings (RegExps filtered out)
      expect(startWatcherExclusions!.every((e) => typeof e === 'string')).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('calls stop() when setWorkspaceWatcher is called a second time', async () => {
    const { nodePath, cleanup } = makeNativeDir();

    const stopSpy = vi.fn();
    const mockHandle = { stop: stopSpy };
    const mockNative = {
      readTree: () => [],
      readTreeWithError: () => ({ nodes: [] }),
      readFile: () => '',
      writeFile: () => undefined,
      deletePath: () => undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startWatcher: (...args: any[]) => { void args; return mockHandle; },
    };

    const requireCache = require.cache as Record<string, { exports: unknown }>;
    requireCache[nodePath] = { exports: mockNative };

    try {
      const { setWorkspaceWatcher } = await import(
        '../../src/main/ipc/fs-handlers.ts?watcher2=' + Date.now()
      );

      setWorkspaceWatcher(testDir);
      expect(stopSpy).not.toHaveBeenCalled();

      // Second call should stop the first handle
      setWorkspaceWatcher(null);
      expect(stopSpy).toHaveBeenCalledTimes(1);
    } finally {
      cleanup();
    }
  });
});

describe('chokidar absence regression guard', () => {
  it('chokidar is not in package.json dependencies', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../package.json') as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.['chokidar']).toBeUndefined();
  });

  it('chokidar is not imported in fs-handlers.ts', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/main/ipc/fs-handlers.ts'),
      'utf-8',
    );
    expect(src).not.toContain("from 'chokidar'");
    expect(src).not.toContain('require("chokidar")');
    expect(src).not.toContain("require('chokidar')");
  });

  it('chokidar is not imported in plugin-handlers.ts', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/main/ipc/plugin-handlers.ts'),
      'utf-8',
    );
    expect(src).not.toContain("from 'chokidar'");
    expect(src).not.toContain('require("chokidar")');
    expect(src).not.toContain("require('chokidar')");
  });
});

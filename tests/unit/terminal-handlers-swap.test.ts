/**
 * Regression guards for Phase 3 PR-1: node-pty → Rust PTY swap.
 *
 * These tests verify:
 *   1. spawnPty is called (not node-pty) when TERMINAL_SPAWN fires.
 *   2. PtySession.handle holds the returned PtyHandle.
 *   3. write/resize/kill forward to handle correctly.
 *   4. node-pty is not present in package.json dependencies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';

// ── Mock electron ─────────────────────────────────────────────────────────────
vi.mock('electron', () => {
  type HandlerFn = (...args: unknown[]) => unknown;
  const handlers = new Map<string, HandlerFn>();
  return {
    ipcMain: {
      handle: (channel: string, handler: HandlerFn) => {
        handlers.set(channel, handler);
      },
      _getHandler: (channel: string) => handlers.get(channel),
    },
    BrowserWindow: class {
      static getAllWindows() { return []; }
    },
  };
});

// ── Mock the native module via fs-handlers ────────────────────────────────────
const mockPtyHandle = {
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
};

const mockSpawnPty = vi.fn();

vi.mock('../../src/main/ipc/fs-handlers', async () => {
  const actual = await vi.importActual<typeof import('../../src/main/ipc/fs-handlers')>(
    '../../src/main/ipc/fs-handlers'
  );
  return {
    ...actual,
    getNativeMod: () => ({
      readTree: vi.fn(),
      readTreeWithError: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deletePath: vi.fn(),
      startWatcher: vi.fn(),
      spawnPty: (...args: unknown[]) => mockSpawnPty(...args),
    }),
  };
});

// ── Mock fs ───────────────────────────────────────────────────────────────────
vi.mock('fs', () => ({
  default: {
    existsSync: () => true,
    readdirSync: () => [],
    statSync: () => ({ mtimeMs: 0 }),
  },
  existsSync: () => true,
  readdirSync: () => [],
  statSync: () => ({ mtimeMs: 0 }),
}));

// ── Mock dependencies ─────────────────────────────────────────────────────────
vi.mock('../../src/main/mcp/config-writer', () => ({
  getMcpConfigPath: () => undefined,
}));

vi.mock('../../src/main/agent/agent-config', () => ({
  getAgentSpawnConfig: (_type: string, defaultShell: string) => ({
    command: defaultShell,
    args: [],
    extraEnv: {},
  }),
  COMMON_ENV: {},
}));

vi.mock('../../src/main/utils/home', () => ({
  getHome: () => '/Users/testuser',
}));

vi.mock('../../src/main/agent/status-detector', () => ({
  AgentStatusDetector: class {
    register() {}
    feed() {}
    remove() {}
    notifyUserInput() {}
    onStatus() {}
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getHandlers() {
  const { ipcMain } = await import('electron');
  const { registerTerminalHandlers } = await import('../../src/main/ipc/terminal-handlers');
  registerTerminalHandlers(ipcMain as never);
  return {
    spawn: (ipcMain as never as { _getHandler(c: string): (...a: unknown[]) => unknown })._getHandler('terminal:spawn'),
    write: (ipcMain as never as { _getHandler(c: string): (...a: unknown[]) => unknown })._getHandler('terminal:write'),
    resize: (ipcMain as never as { _getHandler(c: string): (...a: unknown[]) => unknown })._getHandler('terminal:resize'),
    kill: (ipcMain as never as { _getHandler(c: string): (...a: unknown[]) => unknown })._getHandler('terminal:kill'),
  };
}

const fakeEvent = { sender: { id: 1 } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TERMINAL_SPAWN — Rust PTY swap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnPty.mockReturnValue(mockPtyHandle);
  });

  it('calls spawnPty (not node-pty) when TERMINAL_SPAWN fires', async () => {
    const { spawn } = await getHandlers();
    await spawn(fakeEvent, { cwd: '/tmp' });
    expect(mockSpawnPty).toHaveBeenCalledOnce();
  });

  it('returns { ok: true, sessionId } on success', async () => {
    const { spawn } = await getHandlers();
    const result = await spawn(fakeEvent, { cwd: '/tmp' });
    expect(result).toMatchObject({ ok: true });
    expect(typeof (result as { sessionId: string }).sessionId).toBe('string');
  });

  it('spawnPty receives command, args, cwd, envTuples, cols, rows', async () => {
    const { spawn } = await getHandlers();
    await spawn(fakeEvent, { cwd: '/tmp' });

    const [command, args, cwd, envTuples, cols, rows] = mockSpawnPty.mock.calls[0] as [
      string, string[], string, [string, string][], number, number
    ];
    expect(typeof command).toBe('string');
    expect(Array.isArray(args)).toBe(true);
    expect(cwd).toBe('/tmp');
    expect(Array.isArray(envTuples)).toBe(true);
    // Each entry must be a [string, string] tuple
    for (const tuple of envTuples) {
      expect(Array.isArray(tuple)).toBe(true);
      expect(tuple).toHaveLength(2);
      expect(typeof tuple[0]).toBe('string');
      expect(typeof tuple[1]).toBe('string');
    }
    expect(cols).toBe(80);
    expect(rows).toBe(24);
  });

  it('returns { ok: false, error, code, diagnostic } when spawnPty throws', async () => {
    const err = Object.assign(new Error('spawn failed'), { code: 'ENOENT' });
    mockSpawnPty.mockImplementation(() => { throw err; });

    const { spawn } = await getHandlers();
    const result = await spawn(fakeEvent, { cwd: '/tmp' }) as {
      ok: boolean; error: string; code: string; diagnostic: { path: string; home: string };
    };

    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.code).toBe('ENOENT');
    expect(result.diagnostic).toHaveProperty('path');
    expect(result.diagnostic).toHaveProperty('home');
  });
});

describe('TERMINAL_WRITE / RESIZE / KILL — handle forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnPty.mockReturnValue(mockPtyHandle);
  });

  it('write forwards data to handle.write()', async () => {
    const { spawn, write } = await getHandlers();
    const spawnResult = await spawn(fakeEvent, { cwd: '/tmp' }) as { sessionId: string };
    await write({} as never, spawnResult.sessionId, 'hello');
    expect(mockPtyHandle.write).toHaveBeenCalledWith('hello');
  });

  it('resize forwards cols/rows to handle.resize()', async () => {
    const { spawn, resize } = await getHandlers();
    const spawnResult = await spawn(fakeEvent, { cwd: '/tmp' }) as { sessionId: string };
    await resize({} as never, spawnResult.sessionId, 120, 40);
    expect(mockPtyHandle.resize).toHaveBeenCalledWith(120, 40);
  });

  it('kill calls handle.kill() and removes session', async () => {
    const { spawn, kill } = await getHandlers();
    const spawnResult = await spawn(fakeEvent, { cwd: '/tmp' }) as { sessionId: string };
    await kill({} as never, spawnResult.sessionId);
    expect(mockPtyHandle.kill).toHaveBeenCalledOnce();
  });
});

describe('node-pty absence verification', () => {
  it('node-pty is not listed in package.json dependencies', async () => {
    // Use importActual to bypass the fs mock and read real files
    const realFs = await vi.importActual<typeof import('fs')>('fs');
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(realFs.readFileSync(pkgPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps)).not.toContain('node-pty');
  });

  it('terminal-handlers.ts does not import from node-pty', async () => {
    const realFs = await vi.importActual<typeof import('fs')>('fs');
    const src = realFs.readFileSync(
      path.resolve(__dirname, '../../src/main/ipc/terminal-handlers.ts'),
      'utf-8'
    );
    expect(src).not.toContain("from 'node-pty'");
    expect(src).not.toContain('require("node-pty")');
    expect(src).not.toContain("require('node-pty')");
  });
});

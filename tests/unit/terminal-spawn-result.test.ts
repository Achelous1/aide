import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * TDD tests for structured TerminalSpawnResult.
 * Verifies that TERMINAL_SPAWN handler returns { ok, sessionId } on success
 * and { ok, error, code, diagnostic } on failure — never throws.
 *
 * Updated for Phase 3 PR-1: mocks the Rust PTY via getNativeMod() instead of node-pty.
 */

// Mock electron before any imports that reference it
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

// Mock the Rust native module via fs-handlers
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

// Mock fs to avoid real filesystem access
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

// Mock the MCP config writer
vi.mock('../../src/main/mcp/config-writer', () => ({
  getMcpConfigPath: () => undefined,
}));

// Mock agent-config
vi.mock('../../src/main/agent/agent-config', () => ({
  getAgentSpawnConfig: (_type: string, defaultShell: string) => ({
    command: defaultShell,
    args: [],
    extraEnv: {},
  }),
  COMMON_ENV: {},
}));

// Mock home utility
vi.mock('../../src/main/utils/home', () => ({
  getHome: () => '/Users/testuser',
}));

// Mock AgentStatusDetector
vi.mock('../../src/main/agent/status-detector', () => ({
  AgentStatusDetector: class {
    register() {}
    feed() {}
    remove() {}
    notifyUserInput() {}
    onStatus() {}
  },
}));

// ---- Helpers ----------------------------------------------------------------

async function getSpawnHandler() {
  // Reset module registry so our mocks are applied fresh
  const { ipcMain } = await import('electron');
  const { registerTerminalHandlers } = await import('../../src/main/ipc/terminal-handlers');
  registerTerminalHandlers(ipcMain as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ipcMain as any)._getHandler('terminal:spawn');
}

const fakeEvent = { sender: { id: 1 } };

// ---- Tests ------------------------------------------------------------------

describe('TERMINAL_SPAWN handler — TerminalSpawnResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: spawn succeeds
    mockSpawnPty.mockReturnValue(mockPtyHandle);
  });

  it('returns { ok: true, sessionId } when spawnPty succeeds', async () => {
    const handler = await getSpawnHandler();
    const result = await handler(fakeEvent, { cwd: '/tmp' });

    expect(result).toMatchObject({ ok: true });
    expect(typeof result.sessionId).toBe('string');
    expect(result.sessionId).toMatch(/^term-\d+$/);
  });

  it('sessionId increments with each successful spawn', async () => {
    const handler = await getSpawnHandler();
    const r1 = await handler(fakeEvent, { cwd: '/tmp' });
    const r2 = await handler(fakeEvent, { cwd: '/tmp' });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.sessionId).not.toBe(r2.sessionId);
  });

  it('returns { ok: false, error, code, diagnostic } when spawnPty throws ENOENT', async () => {
    const err = Object.assign(new Error('spawn /bin/nonexistent_shell_xyz ENOENT'), { code: 'ENOENT' });
    mockSpawnPty.mockImplementation(() => { throw err; });

    const handler = await getSpawnHandler();
    const result = await handler(fakeEvent, { shell: '/bin/nonexistent_shell_xyz', cwd: '/tmp' });

    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
    expect(result.code).toBe('ENOENT');
    expect(result.diagnostic).toBeDefined();
  });

  it('diagnostic includes path and home fields on spawn failure', async () => {
    const err = Object.assign(new Error('spawn failed'), { code: 'EACCES' });
    mockSpawnPty.mockImplementation(() => { throw err; });

    const handler = await getSpawnHandler();
    const result = await handler(fakeEvent, { cwd: '/tmp' });

    expect(result.ok).toBe(false);
    expect(result.diagnostic).toHaveProperty('path');
    expect(result.diagnostic).toHaveProperty('home');
  });

  it('diagnostic.path is empty string when PATH env is absent', async () => {
    const originalPath = process.env.PATH;
    delete process.env.PATH;

    const err = Object.assign(new Error('spawn failed'), { code: 'ENOENT' });
    mockSpawnPty.mockImplementation(() => { throw err; });

    const handler = await getSpawnHandler();
    const result = await handler(fakeEvent, { cwd: '/tmp' });

    process.env.PATH = originalPath;

    expect(result.ok).toBe(false);
    expect(result.diagnostic.path).toBe('');
  });

  it('does not throw — always returns a result object', async () => {
    const err = new Error('unexpected crash');
    mockSpawnPty.mockImplementation(() => { throw err; });

    const handler = await getSpawnHandler();

    // Handler may return a plain value or a promise — either way must not throw
    const result = await Promise.resolve(handler(fakeEvent, {}));
    expect(result).toMatchObject({ ok: false });
  });
});

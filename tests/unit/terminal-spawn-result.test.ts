import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * TDD tests for structured TerminalSpawnResult.
 * Verifies that TERMINAL_SPAWN handler returns { ok, sessionId } on success
 * and { ok, error, code, diagnostic } on failure — never throws.
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

// Mock node-pty so we can control spawn behaviour per test
const mockOnData = vi.fn();
const mockOnExit = vi.fn();
const mockKill = vi.fn();

const mockPtyProcess = {
  onData: mockOnData,
  onExit: mockOnExit,
  kill: mockKill,
};

const mockPtySpawn = vi.fn();

vi.mock('node-pty', () => ({
  spawn: (...args: unknown[]) => mockPtySpawn(...args),
}));

// Mock fs to avoid real filesystem access
vi.mock('fs', () => ({
  default: {
    existsSync: () => true,
    readdirSync: () => [],
  },
  existsSync: () => true,
  readdirSync: () => [],
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

// Mock getDefaultShell used in terminal-handlers
vi.mock('../../src/main/utils/shell', () => ({
  getDefaultShell: () => '/bin/zsh',
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
    mockPtySpawn.mockReturnValue(mockPtyProcess);
    mockOnData.mockImplementation(() => {});
    mockOnExit.mockImplementation(() => {});
  });

  it('returns { ok: true, sessionId } when pty.spawn succeeds', async () => {
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

  it('returns { ok: false, error, code, diagnostic } when pty.spawn throws ENOENT', async () => {
    const err = Object.assign(new Error('spawn /bin/nonexistent_shell_xyz ENOENT'), { code: 'ENOENT' });
    mockPtySpawn.mockImplementation(() => { throw err; });

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
    mockPtySpawn.mockImplementation(() => { throw err; });

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
    mockPtySpawn.mockImplementation(() => { throw err; });

    const handler = await getSpawnHandler();
    const result = await handler(fakeEvent, { cwd: '/tmp' });

    process.env.PATH = originalPath;

    expect(result.ok).toBe(false);
    expect(result.diagnostic.path).toBe('');
  });

  it('does not throw — always returns a result object', async () => {
    const err = new Error('unexpected crash');
    mockPtySpawn.mockImplementation(() => { throw err; });

    const handler = await getSpawnHandler();

    // Handler may return a plain value or a promise — either way must not throw
    const result = await Promise.resolve(handler(fakeEvent, {}));
    expect(result).toMatchObject({ ok: false });
  });
});

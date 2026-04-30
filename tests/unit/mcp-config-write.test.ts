/**
 * End-to-end mock test for writeMcpConfig — simulates what happens when the
 * packaged smalti app activates a workspace for the first time after release.
 *
 * Validates:
 *   1. ~/.gemini/settings.json gets mcpServers.aide pointing at smalti server
 *   2. ~/.codex/config.toml gets [mcp_servers.aide] pointing at smalti server
 *   3. ~/.claude.json legacy aide entry is stripped (intentional — Claude uses
 *      per-workspace --mcp-config flag, global registration causes double-spawn)
 *   4. ~/.smalti/smalti-mcp-server.js script is written to disk
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Sandbox HOME so we don't touch the real ~/.gemini, ~/.codex, ~/.smalti ──
let sandboxHome: string;

vi.mock('../../src/main/utils/home', () => ({
  getHome: () => sandboxHome,
}));

// ── Mock electron app — config-writer imports app.getPath('userData') ──
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return path.join(sandboxHome, 'Library', 'Application Support', 'smalti');
      return sandboxHome;
    },
  },
}));

// ── Mock the raw server.js bundling so import doesn't try to read real file ──
vi.mock('../../src/main/mcp/server.js?raw', () => ({
  default: '#!/usr/bin/env node\n// stub mcp server for test\nconsole.log("smalti mcp");\n',
}));

// Import lazily after mocks are in place
async function loadConfigWriter() {
  return await import('../../src/main/mcp/config-writer');
}

describe('writeMcpConfig — post-release startup registration', () => {
  beforeEach(() => {
    sandboxHome = fs.mkdtempSync(path.join(os.tmpdir(), 'smalti-mcp-test-'));
    // userData path the mocked Electron app returns — must exist before writeMcpConfig
    fs.mkdirSync(path.join(sandboxHome, 'Library', 'Application Support', 'smalti'), {
      recursive: true,
    });
    vi.resetModules();
  });

  afterEach(() => {
    fs.rmSync(sandboxHome, { recursive: true, force: true });
  });

  it('writes smalti-mcp-server.js to ~/.smalti/', async () => {
    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    const serverPath = path.join(sandboxHome, '.smalti', 'smalti-mcp-server.js');
    expect(fs.existsSync(serverPath)).toBe(true);

    // Sanity: the script content should look like a Node.js MCP entry point
    const content = fs.readFileSync(serverPath, 'utf-8');
    expect(content).toContain('node');
  });

  it('registers mcpServers.smalti in ~/.gemini/settings.json with smalti server path', async () => {
    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    const geminiConfigPath = path.join(sandboxHome, '.gemini', 'settings.json');
    expect(fs.existsSync(geminiConfigPath)).toBe(true);

    const cfg = JSON.parse(fs.readFileSync(geminiConfigPath, 'utf-8'));
    expect(cfg.mcpServers).toBeDefined();
    expect(cfg.mcpServers.smalti).toBeDefined();
    expect(cfg.mcpServers.smalti.args[0]).toBe(
      path.join(sandboxHome, '.smalti', 'smalti-mcp-server.js'),
    );
  });

  it('registers [mcp_servers.smalti] in ~/.codex/config.toml with smalti server path', async () => {
    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    const codexConfigPath = path.join(sandboxHome, '.codex', 'config.toml');
    expect(fs.existsSync(codexConfigPath)).toBe(true);

    const content = fs.readFileSync(codexConfigPath, 'utf-8');
    expect(content).toContain('[mcp_servers.smalti]');
    // Path is written via JSON.stringify in TOML, which escapes \ → \\ on
    // Windows. Compare against the JSON-stringified form so the assertion
    // works on both win32 and posix.
    const expected = JSON.stringify(path.join(sandboxHome, '.smalti', 'smalti-mcp-server.js'));
    expect(content).toContain(expected);
  });

  it('strips any pre-existing aide entry from ~/.claude.json (intentional cleanup)', async () => {
    // Seed legacy ~/.claude.json with an aide MCP entry
    const claudeConfigPath = path.join(sandboxHome, '.claude.json');
    fs.writeFileSync(
      claudeConfigPath,
      JSON.stringify(
        {
          mcpServers: {
            aide: { command: 'node', args: ['/old/path/aide-mcp-server.js'] },
            other: { command: 'node', args: ['/other/server.js'] },
          },
        },
        null,
        2,
      ),
    );

    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    // After write: aide must be gone (Claude is launched with --mcp-config per workspace,
    // global registration causes double-spawn). Other servers untouched.
    const cfg = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf-8'));
    expect(cfg.mcpServers).toBeDefined();
    expect(cfg.mcpServers.aide).toBeUndefined();
    expect(cfg.mcpServers.other).toBeDefined();
    expect(cfg.mcpServers.other.args[0]).toBe('/other/server.js');
  });

  it('strips any pre-existing aide entry from ~/.mcp.json (HOME-level cleanup)', async () => {
    const homeMcpPath = path.join(sandboxHome, '.mcp.json');
    fs.writeFileSync(
      homeMcpPath,
      JSON.stringify({ mcpServers: { aide: { command: 'node', args: ['/x'] } } }, null, 2),
    );

    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    if (fs.existsSync(homeMcpPath)) {
      const cfg = JSON.parse(fs.readFileSync(homeMcpPath, 'utf-8'));
      expect(cfg.mcpServers?.aide).toBeUndefined();
    }
    // (file may also be deleted entirely if aide was the only entry — both outcomes are correct)
  });

  it('is idempotent — running twice produces the same final state', async () => {
    const { writeMcpConfig } = await loadConfigWriter();

    writeMcpConfig(path.join(sandboxHome, 'workspace'));
    const geminiAfter1 = fs.readFileSync(
      path.join(sandboxHome, '.gemini', 'settings.json'),
      'utf-8',
    );
    const codexAfter1 = fs.readFileSync(
      path.join(sandboxHome, '.codex', 'config.toml'),
      'utf-8',
    );

    writeMcpConfig(path.join(sandboxHome, 'workspace'));
    const geminiAfter2 = fs.readFileSync(
      path.join(sandboxHome, '.gemini', 'settings.json'),
      'utf-8',
    );
    const codexAfter2 = fs.readFileSync(
      path.join(sandboxHome, '.codex', 'config.toml'),
      'utf-8',
    );

    expect(geminiAfter2).toBe(geminiAfter1);
    expect(codexAfter2).toBe(codexAfter1);
  });

  it('migrates legacy aide entry to smalti in ~/.gemini/settings.json', async () => {
    const geminiConfigPath = path.join(sandboxHome, '.gemini', 'settings.json');
    fs.mkdirSync(path.dirname(geminiConfigPath), { recursive: true });
    fs.writeFileSync(
      geminiConfigPath,
      JSON.stringify(
        {
          mcpServers: {
            aide: { command: 'node', args: ['/old/aide-mcp-server.js'] },
            other: { command: 'node', args: ['/other/server.js'] },
          },
        },
        null,
        2,
      ),
    );

    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    const cfg = JSON.parse(fs.readFileSync(geminiConfigPath, 'utf-8'));
    // Legacy aide entry must be gone
    expect(cfg.mcpServers.aide).toBeUndefined();
    // smalti entry must be present with new path
    expect(cfg.mcpServers.smalti).toBeDefined();
    expect(cfg.mcpServers.smalti.args[0]).toBe(
      path.join(sandboxHome, '.smalti', 'smalti-mcp-server.js'),
    );
    // Unrelated servers preserved
    expect(cfg.mcpServers.other).toBeDefined();
    expect(cfg.mcpServers.other.args[0]).toBe('/other/server.js');
  });

  it('migrates legacy [mcp_servers.aide] section to smalti in ~/.codex/config.toml', async () => {
    const codexConfigPath = path.join(sandboxHome, '.codex', 'config.toml');
    fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
    fs.writeFileSync(
      codexConfigPath,
      [
        '[mcp_servers.aide]',
        'command = "node"',
        'args = ["/old/aide-mcp-server.js"]',
        '',
        '[mcp_servers.other]',
        'command = "python"',
        'args = ["other.py"]',
      ].join('\n'),
    );

    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    const content = fs.readFileSync(codexConfigPath, 'utf-8');
    // Legacy aide section must be gone
    expect(content).not.toContain('[mcp_servers.aide]');
    // smalti section must be present
    expect(content).toContain('[mcp_servers.smalti]');
    // Unrelated section preserved
    expect(content).toContain('[mcp_servers.other]');
  });

  it('preserves unrelated servers in ~/.gemini/settings.json (merge, not overwrite)', async () => {
    const geminiConfigPath = path.join(sandboxHome, '.gemini', 'settings.json');
    fs.mkdirSync(path.dirname(geminiConfigPath), { recursive: true });
    fs.writeFileSync(
      geminiConfigPath,
      JSON.stringify(
        {
          mcpServers: { sentry: { command: 'sentry-cli', args: ['serve'] } },
          someOtherKey: 'preserve-me',
        },
        null,
        2,
      ),
    );

    const { writeMcpConfig } = await loadConfigWriter();
    writeMcpConfig(path.join(sandboxHome, 'workspace'));

    const cfg = JSON.parse(fs.readFileSync(geminiConfigPath, 'utf-8'));
    expect(cfg.mcpServers.sentry).toBeDefined();
    expect(cfg.mcpServers.sentry.command).toBe('sentry-cli');
    expect(cfg.mcpServers.smalti).toBeDefined();
    expect(cfg.someOtherKey).toBe('preserve-me');
  });
});

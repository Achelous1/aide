/**
 * AC-5: MCP global config migration tests.
 *
 * Covers cases not already tested in mcp-config-write.test.ts and
 * unregister-smalti-claude-global.test.ts:
 *
 *   1. ~/.claude.json — aide entry deleted, other servers preserved (via writeMcpConfig).
 *   2. ~/.gemini/settings.json — aide → smalti replacement, other servers preserved.
 *   3. ~/.codex/config.toml — aide section → smalti section, other sections + array
 *      values preserved (TOML alternation safety: args = ["x"] must survive).
 *   4. removeTomlSection TOML alternation: adjacent section with array value not corrupted.
 *
 * Uses vi.mock to sandbox HOME and Electron app so no real config files are touched.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let sandboxHome: string;

vi.mock('../../src/main/utils/home', () => ({
  getHome: () => sandboxHome,
}));

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData')
        return path.join(sandboxHome, 'Library', 'Application Support', 'Smalti');
      return sandboxHome;
    },
  },
}));

vi.mock('../../src/main/mcp/server.js?raw', () => ({
  default: '#!/usr/bin/env node\n// stub\n',
}));

async function loadConfigWriter() {
  return await import('../../src/main/mcp/config-writer');
}

// ── shared setup ────────────────────────────────────────────────────────────

function makeCodexConfig(...sections: string[]): string {
  return sections.join('\n\n');
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('config-writer migration — AC-5', () => {
  beforeEach(() => {
    sandboxHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-migration-test-'));
    fs.mkdirSync(
      path.join(sandboxHome, 'Library', 'Application Support', 'Smalti'),
      { recursive: true },
    );
    vi.resetModules();
  });

  afterEach(() => {
    fs.rmSync(sandboxHome, { recursive: true, force: true });
    vi.resetModules();
  });

  // ── 1. ~/.claude.json: aide removed, other server preserved ─────────────

  describe('~/.claude.json', () => {
    it('removes aide entry and preserves other servers when writeMcpConfig runs', async () => {
      const claudePath = path.join(sandboxHome, '.claude.json');
      fs.writeFileSync(
        claudePath,
        JSON.stringify(
          {
            mcpServers: {
              aide: { command: 'node', args: ['/old/aide-mcp-server.js'] },
              sentry: { command: 'sentry-mcp', args: ['--port', '3000'] },
            },
          },
          null,
          2,
        ),
      );

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const cfg = JSON.parse(fs.readFileSync(claudePath, 'utf-8'));
      expect(cfg.mcpServers.aide).toBeUndefined();
      expect(cfg.mcpServers.sentry).toBeDefined();
      expect(cfg.mcpServers.sentry.command).toBe('sentry-mcp');
    });

    it('removes both aide and smalti entries via unregisterSmaltiFromJsonConfig', async () => {
      const claudePath = path.join(sandboxHome, '.claude.json');
      fs.writeFileSync(
        claudePath,
        JSON.stringify({
          mcpServers: {
            aide: { command: 'node', args: ['/old'] },
            smalti: { command: 'node', args: ['/new'] },
            other: { command: 'py', args: ['run.py'] },
          },
        }),
      );

      const { unregisterSmaltiFromJsonConfig } = await loadConfigWriter();
      unregisterSmaltiFromJsonConfig(claudePath);

      const cfg = JSON.parse(fs.readFileSync(claudePath, 'utf-8'));
      expect(cfg.mcpServers.aide).toBeUndefined();
      expect(cfg.mcpServers.smalti).toBeUndefined();
      expect(cfg.mcpServers.other).toBeDefined();
    });
  });

  // ── 2. ~/.gemini/settings.json: aide → smalti, other servers preserved ──

  describe('~/.gemini/settings.json', () => {
    it('replaces aide entry with smalti entry, preserves other servers', async () => {
      const geminiPath = path.join(sandboxHome, '.gemini', 'settings.json');
      fs.mkdirSync(path.dirname(geminiPath), { recursive: true });
      fs.writeFileSync(
        geminiPath,
        JSON.stringify(
          {
            mcpServers: {
              aide: { command: 'node', args: ['/old/aide-mcp-server.js'] },
              another: { command: 'bun', args: ['serve.ts'] },
            },
            theme: 'dark',
          },
          null,
          2,
        ),
      );

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const cfg = JSON.parse(fs.readFileSync(geminiPath, 'utf-8'));
      expect(cfg.mcpServers.aide).toBeUndefined();
      expect(cfg.mcpServers.smalti).toBeDefined();
      expect(cfg.mcpServers.smalti.args[0]).toContain('smalti-mcp-server.js');
      expect(cfg.mcpServers.another).toBeDefined();
      expect(cfg.mcpServers.another.command).toBe('bun');
      // Top-level non-mcpServers key preserved
      expect(cfg.theme).toBe('dark');
    });

    it('creates settings.json if absent and registers smalti entry', async () => {
      const geminiPath = path.join(sandboxHome, '.gemini', 'settings.json');
      expect(fs.existsSync(geminiPath)).toBe(false);

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const cfg = JSON.parse(fs.readFileSync(geminiPath, 'utf-8'));
      expect(cfg.mcpServers.smalti).toBeDefined();
      expect(cfg.mcpServers.aide).toBeUndefined();
    });
  });

  // ── 3. ~/.codex/config.toml: aide section → smalti, other sections survive

  describe('~/.codex/config.toml', () => {
    it('replaces [mcp_servers.aide] with [mcp_servers.smalti], preserves other sections', async () => {
      const codexPath = path.join(sandboxHome, '.codex', 'config.toml');
      fs.mkdirSync(path.dirname(codexPath), { recursive: true });
      fs.writeFileSync(
        codexPath,
        makeCodexConfig(
          '[mcp_servers.aide]\ncommand = "node"\nargs = ["/old/aide-mcp-server.js"]',
          '[mcp_servers.other]\ncommand = "python"\nargs = ["other.py"]',
        ),
      );

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const content = fs.readFileSync(codexPath, 'utf-8');
      expect(content).not.toContain('[mcp_servers.aide]');
      expect(content).toContain('[mcp_servers.smalti]');
      expect(content).toContain('[mcp_servers.other]');
      expect(content).toContain('python');
    });

    // ── 4. TOML alternation safety: args = ["x"] adjacent to aide section ──
    //
    // CLAUDE.md pitfall: `[^[]*` regex stops at first `[` inside array values.
    // The current removeTomlSection uses line-by-line parsing to avoid this.
    // Verify that `args = ["server.js"]` in the neighbouring section is intact.

    it('preserves args = ["..."] array values in sections adjacent to removed [mcp_servers.aide]', async () => {
      const codexPath = path.join(sandboxHome, '.codex', 'config.toml');
      fs.mkdirSync(path.dirname(codexPath), { recursive: true });
      // The adjacent section has an array value with `[` inside — this is what
      // a naive character-class regex would break on.
      fs.writeFileSync(
        codexPath,
        [
          '[mcp_servers.aide]',
          'command = "node"',
          'args = ["/old/server.js"]',
          '',
          '[mcp_servers.keep]',
          'command = "deno"',
          'args = ["run", "--allow-all", "server.js"]',
        ].join('\n'),
      );

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const content = fs.readFileSync(codexPath, 'utf-8');
      // aide section gone
      expect(content).not.toContain('[mcp_servers.aide]');
      // keep section fully intact
      expect(content).toContain('[mcp_servers.keep]');
      expect(content).toContain('command = "deno"');
      expect(content).toContain('args = ["run", "--allow-all", "server.js"]');
    });

    it('handles config.toml with only [mcp_servers.aide] — produces valid smalti-only file', async () => {
      const codexPath = path.join(sandboxHome, '.codex', 'config.toml');
      fs.mkdirSync(path.dirname(codexPath), { recursive: true });
      fs.writeFileSync(
        codexPath,
        '[mcp_servers.aide]\ncommand = "node"\nargs = ["/old/aide-mcp-server.js"]\n',
      );

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const content = fs.readFileSync(codexPath, 'utf-8');
      expect(content).not.toContain('[mcp_servers.aide]');
      expect(content).toContain('[mcp_servers.smalti]');
    });

    it('creates config.toml if absent and writes [mcp_servers.smalti]', async () => {
      const codexPath = path.join(sandboxHome, '.codex', 'config.toml');
      expect(fs.existsSync(codexPath)).toBe(false);

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const content = fs.readFileSync(codexPath, 'utf-8');
      expect(content).toContain('[mcp_servers.smalti]');
    });

    it('preserves sub-sections like [mcp_servers.aide.env] when removing aide (line-by-line safety)', async () => {
      const codexPath = path.join(sandboxHome, '.codex', 'config.toml');
      fs.mkdirSync(path.dirname(codexPath), { recursive: true });
      fs.writeFileSync(
        codexPath,
        [
          '[mcp_servers.aide]',
          'command = "node"',
          'args = ["/old/server.js"]',
          '',
          '[mcp_servers.aide.env]',
          'AIDE_WORKSPACE = "/projects/mine"',
          '',
          '[mcp_servers.unrelated]',
          'command = "go"',
          'args = ["run", "main.go"]',
        ].join('\n'),
      );

      const { writeMcpConfig } = await loadConfigWriter();
      writeMcpConfig(path.join(sandboxHome, 'workspace'));

      const content = fs.readFileSync(codexPath, 'utf-8');
      // Both aide and aide.env must be gone
      expect(content).not.toContain('[mcp_servers.aide]');
      expect(content).not.toContain('[mcp_servers.aide.env]');
      // Unrelated section must survive
      expect(content).toContain('[mcp_servers.unrelated]');
      expect(content).toContain('command = "go"');
      // New smalti section present
      expect(content).toContain('[mcp_servers.smalti]');
    });
  });
});

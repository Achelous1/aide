/**
 * TDD: IPC protocol rebrand (D3) — backward compat
 *
 * Verifies that:
 * 1. New smalti-* protocols are registered
 * 2. Legacy aide-* protocols are retained as backward-compat aliases
 * 3. Plugin URL generation uses smalti-plugin:// by default
 * 4. CDN protocol references use smalti-cdn://
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const MAIN = path.resolve(ROOT, 'src/main/index.ts');
const PROTOCOL_FILE = path.resolve(ROOT, 'src/main/plugin/protocol.ts');
const CDN_PROTOCOL_FILE = path.resolve(ROOT, 'src/main/plugin/cdn-protocol.ts');
const PLUGIN_VIEW_FILE = path.resolve(ROOT, 'src/renderer/components/plugin/PluginView.tsx');
const MCP_SERVER_FILE = path.resolve(ROOT, 'src/main/mcp/server.js');

describe('IPC protocol rebrand (D3) — backward compat', () => {
  // Protocol registrations are spread across index.ts, protocol.ts, cdn-protocol.ts
  const allProtocolSources = [MAIN, PROTOCOL_FILE, CDN_PROTOCOL_FILE]
    .map((f) => fs.readFileSync(f, 'utf-8'))
    .join('\n');

  it.each(['smalti', 'smalti-plugin', 'smalti-cdn'])(
    'registers new protocol: %s',
    (name) => {
      expect(allProtocolSources).toMatch(
        new RegExp(`protocol\\.handle\\s*\\(\\s*['"]${name}['"]`),
      );
    },
  );

  it.each(['aide', 'aide-plugin', 'aide-cdn'])(
    'retains legacy protocol for backward compat: %s',
    (name) => {
      expect(allProtocolSources).toMatch(
        new RegExp(`protocol\\.handle\\s*\\(\\s*['"]${name}['"]`),
      );
    },
  );
});

describe('plugin URL defaults use smalti-plugin://', () => {
  it('new plugin URLs use smalti-plugin://', () => {
    const c = fs.readFileSync(PLUGIN_VIEW_FILE, 'utf-8');
    expect(c).toMatch(/smalti-plugin:\/\//);
  });

  it('protocol handler registers smalti-plugin scheme', () => {
    const c = fs.readFileSync(PROTOCOL_FILE, 'utf-8');
    expect(c).toMatch(/smalti-plugin/);
  });
});

describe('CDN protocol rebrand uses smalti-cdn://', () => {
  it('cdn-protocol.ts registers smalti-cdn handler', () => {
    const c = fs.readFileSync(CDN_PROTOCOL_FILE, 'utf-8');
    expect(c).toMatch(/smalti-cdn/);
  });

  it('mcp/server.js references smalti-cdn:// in plugin instructions', () => {
    const c = fs.readFileSync(MCP_SERVER_FILE, 'utf-8');
    expect(c).toMatch(/smalti-cdn:\/\//);
  });
});

describe('scheme registration includes smalti-* privileges', () => {
  it('protocol.ts registerSchemesAsPrivileged includes smalti-plugin', () => {
    const c = fs.readFileSync(PROTOCOL_FILE, 'utf-8');
    expect(c).toMatch(/scheme:\s*['"]smalti-plugin['"]/);
  });

  it('protocol.ts registerSchemesAsPrivileged includes smalti-cdn', () => {
    const c = fs.readFileSync(PROTOCOL_FILE, 'utf-8');
    expect(c).toMatch(/scheme:\s*['"]smalti-cdn['"]/);
  });

  it('protocol.ts retains aide-plugin scheme registration for backward compat', () => {
    const c = fs.readFileSync(PROTOCOL_FILE, 'utf-8');
    expect(c).toMatch(/scheme:\s*['"]aide-plugin['"]/);
  });

  it('protocol.ts retains aide-cdn scheme registration for backward compat', () => {
    const c = fs.readFileSync(PROTOCOL_FILE, 'utf-8');
    expect(c).toMatch(/scheme:\s*['"]aide-cdn['"]/);
  });
});

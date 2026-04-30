import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { unregisterSmaltiFromJsonConfig } from '../../src/main/mcp/config-writer';

describe('unregisterSmaltiFromJsonConfig', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smalti-unreg-test-'));
    configPath = path.join(tmpDir, '.claude.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does nothing when the config file does not exist', () => {
    expect(() => unregisterSmaltiFromJsonConfig(configPath)).not.toThrow();
    expect(fs.existsSync(configPath)).toBe(false);
  });

  it('removes the aide entry when it is the only mcpServer', () => {
    const config = {
      mcpServers: {
        aide: { command: 'node', args: ['/path/to/server.js'] },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    unregisterSmaltiFromJsonConfig(configPath);

    const result = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers).toBeUndefined();
  });

  it('removes only the aide entry, preserving other mcpServers', () => {
    const config = {
      mcpServers: {
        aide: { command: 'node', args: ['server.js'] },
        userCustom: { command: 'python', args: ['custom.py'] },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    unregisterSmaltiFromJsonConfig(configPath);

    const result = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers.aide).toBeUndefined();
    expect(result.mcpServers.userCustom).toEqual({ command: 'python', args: ['custom.py'] });
  });

  it('preserves other top-level keys', () => {
    const config = {
      mcpServers: { aide: { command: 'node', args: ['server.js'] } },
      model: 'claude-opus-4-7',
      permissions: { allow: ['Bash'] },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    unregisterSmaltiFromJsonConfig(configPath);

    const result = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers).toBeUndefined();
    expect(result.model).toBe('claude-opus-4-7');
    expect(result.permissions).toEqual({ allow: ['Bash'] });
  });

  it('is a no-op when mcpServers has no aide key', () => {
    const config = {
      mcpServers: { other: { command: 'node', args: ['other.js'] } },
    };
    const raw = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, raw);

    unregisterSmaltiFromJsonConfig(configPath);

    expect(fs.readFileSync(configPath, 'utf-8')).toBe(raw);
  });

  it('is a no-op when mcpServers key is absent', () => {
    const config = { model: 'claude-opus-4-7' };
    const raw = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, raw);

    unregisterSmaltiFromJsonConfig(configPath);

    expect(fs.readFileSync(configPath, 'utf-8')).toBe(raw);
  });

  it('leaves a corrupt config file untouched', () => {
    const raw = '{invalid json!!!';
    fs.writeFileSync(configPath, raw);

    expect(() => unregisterSmaltiFromJsonConfig(configPath)).not.toThrow();
    expect(fs.readFileSync(configPath, 'utf-8')).toBe(raw);
  });

  it('is idempotent when called twice', () => {
    const config = {
      mcpServers: {
        aide: { command: 'node', args: ['server.js'] },
        other: { command: 'python', args: ['other.py'] },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    unregisterSmaltiFromJsonConfig(configPath);
    unregisterSmaltiFromJsonConfig(configPath);

    const result = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers.aide).toBeUndefined();
    expect(result.mcpServers.other).toBeDefined();
  });

  it('removes the smalti entry too (defensive cleanup)', () => {
    const config = {
      mcpServers: {
        smalti: { command: 'node', args: ['/path/to/smalti-mcp-server.js'] },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    unregisterSmaltiFromJsonConfig(configPath);

    const result = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers).toBeUndefined();
  });
});

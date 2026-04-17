import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { migrateProjectMcpJson } from '../../src/main/ipc/workspace-handlers';

describe('migrateProjectMcpJson', () => {
  let tmpDir: string;
  let mcpPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-migrate-test-'));
    mcpPath = path.join(tmpDir, '.mcp.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does nothing when .mcp.json does not exist', () => {
    migrateProjectMcpJson(tmpDir);
    expect(fs.existsSync(mcpPath)).toBe(false);
  });

  it('deletes .mcp.json when it only contains mcpServers.aide', () => {
    const config = {
      mcpServers: {
        aide: { command: 'node', args: ['server.js'], env: { AIDE_WORKSPACE: tmpDir } },
      },
    };
    fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2));

    migrateProjectMcpJson(tmpDir);

    expect(fs.existsSync(mcpPath)).toBe(false);
  });

  it('removes aide key but preserves other servers', () => {
    const config = {
      mcpServers: {
        aide: { command: 'node', args: ['server.js'] },
        other: { command: 'python', args: ['other.py'] },
      },
    };
    fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2));

    migrateProjectMcpJson(tmpDir);

    expect(fs.existsSync(mcpPath)).toBe(true);
    const result = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    expect(result.mcpServers.aide).toBeUndefined();
    expect(result.mcpServers.other).toEqual({ command: 'python', args: ['other.py'] });
  });

  it('does nothing when .mcp.json has no mcpServers key', () => {
    const config = { someOtherKey: 'value' };
    fs.writeFileSync(mcpPath, JSON.stringify(config));

    migrateProjectMcpJson(tmpDir);

    const result = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    expect(result).toEqual(config);
  });

  it('does nothing when mcpServers has no aide key', () => {
    const config = {
      mcpServers: { other: { command: 'python', args: ['other.py'] } },
    };
    fs.writeFileSync(mcpPath, JSON.stringify(config));

    migrateProjectMcpJson(tmpDir);

    const result = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    expect(result).toEqual(config);
  });

  it('removes mcpServers but preserves other top-level keys when aide is the only server', () => {
    const config = {
      mcpServers: {
        aide: { command: 'node', args: ['server.js'] },
      },
      customSetting: true,
    };
    fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2));

    migrateProjectMcpJson(tmpDir);

    expect(fs.existsSync(mcpPath)).toBe(true);
    const result = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    expect(result.mcpServers).toBeUndefined();
    expect(result.customSetting).toBe(true);
  });

  it('does not crash on corrupt .mcp.json', () => {
    fs.writeFileSync(mcpPath, '{invalid json!!!');

    expect(() => migrateProjectMcpJson(tmpDir)).not.toThrow();
    // File left as-is
    expect(fs.readFileSync(mcpPath, 'utf-8')).toBe('{invalid json!!!');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const SERVER_PATH = path.resolve(__dirname, '../../src/main/mcp/server.js');

function callToolsList(cwd: string): { tools: Array<Record<string, unknown>> } {
  const req = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n';
  const result = spawnSync(process.execPath, [SERVER_PATH], {
    cwd,
    input: req,
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  // Decode stdout from a Buffer in one pass — Node 20's spawnSync + encoding:'utf-8'
  // has truncated multi-byte UTF-8 output across chunk boundaries on some platforms.
  const stdout = Buffer.isBuffer(result.stdout)
    ? result.stdout.toString('utf-8')
    : String(result.stdout ?? '');
  const stderr = Buffer.isBuffer(result.stderr)
    ? result.stderr.toString('utf-8')
    : String(result.stderr ?? '');
  const lines = stdout.split('\n').filter(Boolean);
  for (const line of lines) {
    const msg = JSON.parse(line);
    if (msg.id === 1 && msg.result) return msg.result;
  }
  throw new Error(`No response: stdout=${stdout} stderr=${stderr}`);
}

describe('MCP server getBuiltinTools — plugin tool schema', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-mcp-schema-'));
    const pluginDir = path.join(tmpDir, '.aide', 'plugins', 'sample-plugin');
    fs.mkdirSync(path.join(pluginDir, 'src'), { recursive: true });
    const spec = {
      name: 'sample-plugin',
      version: '1.0.0',
      description: 'sample',
      entryPoint: 'src/index.js',
      tools: [
        {
          name: 'do_thing',
          description: 'does a thing',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string', enum: ['todo', 'done'] },
              note: { type: 'string', description: 'optional note' },
            },
            required: ['id'],
          },
        },
      ],
    };
    fs.writeFileSync(path.join(pluginDir, 'plugin.spec.json'), JSON.stringify(spec));
    fs.writeFileSync(path.join(pluginDir, 'src', 'index.js'), 'module.exports = {};');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes plugin parameters JSON Schema through verbatim into inputSchema', () => {
    const { tools } = callToolsList(tmpDir);
    const tool = tools.find((t) => t.name === 'plugin_sample-plugin_do_thing');
    expect(tool, 'plugin tool should be advertised').toBeTruthy();

    const schema = tool!.inputSchema as {
      type: string;
      properties: Record<string, { type: string; enum?: unknown[]; description?: string }>;
      required: string[];
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['id']);
    expect(schema.properties.id).toEqual({ type: 'string' });
    expect(schema.properties.status).toEqual({ type: 'string', enum: ['todo', 'done'] });
    expect(schema.properties.note).toEqual({ type: 'string', description: 'optional note' });
  });

  it('does not flatten schema metadata (properties/required/type) into field names', () => {
    const { tools } = callToolsList(tmpDir);
    const tool = tools.find((t) => t.name === 'plugin_sample-plugin_do_thing');
    const schema = tool!.inputSchema as { properties: Record<string, unknown> };
    expect(schema.properties).not.toHaveProperty('properties');
    expect(schema.properties).not.toHaveProperty('required');
    expect(schema.properties).not.toHaveProperty('type');
  });
});

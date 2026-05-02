/**
 * Tests for the `.aide/` → `.smalti/` path alias in the MCP server's
 * scopedFs (server.js invokePluginTool). Mirrors the same cases tested for
 * sandbox.ts in sandbox-aide-alias.test.ts — the two implementations must be
 * semantically equivalent.
 *
 * Unit tests: extract resolveWorkspaceRel from server.js via vm and verify
 * all 7 alias cases match sandbox.ts behaviour.
 *
 * Integration test: spawn server.js as a child process with a temp workspace
 * containing a legacy plugin that hardcodes `.aide/` paths, and verify the
 * alias rewrites transparently resolve to `.smalti/` data.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract and evaluate the resolveWorkspaceRel function from server.js.
 * We match only that function so we don't trigger the stdin listener.
 */
function loadResolveWorkspaceRel(): (ws: string, fp: string) => string {
  const serverSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/main/mcp/server.js'),
    'utf-8',
  );

  const match = serverSource.match(/function resolveWorkspaceRel\b[\s\S]*?\n\}/);
  if (!match) {
    throw new Error(
      'resolveWorkspaceRel not found in server.js — has the function been added yet?',
    );
  }

  const sandbox = { path, module: { exports: {} as Record<string, unknown> }, exports: {} };
  const code = `${match[0]}\nmodule.exports = resolveWorkspaceRel;`;
  vm.runInNewContext(code, sandbox);
  return sandbox.module.exports as unknown as (ws: string, fp: string) => string;
}

// ---------------------------------------------------------------------------
// Unit tests — resolveWorkspaceRel alias cases
// ---------------------------------------------------------------------------

const WS = '/workspace/myproject';

describe('server.js resolveWorkspaceRel — .aide alias (unit)', () => {
  let resolveWorkspaceRel: (ws: string, fp: string) => string;

  beforeEach(() => {
    resolveWorkspaceRel = loadResolveWorkspaceRel();
  });

  it('rewrites .aide/file to .smalti/file', () => {
    expect(resolveWorkspaceRel(WS, '.aide/agent-todos.json')).toBe(
      path.resolve(WS, '.smalti', 'agent-todos.json'),
    );
  });

  it('rewrites bare .aide to .smalti', () => {
    expect(resolveWorkspaceRel(WS, '.aide')).toBe(path.resolve(WS, '.smalti'));
  });

  it('rewrites ./.aide/x to .smalti/x', () => {
    expect(resolveWorkspaceRel(WS, './.aide/x')).toBe(
      path.resolve(WS, '.smalti', 'x'),
    );
  });

  it('leaves .smalti/ paths unchanged', () => {
    expect(resolveWorkspaceRel(WS, '.smalti/x')).toBe(
      path.resolve(WS, '.smalti', 'x'),
    );
  });

  it('does not rewrite .aide in a non-root segment', () => {
    expect(resolveWorkspaceRel(WS, 'a/.aide/x')).toBe(
      path.resolve(WS, 'a', '.aide', 'x'),
    );
  });

  it('leaves plugin paths without .aide unchanged', () => {
    expect(resolveWorkspaceRel(WS, 'plugins/agent-todo-board/index.html')).toBe(
      path.resolve(WS, 'plugins', 'agent-todo-board', 'index.html'),
    );
  });

  it('does not rewrite identifiers without a leading dot-aide pattern', () => {
    expect(resolveWorkspaceRel(WS, 'aide-foo')).toBe(
      path.resolve(WS, 'aide-foo'),
    );
  });
});

// ---------------------------------------------------------------------------
// scopedFs alias coverage — each of the 9 methods rewrites .aide/ input
// ---------------------------------------------------------------------------
// These tests use the invokePluginTool path end-to-end via a minimal plugin
// so that each scopedFs method's alias rewrite is exercised in isolation.
// ---------------------------------------------------------------------------

describe('server.js scopedFs — .aide/ alias per method', () => {
  let tmpDir: string;
  let wsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smalti-scopedfs-test-'));
    wsDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(path.join(wsDir, '.smalti'), { recursive: true });

    // Plugin directory lives at <ws>/.smalti/plugins/<name>
    const pluginDir = path.join(wsDir, '.smalti', 'plugins', 'alias-test');
    fs.mkdirSync(path.join(pluginDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.spec.json'),
      JSON.stringify({
        id: 'plugin-alias-test',
        name: 'alias-test',
        description: 'scopedFs alias coverage',
        version: '0.1.0',
        permissions: ['fs:read', 'fs:write'],
        entryPoint: 'src/index.js',
        tools: [{ name: 'run', description: 'run', parameters: { type: 'object', properties: {} } }],
      }),
    );
    fs.writeFileSync(
      path.join(pluginDir, 'tool.json'),
      JSON.stringify({
        pluginId: 'plugin-alias-test',
        pluginName: 'alias-test',
        version: '0.1.0',
        tools: [{ name: 'run', description: 'run', parameters: { type: 'object', properties: {} } }],
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Helper: write plugin code, invoke 'run', return stdout JSON result. */
  function runPlugin(code: string): unknown {
    const serverPath = path.resolve(__dirname, '../../src/main/mcp/server.js');
    const pluginDir = path.join(wsDir, '.smalti', 'plugins', 'alias-test');
    fs.writeFileSync(path.join(pluginDir, 'src', 'index.js'), code);

    const request =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'smalti_invoke_tool',
          arguments: { plugin_name: 'alias-test', tool_name: 'run', args: {} },
        },
      }) + '\n';

    const stdout = execFileSync(process.execPath, [serverPath], {
      cwd: wsDir,
      env: { ...process.env, SMALTI_WORKSPACE: wsDir },
      input: request,
      encoding: 'utf-8',
      timeout: 5000,
    });

    const lines = stdout.trim().split('\n').filter(Boolean);
    const response = JSON.parse(lines[lines.length - 1]);
    if (response.error) throw new Error(`MCP error: ${JSON.stringify(response.error)}`);
    return JSON.parse(response.result.content[0].text);
  }

  it('read: .aide/data.txt → resolves to .smalti/data.txt', () => {
    fs.writeFileSync(path.join(wsDir, '.smalti', 'data.txt'), 'hello-read');
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { return fs.read('.aide/data.txt'); }
      };
    `);
    expect(result).toBe('hello-read');
  });

  it('write: .aide/out.txt → writes to .smalti/out.txt', () => {
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { fs.write('.aide/out.txt', 'written'); return 'ok'; }
      };
    `);
    expect(result).toBe('ok');
    expect(fs.readFileSync(path.join(wsDir, '.smalti', 'out.txt'), 'utf-8')).toBe('written');
  });

  it('existsSync: .aide/x.txt → checks .smalti/x.txt', () => {
    fs.writeFileSync(path.join(wsDir, '.smalti', 'x.txt'), '1');
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { return fs.existsSync('.aide/x.txt'); }
      };
    `);
    expect(result).toBe(true);
  });

  it('readFileSync: .aide/r.json → reads .smalti/r.json', () => {
    fs.writeFileSync(path.join(wsDir, '.smalti', 'r.json'), '{"v":42}');
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { return JSON.parse(fs.readFileSync('.aide/r.json', 'utf-8')); }
      };
    `);
    expect((result as { v: number }).v).toBe(42);
  });

  it('writeFileSync: .aide/wf.txt → writes to .smalti/wf.txt', () => {
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { fs.writeFileSync('.aide/wf.txt', 'wf-content'); return 'ok'; }
      };
    `);
    expect(result).toBe('ok');
    expect(fs.readFileSync(path.join(wsDir, '.smalti', 'wf.txt'), 'utf-8')).toBe('wf-content');
  });

  it('mkdirSync: .aide/newdir → creates .smalti/newdir', () => {
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { fs.mkdirSync('.aide/newdir', { recursive: true }); return 'ok'; }
      };
    `);
    expect(result).toBe('ok');
    expect(fs.existsSync(path.join(wsDir, '.smalti', 'newdir'))).toBe(true);
  });

  it('readdirSync: .aide/ → lists .smalti/ entries', () => {
    fs.writeFileSync(path.join(wsDir, '.smalti', 'entry-a.txt'), 'a');
    fs.writeFileSync(path.join(wsDir, '.smalti', 'entry-b.txt'), 'b');
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { return fs.readdirSync('.aide/'); }
      };
    `) as string[];
    expect(result).toContain('entry-a.txt');
    expect(result).toContain('entry-b.txt');
  });

  it('statSync: .aide/stat.txt → stats .smalti/stat.txt', () => {
    fs.writeFileSync(path.join(wsDir, '.smalti', 'stat.txt'), 'stat-me');
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { var s = fs.statSync('.aide/stat.txt'); return { isFile: s.isFile() }; }
      };
    `) as { isFile: boolean };
    expect(result.isFile).toBe(true);
  });

  it('unlinkSync: .aide/del.txt → deletes .smalti/del.txt', () => {
    fs.writeFileSync(path.join(wsDir, '.smalti', 'del.txt'), 'delete-me');
    const result = runPlugin(`
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() { fs.unlinkSync('.aide/del.txt'); return 'ok'; }
      };
    `);
    expect(result).toBe('ok');
    expect(fs.existsSync(path.join(wsDir, '.smalti', 'del.txt'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Boundary escape — alias rewrite must not loosen workspace boundary check
// ---------------------------------------------------------------------------

describe('server.js scopedFs — boundary check survives alias rewrite', () => {
  let tmpDir: string;
  let wsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smalti-boundary-test-'));
    wsDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(path.join(wsDir, '.smalti'), { recursive: true });

    const pluginDir = path.join(wsDir, '.smalti', 'plugins', 'escape-test');
    fs.mkdirSync(path.join(pluginDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.spec.json'),
      JSON.stringify({
        id: 'plugin-escape-test',
        name: 'escape-test',
        description: 'boundary escape test',
        version: '0.1.0',
        permissions: ['fs:read'],
        entryPoint: 'src/index.js',
        tools: [{ name: 'run', description: 'run', parameters: { type: 'object', properties: {} } }],
      }),
    );
    fs.writeFileSync(
      path.join(pluginDir, 'tool.json'),
      JSON.stringify({
        pluginId: 'plugin-escape-test',
        pluginName: 'escape-test',
        version: '0.1.0',
        tools: [{ name: 'run', description: 'run', parameters: { type: 'object', properties: {} } }],
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects .aide/../../escape path even after alias rewrite', () => {
    const serverPath = path.resolve(__dirname, '../../src/main/mcp/server.js');
    // Write a secret outside workspace to ensure we are not accidentally reading it
    fs.writeFileSync(path.join(tmpDir, 'secret.txt'), 'outside-workspace');

    const pluginCode = `
      "use strict";
      const fs = require('fs');
      module.exports = {
        invoke: function() {
          // After alias rewrite, resolves to <ws>/.smalti/../../escape = outside ws
          return fs.read('.aide/../../secret.txt');
        }
      };
    `;
    fs.writeFileSync(
      path.join(wsDir, '.smalti', 'plugins', 'escape-test', 'src', 'index.js'),
      pluginCode,
    );

    const request =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'smalti_invoke_tool',
          arguments: { plugin_name: 'escape-test', tool_name: 'run', args: {} },
        },
      }) + '\n';

    const stdout = execFileSync(process.execPath, [serverPath], {
      cwd: wsDir,
      env: { ...process.env, SMALTI_WORKSPACE: wsDir },
      input: request,
      encoding: 'utf-8',
      timeout: 5000,
    });

    const lines = stdout.trim().split('\n').filter(Boolean);
    const response = JSON.parse(lines[lines.length - 1]);
    // The server must return an error, not the secret content
    expect(response.error).toBeDefined();
    expect(JSON.stringify(response.error)).toMatch(/[Aa]ccess denied|outside workspace/);
  });
});

// ---------------------------------------------------------------------------
// Integration test — invokePluginTool applies alias end-to-end
// ---------------------------------------------------------------------------

/**
 * Build a minimal fake plugin in a temp workspace, spawn server.js with that
 * workspace as cwd (so PLUGINS_DIR = wsDir/.smalti/plugins), send a JSON-RPC
 * smalti_invoke_tool call, and assert the legacy `.aide/` path in the plugin
 * code is transparently resolved to `.smalti/` data.
 */
describe('server.js invokePluginTool — .aide alias integration', () => {
  let tmpDir: string;
  let wsDir: string;

  const SAMPLE_DATA = JSON.stringify({
    version: 2,
    tasks: [{ id: 't1', title: 'hello' }],
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smalti-mcp-test-'));
    wsDir = path.join(tmpDir, 'workspace');

    // Post-rebrand data lives at `.smalti/`
    fs.mkdirSync(path.join(wsDir, '.smalti'), { recursive: true });
    fs.writeFileSync(
      path.join(wsDir, '.smalti', 'agent-todos.agent-todos.json'),
      SAMPLE_DATA,
    );

    // PLUGINS_DIR = safeCwd()/.smalti/plugins → cwd is set to wsDir when spawning
    const pluginDir = path.join(wsDir, '.smalti', 'plugins', 'test-plugin');
    fs.mkdirSync(path.join(pluginDir, 'src'), { recursive: true });

    const spec = {
      id: 'plugin-test',
      name: 'test-plugin',
      description: 'Test plugin',
      version: '0.1.0',
      permissions: ['fs:read'],
      entryPoint: 'src/index.js',
      tools: [
        {
          name: 'read-todos',
          description: 'Read todos via legacy .aide/ path',
          parameters: { type: 'object', properties: {} },
        },
      ],
    };
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.spec.json'),
      JSON.stringify(spec, null, 2),
    );
    fs.writeFileSync(
      path.join(pluginDir, 'tool.json'),
      JSON.stringify(
        { pluginId: spec.id, pluginName: spec.name, version: spec.version, tools: spec.tools },
        null,
        2,
      ),
    );

    // Plugin code hardcodes the PRE-rebrand `.aide/` path
    const pluginCode = `"use strict";
const fs = require('fs');
module.exports = {
  name: 'test-plugin',
  version: '0.1.0',
  tools: [],
  invoke: function(toolName, args) {
    if (toolName === 'read-todos') {
      // Legacy hardcoded path — alias rewrite must translate this to .smalti/
      const content = fs.readFileSync('.aide/agent-todos.agent-todos.json', 'utf-8');
      return JSON.parse(content);
    }
    throw new Error('Unknown tool: ' + toolName);
  }
};
`;
    fs.writeFileSync(path.join(pluginDir, 'src', 'index.js'), pluginCode);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads .smalti/ data when plugin hardcodes .aide/ path', () => {
    const serverPath = path.resolve(__dirname, '../../src/main/mcp/server.js');

    const request =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'smalti_invoke_tool',
          arguments: { plugin_name: 'test-plugin', tool_name: 'read-todos', args: {} },
        },
      }) + '\n';

    let stdout: string;
    try {
      stdout = execFileSync(process.execPath, [serverPath], {
        // cwd = wsDir so that PLUGINS_DIR = wsDir/.smalti/plugins
        cwd: wsDir,
        env: {
          ...process.env,
          SMALTI_WORKSPACE: wsDir,
        },
        input: request,
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      throw new Error(
        `server.js process failed:\nstdout: ${e.stdout ?? ''}\nstderr: ${e.stderr ?? ''}\n${e.message ?? ''}`,
      );
    }

    const lines = stdout.trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const response = JSON.parse(lines[lines.length - 1]);

    expect(response.error, `unexpected error: ${JSON.stringify(response.error)}`).toBeUndefined();
    expect(response.result).toBeDefined();

    const resultText = response.result.content[0].text;
    const parsed = JSON.parse(resultText);
    expect(parsed.tasks).toEqual([{ id: 't1', title: 'hello' }]);
  });
});

// ---------------------------------------------------------------------------
// Equivalence test — server.js resolveWorkspaceRel must match sandbox.ts
// ---------------------------------------------------------------------------

/**
 * AC-2: Regex equivalence between sandbox.ts resolveWorkspaceRel() and the
 * inline copy in server.js. Both files use the same replace() pattern —
 * extracting the regex literal from each source and comparing them catches
 * any future drift without needing to execute TypeScript-typed code in vm.
 */
describe('resolveWorkspaceRel equivalence — sandbox.ts vs server.js (AC-2)', () => {
  it('sandbox.ts and server.js use the same .aide alias regex', () => {
    const sandboxSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/main/plugin/sandbox.ts'),
      'utf-8',
    );
    const serverSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/main/mcp/server.js'),
      'utf-8',
    );

    // Extract the replace() regex from each file.
    // Both should contain: .replace(/^(\.\/?)?\.aide(\/|$)/, ...)
    const sandboxMatch = sandboxSource.match(/filePath\.replace\(([^,]+),/);
    const serverMatch = serverSource.match(/fp\.replace\(([^,]+),/);

    expect(sandboxMatch).not.toBeNull();
    expect(serverMatch).not.toBeNull();

    const sandboxRegex = sandboxMatch![1].trim();
    const serverRegex = serverMatch![1].trim();
    expect(serverRegex).toBe(sandboxRegex);
  });

  it('server.js resolveWorkspaceRel produces correct alias outputs for all expected inputs', () => {
    const resolve = loadResolveWorkspaceRel();
    const cases: Array<[string, string]> = [
      ['.aide/data.json', path.resolve(WS, '.smalti', 'data.json')],
      ['./.aide/plugins/todo/data.json', path.resolve(WS, '.smalti', 'plugins', 'todo', 'data.json')],
      ['normal/path.txt', path.resolve(WS, 'normal', 'path.txt')],
      ['.aide', path.resolve(WS, '.smalti')],
      ['.aide/', path.resolve(WS, '.smalti')],
      ['a/.aide/nested', path.resolve(WS, 'a', '.aide', 'nested')],
      ['.smalti/data.json', path.resolve(WS, '.smalti', 'data.json')],
      ['aide-foo', path.resolve(WS, 'aide-foo')],
    ];
    for (const [input, expected] of cases) {
      expect(resolve(WS, input)).toBe(expected);
    }
  });
});

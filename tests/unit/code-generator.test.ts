import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { generatePluginFromAgent } from '../../src/main/plugin/code-generator';
import type { PluginSpec } from '../../src/main/plugin/spec-generator';

const MINIMAL_SPEC: PluginSpec = {
  id: 'plugin-test01',
  name: 'test-plugin',
  description: 'A test plugin',
  version: '0.1.0',
  permissions: ['fs:read'],
  entryPoint: 'index.js',
  dependencies: {},
  tools: [
    {
      name: 'test-plugin-run',
      description: 'Run test plugin',
      parameters: { input: { type: 'string', required: true } },
    },
  ],
};

const VALID_CODE = `
module.exports = {
  name: 'test-plugin',
  version: '0.1.0',
  invoke: function(toolName, args) { return { success: true }; }
};
`;

const INVALID_CODE = `this is not valid javascript }{{{`;

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('generatePluginFromAgent', () => {
  it('creates the plugin directory when it does not exist', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    generatePluginFromAgent(MINIMAL_SPEC, VALID_CODE, pluginDir);
    expect(fs.existsSync(pluginDir)).toBe(true);
  });

  it('writes plugin.spec.json to the plugin directory', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    generatePluginFromAgent(MINIMAL_SPEC, VALID_CODE, pluginDir);
    const specPath = path.join(pluginDir, 'plugin.spec.json');
    expect(fs.existsSync(specPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    expect(written.id).toBe(MINIMAL_SPEC.id);
    expect(written.name).toBe(MINIMAL_SPEC.name);
  });

  it('writes tool.json to the plugin directory', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    generatePluginFromAgent(MINIMAL_SPEC, VALID_CODE, pluginDir);
    const toolPath = path.join(pluginDir, 'tool.json');
    expect(fs.existsSync(toolPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(toolPath, 'utf-8'));
    expect(manifest.pluginId).toBe(MINIMAL_SPEC.id);
    expect(manifest.pluginName).toBe(MINIMAL_SPEC.name);
    expect(manifest.version).toBe(MINIMAL_SPEC.version);
  });

  it('writes index.js to the plugin directory', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    generatePluginFromAgent(MINIMAL_SPEC, VALID_CODE, pluginDir);
    expect(fs.existsSync(path.join(pluginDir, 'index.js'))).toBe(true);
  });

  it('writes all three required files in one call', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    generatePluginFromAgent(MINIMAL_SPEC, VALID_CODE, pluginDir);
    const files = fs.readdirSync(pluginDir);
    expect(files).toContain('plugin.spec.json');
    expect(files).toContain('tool.json');
    expect(files).toContain('index.js');
  });

  it('writes the exact provided code to index.js, not a stub', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    generatePluginFromAgent(MINIMAL_SPEC, VALID_CODE, pluginDir);
    const written = fs.readFileSync(path.join(pluginDir, 'index.js'), 'utf-8');
    expect(written).toBe(VALID_CODE);
  });

  it('throws an error when the provided code is invalid JavaScript', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    expect(() => generatePluginFromAgent(MINIMAL_SPEC, INVALID_CODE, pluginDir)).toThrow(
      'Plugin code compilation failed',
    );
  });

  it('removes the plugin directory when compilation fails', () => {
    const pluginDir = path.join(makeTmpDir(), 'my-plugin');
    try {
      generatePluginFromAgent(MINIMAL_SPEC, INVALID_CODE, pluginDir);
    } catch {
      // expected
    }
    expect(fs.existsSync(pluginDir)).toBe(false);
  });
});

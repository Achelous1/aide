import { describe, it, expect } from 'vitest';
import { buildUpdateScript } from '../../src/main/updater/check';

const BASE_PARAMS = {
  appPath: '/Applications/AIDE.app',
  newAppPath: '/tmp/aide-update-123/AIDE.app',
  tmpDir: '/tmp/aide-update-123',
};

describe('buildUpdateScript', () => {
  it('starts with #!/bin/bash', () => {
    const script = buildUpdateScript(BASE_PARAMS);
    expect(script.startsWith('#!/bin/bash')).toBe(true);
  });

  it('contains sleep 3', () => {
    const script = buildUpdateScript(BASE_PARAMS);
    expect(script).toContain('sleep 3');
  });

  it('removes quarantine on newAppPath before cp -R', () => {
    const script = buildUpdateScript(BASE_PARAMS);
    const quarantineIdx = script.indexOf(
      `xattr -rd com.apple.quarantine "${BASE_PARAMS.newAppPath}"`,
    );
    const cpIdx = script.indexOf(`cp -R "${BASE_PARAMS.newAppPath}" "${BASE_PARAMS.appPath}"`);
    expect(quarantineIdx).toBeGreaterThan(-1);
    expect(cpIdx).toBeGreaterThan(-1);
    expect(quarantineIdx).toBeLessThan(cpIdx);
  });

  it('clears all xattrs on appPath after cp -R and before rm -rf tmpDir', () => {
    const script = buildUpdateScript(BASE_PARAMS);
    const cpIdx = script.indexOf(`cp -R "${BASE_PARAMS.newAppPath}" "${BASE_PARAMS.appPath}"`);
    const xattrCrIdx = script.indexOf(`xattr -cr "${BASE_PARAMS.appPath}"`);
    const rmIdx = script.indexOf(`rm -rf "${BASE_PARAMS.tmpDir}"`);
    expect(xattrCrIdx).toBeGreaterThan(-1);
    expect(xattrCrIdx).toBeGreaterThan(cpIdx);
    expect(xattrCrIdx).toBeLessThan(rmIdx);
  });

  it('contains rm -rf tmpDir with the correct path', () => {
    const script = buildUpdateScript(BASE_PARAMS);
    expect(script).toContain(`rm -rf "${BASE_PARAMS.tmpDir}"`);
  });

  it('contains cp -R with correct paths', () => {
    const script = buildUpdateScript(BASE_PARAMS);
    expect(script).toContain(
      `cp -R "${BASE_PARAMS.newAppPath}" "${BASE_PARAMS.appPath}"`,
    );
  });

  it('ends with open appPath as the last meaningful line', () => {
    const script = buildUpdateScript(BASE_PARAMS);
    const lines = script.split('\n').filter((l) => l.trim() !== '');
    expect(lines[lines.length - 1]).toBe(`open "${BASE_PARAMS.appPath}"`);
  });

  it('handles paths with spaces', () => {
    const params = {
      appPath: '/Applications/My App.app',
      newAppPath: '/tmp/aide-update-456/My App.app',
      tmpDir: '/tmp/aide-update-456',
    };
    const script = buildUpdateScript(params);
    expect(script).toContain(`"${params.appPath}"`);
    expect(script).toContain(`"${params.newAppPath}"`);
    expect(script).toContain(`xattr -cr "${params.appPath}"`);
    expect(script).toContain(`open "${params.appPath}"`);
  });
});

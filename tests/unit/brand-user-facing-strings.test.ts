import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return fs.readFileSync(path.resolve(ROOT, rel), 'utf-8');
}

describe('brand user-facing strings migration (D6)', () => {
  it('BrowserWindow title does not hardcode AIDE', () => {
    const content = readSrc('src/main/index.ts');
    expect(content).not.toMatch(/title:\s*['"]AIDE['"]/);
  });

  it('BrowserWindow title uses smalti', () => {
    const content = readSrc('src/main/index.ts');
    expect(content).toMatch(/title:\s*['"]smalti['"]/i);
  });

  it('TERM_PROGRAM value is not AIDE', () => {
    const content = readSrc('src/main/agent/agent-config.ts');
    expect(content).not.toMatch(/TERM_PROGRAM:\s*['"]AIDE['"]/);
  });

  it('TERM_PROGRAM value is smalti', () => {
    const content = readSrc('src/main/agent/agent-config.ts');
    expect(content).toMatch(/TERM_PROGRAM:\s*['"]smalti['"]/i);
  });
});

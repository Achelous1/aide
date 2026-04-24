import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
const ROOT = path.resolve(__dirname, '../..');

function countStandaloneAide(content: string): number {
  const clean = content
    .replace(/aide-[a-z-]+/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\bAIDE\.app\b/g, '')
    .replace(/\bAIDE\.dmg\b/g, '');
  return (clean.match(/\bAIDE\b/g) || []).length;
}

describe('spec docs brand migration (E3)', () => {
  it.each(['docs/spec/PRD.md', 'docs/spec/TRD.md', 'docs/spec/UI-SPEC.md'])('%s no standalone AIDE', (f) => {
    const c = fs.readFileSync(path.resolve(ROOT, f), 'utf-8');
    expect(countStandaloneAide(c)).toBe(0);
  });
  it.each(['docs/spec/PRD.md', 'docs/spec/TRD.md', 'docs/spec/UI-SPEC.md'])('%s mentions smalti', (f) => {
    const c = fs.readFileSync(path.resolve(ROOT, f), 'utf-8');
    expect(c.toLowerCase()).toContain('smalti');
  });
});

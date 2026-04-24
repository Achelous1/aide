import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function countStandaloneAide(content: string): number {
  // "AIDE" as a standalone word, not part of .aide/, aide-*, etc.
  // Exclude code identifier patterns
  const clean = content
    .replace(/aide-[a-z-]+/g, '')         // aide-plugin, aide-core, etc
    .replace(/`[^`]*`/g, '')              // inline code spans
    .replace(/```[\s\S]*?```/g, '')       // fenced code blocks
    .replace(/\bAIDE\.app\b/g, '')        // binary artifact
    .replace(/\bAIDE\.dmg\b/g, '')
    .replace(/out\/AIDE\b/g, '')
    .replace(/Applications\/AIDE\b/g, '');
  return (clean.match(/\bAIDE\b/g) || []).length;
}

describe('CLAUDE.md brand prose migration (E2)', () => {
  // `.claude/CLAUDE.md` is a local-only brand-identity harness file
  // (present in the developer's working tree but intentionally untracked —
  // only the committed CLAUDE.md files participate in CI).
  it.each([
    'CLAUDE.md',
    'docs/CLAUDE.md',
  ])('%s prose no longer uses AIDE as brand name', (file) => {
    const content = fs.readFileSync(path.resolve(ROOT, file), 'utf-8');
    const count = countStandaloneAide(content);
    if (count > 0) {
      // Log what remained for debugging
      const clean = content
        .replace(/aide-[a-z-]+/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/```[\s\S]*?```/g, '');
      const matches = clean.match(/.{0,50}\bAIDE\b.{0,50}/g);
      console.error(`Remaining AIDE in ${file}:`, matches);
    }
    expect(count).toBe(0);
  });

  it.each([
    'CLAUDE.md',
    'docs/CLAUDE.md',
  ])('%s mentions smalti as brand name', (file) => {
    const content = fs.readFileSync(path.resolve(ROOT, file), 'utf-8');
    expect(content.toLowerCase()).toContain('smalti');
  });

  it('preserves code identifiers (aide-* etc)', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'CLAUDE.md'), 'utf-8');
    // These must remain (code identifiers not migrated yet)
    expect(content).toMatch(/aide-plugin:\/\/|aide-cdn:\/\/|\.aide\/|window\.aide|aide-core|aide-napi/);
  });
});

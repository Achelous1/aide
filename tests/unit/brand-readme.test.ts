import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function countStandaloneAide(content: string): number {
  const clean = content
    .replace(/aide-[a-z-]+/g, '')           // aide-plugin, aide-core, aide-cdn, etc.
    .replace(/`[^`]*`/g, '')                // inline code spans
    .replace(/```[\s\S]*?```/g, '')         // fenced code blocks
    .replace(/\bAIDE\.app\b/g, '')          // binary artifact (D8)
    .replace(/\bAIDE\.dmg\b/g, '')          // binary artifact (D8)
    .replace(/out\/AIDE\b/g, '')            // build output path (D8)
    .replace(/Applications\/AIDE\b/g, '')   // install path (D8)
    .replace(/from AIDE to/gi, '')           // rebrand notice box (English)
    .replace(/AIDE is being renamed/gi, '') // rebrand notice box (English)
    .replace(/제품명이 AIDE에서/g, '')      // rebrand notice box (Korean) — L11 in README_kor.md
    .replace(/AIDE는 .{0,80}로 전환/g, ''); // rebrand notice box (Korean) — legacy variant
  return (clean.match(/\bAIDE\b/g) || []).length;
}

describe('README brand migration (E1)', () => {
  it.each(['README.md', 'README_kor.md'])('%s has zero standalone AIDE', (file) => {
    const content = fs.readFileSync(path.resolve(ROOT, file), 'utf-8');
    const count = countStandaloneAide(content);
    if (count > 0) {
      const clean = content
        .replace(/aide-[a-z-]+/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/```[\s\S]*?```/g, '');
      const matches = clean.match(/.{0,60}\bAIDE\b.{0,60}/g);
      console.error(`Remaining AIDE in ${file}:`, matches);
    }
    expect(count).toBe(0);
  });

  it.each(['README.md', 'README_kor.md'])('%s mentions smalti brand', (file) => {
    const content = fs.readFileSync(path.resolve(ROOT, file), 'utf-8');
    expect(content.toLowerCase()).toContain('smalti');
  });

  it('preserves legacy code identifiers', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'README.md'), 'utf-8');
    expect(content).toMatch(/aide-plugin:\/\/|aide-cdn:\/\/|\.aide\/|window\.aide/);
  });
});

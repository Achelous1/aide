import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const WIKI = path.resolve(ROOT, 'docs/wiki');

function countBrandAideInCurrentProse(content: string): number {
  // Allow "formerly AIDE" and "AIDE (now smalti)" patterns — historical
  const clean = content
    .replace(/aide-[a-z-]+/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/formerly AIDE/gi, '')
    .replace(/AIDE \(now smalti\)/gi, '')
    .replace(/\bAIDE\.app\b/g, '')
    .replace(/\bAIDE\.dmg\b/g, '');
  return (clean.match(/\bAIDE\b/g) || []).length;
}

describe('wiki brand sweep (E4)', () => {
  it('no standalone AIDE in current prose (historical mentions use "formerly AIDE")', () => {
    const files = fs.readdirSync(WIKI).filter(f => f.endsWith('.md'));
    const offenders: string[] = [];
    for (const f of files) {
      const c = fs.readFileSync(path.join(WIKI, f), 'utf-8');
      if (countBrandAideInCurrentProse(c) > 0) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

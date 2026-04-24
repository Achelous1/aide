import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

describe('smalti brand identifiers in package.json', () => {
  it('uses smalti as name', () => expect(pkg.name).toBe('smalti'));
  // Deferred to task_reb_d08 (userData migration); changing productName alone would orphan ~/Library/Application Support/AIDE/
  it('keeps productName as AIDE pending userData migration', () => expect(pkg.productName).toBe('AIDE'));
  it('has smalti github homepage', () => expect(pkg.homepage).toMatch(/github\.com\/Achelous1\/smalti/));
  it('has smalti repository url', () => expect(pkg.repository?.url).toMatch(/smalti\.git$/));
  it('has smalti bugs url', () => expect(pkg.bugs?.url).toMatch(/smalti\/issues/));
});

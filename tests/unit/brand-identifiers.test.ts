import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

describe('smalti brand identifiers in package.json', () => {
  it('uses smalti as name', () => expect(pkg.name).toBe('smalti'));
  // D8 shipped: productName flipped to 'Smalti' (capital, brand display form) alongside the
  // copy-only ~/.aide → ~/.smalti migration (src/main/migrate-aide-data.ts).
  // npm `name` stays lowercase per registry convention, productName follows brand casing.
  it('uses Smalti as productName (capitalized brand display)', () => expect(pkg.productName).toBe('Smalti'));
  it('has smalti github homepage', () => expect(pkg.homepage).toMatch(/github\.com\/Achelous1\/smalti/));
  it('has smalti repository url', () => expect(pkg.repository?.url).toMatch(/smalti\.git$/));
  it('has smalti bugs url', () => expect(pkg.bugs?.url).toMatch(/smalti\/issues/));
});

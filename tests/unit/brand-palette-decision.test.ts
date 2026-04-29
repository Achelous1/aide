import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

function readBrandDoc(rel: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'docs', 'brand', rel), 'utf-8');
}

describe('brand design tokens — B05 guard (Glass Cyan vs Sky Blue)', () => {
  const doc = readBrandDoc('04_visual_identity.md');

  it('$smalti-cyan token is defined as a distinct palette-C token', () => {
    expect(doc).toMatch(/\$smalti-cyan/);
  });

  it('$smalti-sky-blue token is defined as a distinct palette-D token', () => {
    expect(doc).toMatch(/\$smalti-sky-blue/);
  });

  it('Glass Cyan and Sky Blue are documented as separate tokens (not merged)', () => {
    // Both tokens must coexist — they should NOT be the same variable
    const cyanIdx = doc.indexOf('$smalti-cyan');
    const skyIdx = doc.indexOf('$smalti-sky-blue');
    expect(cyanIdx).toBeGreaterThanOrEqual(0);
    expect(skyIdx).toBeGreaterThanOrEqual(0);
    expect(cyanIdx).not.toBe(skyIdx);
  });

  it('Glass Cyan is designated as the primary action color in palette C', () => {
    expect(doc).toMatch(/Glass Cyan.*주 액션 컬러/);
  });

  it('Sky Blue is restricted to logo/brand asset use (not CTA)', () => {
    // palette D usage rule: Sky Blue is logo/marketing only
    expect(doc).toMatch(/Sky Blue.*로고.*마케팅|로고.*Sky Blue/);
  });

  it('Glass Cyan dark value is #4FB3BF', () => {
    expect(doc).toMatch(/#4FB3BF/);
  });

  it('Sky Blue base value is #6FC5DB', () => {
    expect(doc).toMatch(/#6FC5DB/);
  });

  it('Glass Cyan dark mode contrast ratio against ink.900 is documented as >= 4.5:1', () => {
    // §3.7 table: Glass Cyan (#4FB3BF) | ink.900 | 7.6:1
    expect(doc).toMatch(/Glass Cyan.*7\.6:1|7\.6:1.*Glass Cyan/);
  });

  it('Cyan.light (#2B8A94) is defined for light mode WCAG AA compliance', () => {
    expect(doc).toMatch(/#2B8A94/);
  });

  it('B05 decision log is recorded in §3.3', () => {
    expect(doc).toMatch(/B05 결정 로그/);
  });
});

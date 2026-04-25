import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

// D6 follow-up: renderer-side user-visible strings (Welcome hero, EmptyState
// hero, error banners) — D6 originally only swept src/main/. Without a guard
// these silently regress because they live in JSX text nodes.
describe('renderer-visible brand strings (D6 follow-up)', () => {
  it('Welcome page hero is "> smalti_" (not aide)', () => {
    const c = fs.readFileSync(
      path.resolve(ROOT, 'src/renderer/components/welcome/WelcomePage.tsx'),
      'utf-8',
    );
    expect(c).toContain('&gt; smalti_');
    expect(c).not.toContain('&gt; aide_');
  });

  it('EmptyState hero is "> smalti_" (not aide)', () => {
    const c = fs.readFileSync(
      path.resolve(ROOT, 'src/renderer/components/layout/EmptyState.tsx'),
      'utf-8',
    );
    expect(c).toContain("'> smalti_'");
    expect(c).not.toContain("'> aide_'");
  });

  it('PermissionBanner error message uses smalti, not AIDE', () => {
    const c = fs.readFileSync(
      path.resolve(ROOT, 'src/renderer/components/file-explorer/PermissionBanner.tsx'),
      'utf-8',
    );
    expect(c).toContain("smalti can't read");
    expect(c).not.toContain("AIDE can't read");
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('forge.config.ts brand identifiers', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../../forge.config.ts'), 'utf-8');

  describe('D8: productName and packager fields flipped to Smalti (capitalized brand display)', () => {
    it("default productName is 'Smalti'", () => {
      // After the local-build flag was introduced, the literal lives in a
      // ternary: `isLocalBuild ? 'Smalti-Local-Build' : 'Smalti'`.
      expect(content).toMatch(/['"]Smalti-Local-Build['"]\s*:\s*['"]Smalti['"]/);
    });

    it('packagerConfig.name is wired to the productName binding', () => {
      expect(content).toMatch(/name:\s*productName/);
    });

    it("packagerConfig.name no longer uses 'AIDE'", () => {
      expect(content).not.toMatch(/name:\s*['"]AIDE['"]/);
    });
  });

  describe('local-build mode (chore/local-build-flag)', () => {
    it('isLocalBuild is gated on the SMALTI_LOCAL_BUILD env var', () => {
      expect(content).toMatch(/SMALTI_LOCAL_BUILD/);
      expect(content).toMatch(/const\s+isLocalBuild/);
    });

    it('local-build appBundleId is namespaced under .local', () => {
      expect(content).toMatch(/['"]com\.smaltihq\.smalti\.local['"]/);
    });

    it("default appBundleId remains 'com.smaltihq.smalti'", () => {
      // Match the literal but exclude the .local variant via a negative lookahead.
      expect(content).toMatch(/['"]com\.smaltihq\.smalti['"](?!\.)/);
    });
  });

  describe('user-facing Usage Description strings migrated to Smalti', () => {
    it.each([
      'Documents folder',
      'Desktop folder',
      'Downloads folder',
      'external volumes',
      'network volumes',
    ])('Usage Description for %s references Smalti, not AIDE', (scope) => {
      const lines = content.split('\n');
      const matching = lines.filter((l) => l.includes(scope));
      expect(matching.length).toBeGreaterThan(0);
      for (const line of matching) {
        if (line.includes('reads workspace files')) {
          expect(line).toContain('Smalti reads workspace files');
          expect(line).not.toMatch(/\bAIDE reads\b/);
        }
      }
    });
  });
});

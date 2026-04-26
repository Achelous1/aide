import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('forge.config.ts brand identifiers', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../../forge.config.ts'), 'utf-8');

  describe('D8: productName and packager fields flipped to Smalti (capitalized brand display)', () => {
    it("packagerConfig.name is 'Smalti'", () => {
      expect(content).toMatch(/name:\s*['"]Smalti['"]/);
    });

    it("packagerConfig.name no longer uses 'AIDE'", () => {
      expect(content).not.toMatch(/name:\s*['"]AIDE['"]/);
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

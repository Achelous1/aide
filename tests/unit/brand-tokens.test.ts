import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../tailwind.config.js') as {
  theme: { extend: { colors: Record<string, string> } };
};

const cssContent = fs.readFileSync(
  path.resolve(__dirname, '../../src/renderer/styles/global.css'),
  'utf-8',
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract value of a CSS custom property from a given scope block (:root or .light) */
function parseCssVar(scope: ':root' | '.light', name: string): string | null {
  const escapedScope = scope.replace('.', '\\.');
  const scopeRegex = new RegExp(`${escapedScope}\\s*\\{([^}]+)\\}`, 's');
  const match = cssContent.match(scopeRegex);
  if (!match) return null;
  const varRegex = new RegExp(`${name}:\\s*([^;]+)`);
  const v = match[1].match(varRegex);
  return v ? v[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Tailwind config — structural validation (require-based, not string presence)
// ---------------------------------------------------------------------------

describe('tailwind smalti tokens — structural', () => {
  const colors = tailwindConfig.theme.extend.colors;

  const SEMANTIC_TOKENS = [
    'smalti-canvas',
    'smalti-surface',
    'smalti-raised',
    'smalti-divider',
    'smalti-ink-body',
    'smalti-ink-muted',
    'smalti-cyan',
    'smalti-gold',
    'smalti-crimson',
    'smalti-sky-blue',
  ] as const;

  it.each(SEMANTIC_TOKENS)(
    '%s is theme-responsive: uses rgb(var(--…) / <alpha-value>) pattern',
    (token) => {
      expect(colors[token]).toMatch(
        /^rgb\(var\(--[\w-]+\)\s*\/\s*<alpha-value>\)$/,
      );
    },
  );

  it('smalti-cyan references --smalti-cyan CSS var', () => {
    expect(colors['smalti-cyan']).toMatch(/var\(--smalti-cyan\)/);
  });

  // Static brand assets — must be fixed HEX
  const STATIC_TOKENS: [string, string][] = [
    ['smalti-ink-50', '#F5F5F0'],
    ['smalti-ink-100', '#E6E7ED'],
    ['smalti-ink-300', '#9BA0B0'],
    ['smalti-ink-500', '#5A5F6E'],
    ['smalti-ink-700', '#2A2E3D'],
    ['smalti-ink-800', '#1B1E2A'],
    ['smalti-ink-900', '#11131B'],
    ['smalti-ink-950', '#0A0B10'],
    ['smalti-black', '#0D0D10'],
  ];

  it.each(STATIC_TOKENS)(
    '%s is theme-static HEX %s',
    (token, hex) => {
      expect(colors[token].toLowerCase()).toBe(hex.toLowerCase());
    },
  );

  it('semantic tokens do NOT use bare var() without rgb() wrapper', () => {
    for (const token of SEMANTIC_TOKENS) {
      expect(colors[token]).not.toMatch(/^var\(/);
    }
  });
});

// ---------------------------------------------------------------------------
// global.css — CSS variable structural validation
// ---------------------------------------------------------------------------

describe('global.css smalti CSS variables — structural', () => {
  const SEMANTIC_VARS = [
    '--smalti-canvas',
    '--smalti-surface',
    '--smalti-raised',
    '--smalti-divider',
    '--smalti-ink-body',
    '--smalti-ink-muted',
    '--smalti-cyan',
    '--smalti-gold',
    '--smalti-crimson',
    '--smalti-sky-blue',
  ] as const;

  it.each(SEMANTIC_VARS)(
    '%s is defined in both :root (dark) and .light with different values',
    (name) => {
      const dark = parseCssVar(':root', name);
      const light = parseCssVar('.light', name);
      expect(dark).toBeTruthy();
      expect(light).toBeTruthy();
      expect(dark).not.toBe(light);
    },
  );

  it('CSS vars use RGB triplet format (space-separated integers, no # or comma)', () => {
    const dark = parseCssVar(':root', '--smalti-canvas');
    // Must match "10 11 16" style — three integers separated by spaces
    expect(dark).toMatch(/^\d+\s+\d+\s+\d+$/);
    expect(dark).not.toContain('#');
    expect(dark).not.toContain(',');
  });

  it('light variant also uses RGB triplet format', () => {
    const light = parseCssVar('.light', '--smalti-canvas');
    expect(light).toMatch(/^\d+\s+\d+\s+\d+$/);
  });

  it('dark --smalti-canvas matches 10 11 16 (#0A0B10)', () => {
    expect(parseCssVar(':root', '--smalti-canvas')).toBe('10 11 16');
  });

  it('light --smalti-canvas matches 245 245 240 (#F5F5F0)', () => {
    expect(parseCssVar('.light', '--smalti-canvas')).toBe('245 245 240');
  });

  it('dark --smalti-cyan matches 79 179 191 (#4FB3BF)', () => {
    expect(parseCssVar(':root', '--smalti-cyan')).toBe('79 179 191');
  });

  it('light --smalti-cyan matches 43 138 148 (#2B8A94)', () => {
    expect(parseCssVar('.light', '--smalti-cyan')).toBe('43 138 148');
  });
});

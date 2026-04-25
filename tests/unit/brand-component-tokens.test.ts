import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Guard: inline var() usage in brand-critical components
// Ensures no undefined CSS variables remain and inline style={} vars are gone.
// ---------------------------------------------------------------------------

function readComponent(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../../', relPath), 'utf-8');
}

const COMPONENTS = {
  ToastContainer: 'src/renderer/components/common/ToastContainer.tsx',
  EmptyState: 'src/renderer/components/layout/EmptyState.tsx',
  UpdateNotice: 'src/renderer/components/updater/UpdateNotice.tsx',
} as const;

// CSS vars that are NOT defined in global.css — must not appear in source
const UNDEFINED_VARS = [
  '--status-error',
  '--status-warning',
];

// CSS vars that were migrated to Tailwind classes and must no longer appear
// as inline style values in the three target components
const MIGRATED_VARS = [
  '--accent',
  '--background',
  '--surface-elevated',
  '--surface',
  '--text-primary',
  '--text-secondary',
  '--text-tertiary',
];

describe('brand-component-tokens: no undefined CSS vars', () => {
  it.each(Object.entries(COMPONENTS))(
    '%s contains no undefined CSS vars (%s)',
    (_name, relPath) => {
      const src = readComponent(relPath);
      for (const v of UNDEFINED_VARS) {
        expect(src, `Found undefined CSS var "${v}" in ${relPath}`).not.toContain(v);
      }
    },
  );
});

describe('brand-component-tokens: migrated vars removed from inline styles', () => {
  it.each(Object.entries(COMPONENTS))(
    '%s has no inline style={{…var(--*)}} for migrated tokens (%s)',
    (_name, relPath) => {
      const src = readComponent(relPath);
      // Match style={{ ... var(--token) ... }} — inline style attribute usage
      const inlineStyleVarRegex = /style\s*=\s*\{\s*\{[^}]*var\(--[\w-]+\)[^}]*\}\s*\}/g;
      const matches = src.match(inlineStyleVarRegex) ?? [];

      for (const match of matches) {
        for (const v of MIGRATED_VARS) {
          expect(
            match,
            `Migrated var "${v}" still used in inline style in ${relPath}: ${match}`,
          ).not.toContain(v);
        }
      }
    },
  );
});

describe('brand-component-tokens: ToastContainer uses Tailwind tokens for accent bar', () => {
  const src = readComponent(COMPONENTS.ToastContainer);

  it('uses bg-smalti-crimson for error state', () => {
    expect(src).toContain('bg-smalti-crimson');
  });

  it('uses bg-aide-accent-warning for warning state', () => {
    expect(src).toContain('bg-aide-accent-warning');
  });

  it('uses bg-aide-accent for default state', () => {
    expect(src).toContain('bg-aide-accent');
  });
});

describe('brand-component-tokens: EmptyState uses Tailwind tokens', () => {
  const src = readComponent(COMPONENTS.EmptyState);

  it('hero logo uses text-aide-accent', () => {
    expect(src).toContain('text-aide-accent');
  });

  it('button container uses bg-aide-background', () => {
    expect(src).toContain('bg-aide-background');
  });

  it('first button uses bg-aide-surface-elevated', () => {
    expect(src).toContain('bg-aide-surface-elevated');
  });
});

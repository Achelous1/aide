import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(
  join(__dirname, '../../src/renderer/styles/global.css'),
  'utf-8',
);

describe('global.css — smalti palette C cyan guard', () => {
  it('must not contain hardcoded blue #3B82F6', () => {
    expect(css).not.toMatch(/#3B82F6/i);
  });

  it('must not contain rgba blue (59, 130, 246, ...)', () => {
    expect(css).not.toMatch(/rgba\(\s*59\s*,\s*130\s*,\s*246/);
  });

  it('drag-insert-line uses var(--accent)', () => {
    expect(css).toMatch(/\.drag-insert-line[\s\S]*?background-color:\s*var\(--accent\)/);
  });

  it('drag-drop-overlay uses rgb(var(--smalti-cyan) / 0.10)', () => {
    expect(css).toMatch(/\.drag-drop-overlay[\s\S]*?background-color:\s*rgb\(var\(--smalti-cyan\)\s*\/\s*0\.10\)/);
  });

  it('drag-drop-overlay border uses rgb(var(--smalti-cyan) / 0.35)', () => {
    expect(css).toMatch(/\.drag-drop-overlay[\s\S]*?border:.*rgb\(var\(--smalti-cyan\)\s*\/\s*0\.35\)/);
  });

  it('drag-drop-overlay__text uses var(--accent)', () => {
    expect(css).toMatch(/\.drag-drop-overlay__text[\s\S]*?color:\s*var\(--accent\)/);
  });

  it('resize-divider hover uses var(--accent)', () => {
    expect(css).toMatch(/\.resize-divider:hover[\s\S]*?background-color:\s*var\(--accent\)/);
  });

  it('resize-divider::before hover uses var(--accent)', () => {
    expect(css).toMatch(/\.resize-divider:hover::before[\s\S]*?background-color:\s*var\(--accent\)/);
  });

  it('resize-divider__icon uses var(--accent)', () => {
    expect(css).toMatch(/\.resize-divider__icon[\s\S]*?color:\s*var\(--accent\)/);
  });
});

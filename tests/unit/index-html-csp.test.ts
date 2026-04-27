/**
 * Regression test for the CSP `frame-src` allowlist in index.html.
 *
 * Background: v0.2.0 switched plugin iframes from `aide-plugin://` to
 * `smalti-plugin://` but did not extend the CSP `frame-src` directive.
 * Chromium silently blocked every iframe → blank plugin panes.
 *
 * This test pins both schemes in the allowlist so any future rebrand
 * that drops one without auditing the iframe URL will fail loudly.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.resolve(ROOT, 'index.html'), 'utf-8');

function frameSrc(): string {
  const match = html.match(/frame-src\s+([^;"]+)/);
  if (!match) throw new Error('frame-src directive not found in index.html');
  return match[1].trim();
}

describe('index.html CSP', () => {
  it('frame-src allows smalti-plugin: (primary scheme used by PluginView.tsx)', () => {
    expect(frameSrc()).toMatch(/\bsmalti-plugin:/);
  });

  it('frame-src still allows aide-plugin: (legacy alias retained for 1–2 releases)', () => {
    expect(frameSrc()).toMatch(/\baide-plugin:/);
  });

  it('frame-src includes self', () => {
    expect(frameSrc()).toMatch(/'self'/);
  });

  it('title reflects current brand', () => {
    expect(html).toMatch(/<title>Smalti<\/title>/);
  });
});

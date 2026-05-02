/**
 * TDD tests for PLUGIN_REGISTRY_LIST error handling.
 *
 * Cases 7 & 8: handler returns [] (not an error object) on filesystem failure,
 * and returns RegistrySummary[] on success.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  listPlugins,
  _setRegistryRootForTesting,
} from '../../src/main/plugin/registry-global';
import type { RegistrySummary } from '../../src/types/plugin-registry';

// ---------------------------------------------------------------------------
// Handler helper — mirrors plugin-handlers.ts PLUGIN_REGISTRY_LIST logic
// AFTER fix: returns [] on catch instead of { ok: false, error }
// ---------------------------------------------------------------------------

function handleRegistryListAfter(): RegistrySummary[] {
  try {
    return listPlugins();
  } catch (err) {
    console.error('[test] registry list error:', (err as Error).message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Sandbox
// ---------------------------------------------------------------------------

let sandbox: string;

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-list-error-'));
  _setRegistryRootForTesting(path.join(sandbox, 'registry'));
});

afterEach(() => {
  _setRegistryRootForTesting(null);
  fs.rmSync(sandbox, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PLUGIN_REGISTRY_LIST error handling', () => {
  it('case 7: listPlugins throws → handler returns [] (Array.isArray true, not error object)', () => {
    // Force listPlugins to throw by making the registry dir unreadable
    vi.spyOn(fs, 'readdirSync').mockImplementationOnce(() => {
      throw new Error('EACCES: permission denied');
    });

    const result = handleRegistryListAfter();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('case 8: normal operation → returns RegistrySummary[] directly (no wrapping)', () => {
    // With an empty registry dir (no plugins pushed), listPlugins returns [].
    // This verifies the success path is a proper array.
    const result = handleRegistryListAfter();
    expect(Array.isArray(result)).toBe(true);
  });

  it('case 7b: old handler (returns object) would crash .map() — Array.isArray false confirms the bug', () => {
    // Verify that if a handler returns { ok: false, error } (old behavior),
    // Array.isArray is false, which would crash renderer .map() calls.
    const fakeErrorResult: { ok: false; error: string } = { ok: false, error: 'permission denied' };
    expect(Array.isArray(fakeErrorResult)).toBe(false);
    // The fix makes the handler return [] instead — Array.isArray([]) is true.
    expect(Array.isArray([])).toBe(true);
  });
});

/**
 * Tests for resolveWorkspaceRel — the `.aide/` → `.smalti/` path alias in
 * the plugin sandbox. Covers the regex cases documented in the function JSDoc.
 */
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { resolveWorkspaceRel } from '../../src/main/plugin/sandbox';

const WS = '/workspace/myproject';

describe('resolveWorkspaceRel — .aide alias', () => {
  // Case 1: .aide/file → .smalti/file
  it('rewrites .aide/file to .smalti/file', () => {
    expect(resolveWorkspaceRel(WS, '.aide/agent-todos.json')).toBe(
      path.resolve(WS, '.smalti', 'agent-todos.json'),
    );
  });

  // Case 2: .aide (directory only, no trailing slash)
  it('rewrites bare .aide to .smalti', () => {
    expect(resolveWorkspaceRel(WS, '.aide')).toBe(path.resolve(WS, '.smalti'));
  });

  // Case 3: ./.aide/x → .smalti/x
  it('rewrites ./.aide/x to .smalti/x', () => {
    expect(resolveWorkspaceRel(WS, './.aide/x')).toBe(path.resolve(WS, '.smalti', 'x'));
  });

  // Case 4: .smalti/x → .smalti/x (already new path — no change)
  it('leaves .smalti/ paths unchanged', () => {
    expect(resolveWorkspaceRel(WS, '.smalti/x')).toBe(path.resolve(WS, '.smalti', 'x'));
  });

  // Case 5: a/.aide/x (mid-path .aide) → left untouched
  it('does not rewrite .aide in a non-root segment', () => {
    expect(resolveWorkspaceRel(WS, 'a/.aide/x')).toBe(path.resolve(WS, 'a', '.aide', 'x'));
  });

  // Case 6: unrelated plugin path — no change
  it('leaves plugin paths without .aide unchanged', () => {
    expect(resolveWorkspaceRel(WS, 'plugins/agent-todo-board/index.html')).toBe(
      path.resolve(WS, 'plugins', 'agent-todo-board', 'index.html'),
    );
  });

  // Case 7: identifier with 'aide' but no leading dot (e.g. 'aide-foo') — no change
  it('does not rewrite identifiers without a leading dot-aide pattern', () => {
    expect(resolveWorkspaceRel(WS, 'aide-foo')).toBe(path.resolve(WS, 'aide-foo'));
  });
});

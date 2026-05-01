import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePluginStore } from '../../src/renderer/stores/plugin-store';

// Phase 4 — modifiedFiles UI lazy fetch
// Store action shape: getModifiedFiles(pluginName) → Promise<string[]>
// Wraps window.aide.plugin.registry.modifiedFiles, gracefully returns
// [] on transport error so the UpdateConfirmDialog can still render
// without the file list.

const modifiedFilesMock = vi.fn();

beforeEach(() => {
  modifiedFilesMock.mockReset();
  (globalThis as unknown as { window: { aide: unknown } }).window = {
    ...((globalThis as unknown as { window?: object }).window ?? {}),
    aide: {
      plugin: {
        registry: {
          modifiedFiles: modifiedFilesMock,
        },
      },
    },
  } as unknown as typeof window;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('plugin-store getModifiedFiles', () => {
  it('exposes a getModifiedFiles action', () => {
    const store = usePluginStore.getState() as unknown as Record<string, unknown>;
    expect(typeof store.getModifiedFiles).toBe('function');
  });

  it('forwards the plugin name to the IPC and returns the resolved array', async () => {
    modifiedFilesMock.mockResolvedValue([
      'modified src/index.js',
      'added src/utils/new.js',
    ]);
    const store = usePluginStore.getState() as unknown as {
      getModifiedFiles: (name: string) => Promise<string[]>;
    };
    const result = await store.getModifiedFiles('tail-errors');
    expect(modifiedFilesMock).toHaveBeenCalledWith('tail-errors');
    expect(result).toEqual([
      'modified src/index.js',
      'added src/utils/new.js',
    ]);
  });

  it('returns [] gracefully when the IPC throws', async () => {
    modifiedFilesMock.mockRejectedValue(new Error('boom'));
    const store = usePluginStore.getState() as unknown as {
      getModifiedFiles: (name: string) => Promise<string[]>;
    };
    const result = await store.getModifiedFiles('tail-errors');
    expect(result).toEqual([]);
  });

  it('returns [] when the IPC resolves to a non-array (defensive)', async () => {
    modifiedFilesMock.mockResolvedValue(undefined as unknown as string[]);
    const store = usePluginStore.getState() as unknown as {
      getModifiedFiles: (name: string) => Promise<string[]>;
    };
    const result = await store.getModifiedFiles('tail-errors');
    expect(result).toEqual([]);
  });
});

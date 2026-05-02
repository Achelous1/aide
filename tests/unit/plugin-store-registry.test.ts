import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PluginInfo } from '../../src/types/ipc';
import type { RegistryDiff, RegistrySummary } from '../../src/types/plugin-registry';

// --- Mock collaborator stores so plugin-store imports don't blow up.
vi.mock('../../src/renderer/stores/layout-store', () => ({
  useLayoutStore: {
    getState: () => ({
      getAllPanes: () => [],
      getFocusedPane: () => null,
      addTabToPane: vi.fn(),
      removeTabFromPane: vi.fn(),
      saveSession: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));
vi.mock('../../src/renderer/stores/terminal-store', () => ({
  useTerminalStore: {
    getState: () => ({ addTab: vi.fn(), removeTab: vi.fn() }),
  },
}));
vi.mock('../../src/renderer/stores/plugin-deactivate-guard', () => ({
  deactivatingPluginIds: new Set<string>(),
}));
vi.mock('../../src/renderer/stores/workspace-store', () => ({
  useWorkspaceStore: {
    getState: () => ({ activeWorkspaceId: null }),
  },
}));

interface MockApi {
  list: ReturnType<typeof vi.fn>;
  registryList: ReturnType<typeof vi.fn>;
  registryDiff: ReturnType<typeof vi.fn>;
  registryPull: ReturnType<typeof vi.fn>;
  registryPush: ReturnType<typeof vi.fn>;
  registryRemove: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

function setupWindow(): MockApi {
  const api: MockApi = {
    list: vi.fn().mockResolvedValue([] as PluginInfo[]),
    registryList: vi.fn().mockResolvedValue([] as RegistrySummary[]),
    registryDiff: vi.fn(),
    registryPull: vi.fn().mockResolvedValue({ ok: true, pluginPath: '/x', contentHash: 'h' }),
    registryPush: vi.fn().mockResolvedValue({ ok: true }),
    registryRemove: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  (globalThis as unknown as { window: object }).window = {
    aide: {
      plugin: {
        list: api.list,
        delete: api.delete,
        activate: vi.fn(),
        deactivate: vi.fn(),
        generate: vi.fn(),
        registry: {
          list: api.registryList,
          diff: api.registryDiff,
          pull: api.registryPull,
          push: api.registryPush,
          remove: api.registryRemove,
        },
      },
    },
  } as unknown as Window;
  return api;
}

const mkPlugin = (name: string, id = `plugin-${name}`): PluginInfo => ({
  id,
  name,
  version: '0.1.0',
  description: '',
  active: false,
  tools: [],
});

const mkDiff = (
  registryId: string,
  status: RegistryDiff['status'],
  latest = '0.2.0',
  installed = '0.1.0'
): RegistryDiff => ({
  registryId,
  status,
  installedVersion: installed,
  latestVersion: latest,
  installedContentHash: 'sha256:installed',
  workspaceContentHash: 'sha256:workspace',
});

describe('plugin-store registry actions', () => {
  let api: MockApi;
  // Re-import store fresh per test so state doesn't leak.
  let store: typeof import('../../src/renderer/stores/plugin-store').usePluginStore;

  beforeEach(async () => {
    vi.resetModules();
    api = setupWindow();
    const mod = await import('../../src/renderer/stores/plugin-store');
    store = mod.usePluginStore;
  });

  it('refreshRegistryDiffs fetches diff for each plugin', async () => {
    api.list.mockResolvedValue([mkPlugin('a'), mkPlugin('b')]);
    api.registryDiff.mockImplementation((name: string) =>
      Promise.resolve(mkDiff(`reg-${name}`, 'synced'))
    );

    await store.getState().loadPlugins();
    // refreshRegistryDiffs is fired inside loadPlugins (best-effort void).
    // Wait one microtask cycle.
    await Promise.resolve();
    await Promise.resolve();
    await store.getState().refreshRegistryDiffs();

    expect(api.registryDiff).toHaveBeenCalledWith('a');
    expect(api.registryDiff).toHaveBeenCalledWith('b');
    const diffs = store.getState().registryDiffs;
    expect(diffs.a?.status).toBe('synced');
    expect(diffs.b?.status).toBe('synced');
  });

  it('refreshRegistryDiffs empties record when no plugins', async () => {
    await store.getState().refreshRegistryDiffs();
    expect(store.getState().registryDiffs).toEqual({});
  });

  it('applyUpdate calls registry.pull with latest version and target name and overwrite:true', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'update-available', '0.3.0'));

    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();
    await store.getState().applyUpdate('a');

    expect(api.registryPull).toHaveBeenCalledWith('reg-a', '0.3.0', 'a', { overwrite: true });
  });

  it('applyUpdate throws when registry pull returns not ok', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'update-available'));
    api.registryPull.mockResolvedValueOnce({ ok: false, reason: 'corrupt' });
    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();
    await expect(store.getState().applyUpdate('a')).rejects.toThrow(/corrupt/);
  });

  it('forkAsNew pulls into newName and optionally restores original', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'locally-modified'));
    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();

    await store.getState().forkAsNew('a', {
      newName: 'a-fork',
      restoreOriginal: true,
    });

    // First call: clone original into new name (using installed/version as base) — no overwrite (fresh name)
    expect(api.registryPull).toHaveBeenNthCalledWith(1, 'reg-a', '0.1.0', 'a-fork');
    // Second call: restore original to upstream (latest) — overwrite:true required
    expect(api.registryPull).toHaveBeenNthCalledWith(2, 'reg-a', '0.2.0', 'a', { overwrite: true });
  });

  it('forkAsNew skips restore call when restoreOriginal=false', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'locally-modified'));
    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();

    await store.getState().forkAsNew('a', {
      newName: 'a-fork',
      restoreOriginal: false,
    });

    expect(api.registryPull).toHaveBeenCalledTimes(1);
    expect(api.registryPull).toHaveBeenCalledWith('reg-a', '0.1.0', 'a-fork');
  });

  it('publish returns null on success', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryPush.mockResolvedValue({ ok: true });
    await store.getState().loadPlugins();
    const result = await store.getState().publish('a', true);
    expect(result).toBeNull();
    expect(api.registryPush).toHaveBeenCalledWith('a', { bumpPatch: true });
  });

  it('publish surfaces pull-latest-first conflict from structured response', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'update-available', '0.3.0', '0.2.0'));
    api.registryPush.mockResolvedValue({
      ok: false,
      reason: 'pull-latest-first',
      workspaceVersion: '0.2.0',
      registryVersion: '0.3.0',
    });
    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();
    const result = await store.getState().publish('a');
    expect(result).not.toBeNull();
    expect(result?.reason).toBe('pull-latest-first');
    expect(result?.registryVersion).toBe('0.3.0');
  });

  it('publish surfaces pull-latest-first conflict from thrown error message', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'update-available', '0.3.0'));
    api.registryPush.mockRejectedValue(new Error('pull-latest-first: registry newer'));
    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();
    const result = await store.getState().publish('a');
    expect(result?.reason).toBe('pull-latest-first');
    expect(result?.registryVersion).toBe('0.3.0');
  });

  it('importFromRegistry calls pull and reloads plugins', async () => {
    api.list.mockResolvedValue([]);
    await store.getState().importFromRegistry('reg-x', 'imported');
    expect(api.registryPull).toHaveBeenCalledWith('reg-x', undefined, 'imported');
    expect(api.list).toHaveBeenCalled();
  });

  it('importFromRegistry throws when pull fails', async () => {
    api.registryPull.mockResolvedValueOnce({ ok: false, reason: 'name-conflict' });
    await expect(store.getState().importFromRegistry('reg-x')).rejects.toThrow(/name-conflict/);
  });

  it('refreshRegistrySummaries populates summaries', async () => {
    const summaries: RegistrySummary[] = [
      { id: 'reg-a', name: 'a', description: 'd', latest: '1.0.0' },
    ];
    api.registryList.mockResolvedValue(summaries);
    await store.getState().refreshRegistrySummaries();
    expect(store.getState().registrySummaries).toEqual(summaries);
  });
});

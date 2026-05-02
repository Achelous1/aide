/**
 * TDD tests for applyUpdate and forkAsNew(restoreOriginal=true) passing
 * { overwrite: true } to registry.pull.
 *
 * Cases 5 & 6 from the hotfix spec.
 */
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
  installed = '0.1.0',
): RegistryDiff => ({
  registryId,
  status,
  installedVersion: installed,
  latestVersion: latest,
  installedContentHash: 'sha256:installed',
  workspaceContentHash: 'sha256:workspace',
});

describe('plugin-store update flows pass overwrite:true', () => {
  let api: MockApi;
  let store: typeof import('../../src/renderer/stores/plugin-store').usePluginStore;

  beforeEach(async () => {
    vi.resetModules();
    api = setupWindow();
    const mod = await import('../../src/renderer/stores/plugin-store');
    store = mod.usePluginStore;
  });

  it('case 5: applyUpdate calls registry.pull with { overwrite: true }', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'update-available', '0.3.0'));

    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();
    await store.getState().applyUpdate('a');

    expect(api.registryPull).toHaveBeenCalledWith('reg-a', '0.3.0', 'a', { overwrite: true });
  });

  it('case 6: forkAsNew(restoreOriginal=true) second pull (restore) passes { overwrite: true }', async () => {
    api.list.mockResolvedValue([mkPlugin('a')]);
    api.registryDiff.mockResolvedValue(mkDiff('reg-a', 'locally-modified', '0.2.0', '0.1.0'));

    await store.getState().loadPlugins();
    await store.getState().refreshRegistryDiffs();

    await store.getState().forkAsNew('a', {
      newName: 'a-fork',
      restoreOriginal: true,
    });

    // First call: fork to new name — no overwrite (fresh name, conflict protection intact)
    expect(api.registryPull).toHaveBeenNthCalledWith(1, 'reg-a', '0.1.0', 'a-fork');
    // Second call: restore original to upstream — must pass overwrite:true
    expect(api.registryPull).toHaveBeenNthCalledWith(2, 'reg-a', '0.2.0', 'a', { overwrite: true });
  });
});

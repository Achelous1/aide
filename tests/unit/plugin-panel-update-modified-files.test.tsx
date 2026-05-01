import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { PluginPanel } from '../../src/renderer/components/plugin/PluginPanel';
import { usePluginStore } from '../../src/renderer/stores/plugin-store';

// Phase 4 — modifiedFiles UI integration test.
// Asserts that opening the Update dialog on a locally-modified plugin
// triggers a window.aide.plugin.registry.modifiedFiles call and the
// dialog renders the returned file rows.
//
// TDD note: this test is written before the wiring exists; it MUST fail
// against current PluginPanel before the implementation lands.

const PLUGIN = {
  id: 'plg-1',
  name: 'tail-errors',
  description: 'Tail build logs',
  version: '0.1.0',
  active: false,
  permissions: [],
  tools: [],
};

const modifiedFilesMock = vi.fn();
const diffMock = vi.fn();

beforeEach(() => {
  modifiedFilesMock.mockReset().mockResolvedValue([
    'modified src/index.js',
    'added src/utils/new.js',
  ]);
  // PluginPanel's loadPlugins() effect triggers refreshRegistryDiffs which
  // calls window.aide.plugin.registry.diff(name) — the seeded store state
  // would be overwritten with the mock's resolved value, so the mock must
  // return the same locally-modified diff to keep the action menu showing
  // the Update item.
  diffMock.mockReset().mockResolvedValue({
    registryId: 'plugin-aaa',
    status: 'locally-modified',
    installedVersion: '0.1.0',
    latestVersion: '0.2.0',
    installedContentHash: 'sha256:old',
    workspaceContentHash: 'sha256:dirty',
  });
  const onChangedUnsub = vi.fn();
  (globalThis as unknown as { window: { aide: unknown } }).window = {
    ...((globalThis as unknown as { window?: object }).window ?? {}),
    aide: {
      plugin: {
        list: vi.fn().mockResolvedValue([PLUGIN]),
        onChanged: vi.fn().mockReturnValue(onChangedUnsub),
        registry: {
          list: vi.fn().mockResolvedValue([]),
          diff: diffMock,
          modifiedFiles: modifiedFilesMock,
        },
      },
    },
  } as unknown as typeof window;

  // Seed the store with one plugin in locally-modified state. The Update
  // menu item only renders for non-synced plugins, so we need a non-null
  // diff with status 'locally-modified'.
  usePluginStore.setState({
    plugins: [PLUGIN],
    loading: false,
    error: null,
    generating: false,
    generateError: null,
    registryDiffs: {
      'tail-errors': {
        registryId: 'plugin-aaa',
        status: 'locally-modified',
        installedVersion: '0.1.0',
        latestVersion: '0.2.0',
        installedContentHash: 'sha256:old',
        workspaceContentHash: 'sha256:dirty',
      },
    },
    registrySummaries: [],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PluginPanel — Update dialog lazy fetches modifiedFiles', () => {
  it('calls registry.modifiedFiles when the Update dialog is opened on a locally-modified plugin', async () => {
    const { findByTestId, findByText } = render(<PluginPanel />);

    const actionsBtn = await findByTestId(`plugin-actions-${PLUGIN.id}`);
    await act(async () => {
      fireEvent.click(actionsBtn);
    });
    const updateItem = await findByText(/Update to latest \(discard local\)/);
    await act(async () => {
      fireEvent.click(updateItem);
    });

    // Wait for the dialog to render its fetched content — this guarantees
    // both the effect ran and the mock was invoked. Asserting on the mock
    // call args directly without this anchor is racy under happy-dom.
    await findByText('modified src/index.js');
    expect(modifiedFilesMock).toHaveBeenCalledWith('tail-errors');
  });

  it('renders the fetched modified file rows inside the dialog', async () => {
    const { findByTestId, findByText } = render(<PluginPanel />);

    const actionsBtn = await findByTestId(`plugin-actions-${PLUGIN.id}`);
    await act(async () => {
      fireEvent.click(actionsBtn);
    });
    const updateItem = await findByText(/Update to latest \(discard local\)/);
    await act(async () => {
      fireEvent.click(updateItem);
    });

    expect(await findByText('modified src/index.js')).toBeTruthy();
    expect(await findByText('added src/utils/new.js')).toBeTruthy();
  });

  it('still opens the dialog (without the file list) when the IPC fails', async () => {
    modifiedFilesMock.mockRejectedValue(new Error('registry unreachable'));
    const { findByTestId, findByText, queryByText } = render(<PluginPanel />);

    const actionsBtn = await findByTestId(`plugin-actions-${PLUGIN.id}`);
    await act(async () => {
      fireEvent.click(actionsBtn);
    });
    const updateItem = await findByText(/Update to latest \(discard local\)/);
    await act(async () => {
      fireEvent.click(updateItem);
    });

    // Dialog header is unconditional, so it should appear regardless.
    expect(await findByText(/Update will overwrite local changes/)).toBeTruthy();
    // No spurious file rows.
    expect(queryByText('modified src/index.js')).toBeNull();
  });
});

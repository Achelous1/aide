import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { RegistryBrowser } from '../../src/renderer/components/plugin/registry/RegistryBrowser';
import type { RegistrySummary } from '../../src/types/plugin-registry';

const SUMMARIES: RegistrySummary[] = [
  { id: 'plugin-aaa', name: 'tail-errors', description: 'Tail build logs', latest: '0.2.0' },
  { id: 'plugin-bbb', name: 'git-context', description: 'Inject git diff', latest: '0.1.4' },
];

beforeEach(() => {
  (globalThis as unknown as { window: { aide: unknown } }).window = {
    ...((globalThis as unknown as { window?: object }).window ?? {}),
    aide: {
      plugin: {
        registry: {
          list: vi.fn().mockResolvedValue(SUMMARIES),
        },
      },
    },
  } as unknown as typeof window;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RegistryBrowser', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <RegistryBrowser
        open={false}
        onClose={() => {}}
        installedNames={new Set()}
        onImport={() => {}}
      />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('lists registry plugins after open', async () => {
    const { findByText } = render(
      <RegistryBrowser
        open
        onClose={() => {}}
        installedNames={new Set()}
        onImport={() => {}}
      />
    );
    expect(await findByText('tail-errors')).toBeTruthy();
    expect(await findByText('git-context')).toBeTruthy();
  });

  it('shows "Installed" label for already-installed plugins', async () => {
    const { findByTestId, queryByTestId } = render(
      <RegistryBrowser
        open
        onClose={() => {}}
        installedNames={new Set(['tail-errors'])}
        onImport={() => {}}
      />
    );
    expect(await findByTestId('registry-installed-plugin-aaa')).toBeTruthy();
    expect(queryByTestId('registry-import-plugin-aaa')).toBeNull();
    expect(await findByTestId('registry-import-plugin-bbb')).toBeTruthy();
  });

  it('invokes onImport with correct id when Import clicked', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    const { findByTestId } = render(
      <RegistryBrowser
        open
        onClose={() => {}}
        installedNames={new Set()}
        onImport={onImport}
      />
    );
    const importBtn = await findByTestId('registry-import-plugin-bbb');
    await act(async () => {
      fireEvent.click(importBtn);
    });
    expect(onImport).toHaveBeenCalledWith('plugin-bbb');
  });

  it('filters by Installed category', async () => {
    const { findByTestId, queryByText, queryByTestId } = render(
      <RegistryBrowser
        open
        onClose={() => {}}
        installedNames={new Set(['tail-errors'])}
        onImport={() => {}}
      />
    );
    // Wait for initial render
    expect(await findByTestId('registry-card-plugin-aaa')).toBeTruthy();
    await act(async () => {
      fireEvent.click(await findByTestId('registry-category-installed'));
    });
    expect(queryByText('git-context')).toBeNull();
    expect(queryByTestId('registry-card-plugin-aaa')).toBeTruthy();
  });
});

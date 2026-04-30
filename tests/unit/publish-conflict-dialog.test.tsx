import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import { PublishConflictDialog } from '../../src/renderer/components/plugin/registry/dialogs/PublishConflictDialog';

afterEach(() => cleanup());

const baseProps = {
  open: true,
  pluginName: 'tail-errors',
  workspaceVersion: '0.2.0',
  registryVersion: '0.3.0',
};

describe('PublishConflictDialog', () => {
  it('shows both versions in compare boxes', () => {
    const { getByText, getAllByText } = render(
      <PublishConflictDialog
        {...baseProps}
        onClose={() => {}}
        onPullLatest={vi.fn()}
      />
    );
    expect(getByText('Pull latest before publishing')).toBeTruthy();
    // versions appear in both the body sentence and the compare box
    expect(getAllByText('0.2.0').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('0.3.0').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Your base')).toBeTruthy();
    expect(getByText('Registry latest')).toBeTruthy();
  });

  it('Cancel calls onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <PublishConflictDialog
        {...baseProps}
        onClose={onClose}
        onPullLatest={vi.fn()}
      />
    );
    fireEvent.click(getByTestId('publish-conflict-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Pull latest invokes onPullLatest then closes', async () => {
    const onPullLatest = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { getByTestId } = render(
      <PublishConflictDialog
        {...baseProps}
        onClose={onClose}
        onPullLatest={onPullLatest}
      />
    );
    await act(async () => {
      fireEvent.click(getByTestId('publish-conflict-pull'));
    });
    await waitFor(() => {
      expect(onPullLatest).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

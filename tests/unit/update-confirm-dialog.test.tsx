import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import { UpdateConfirmDialog } from '../../src/renderer/components/plugin/registry/dialogs/UpdateConfirmDialog';

afterEach(() => cleanup());

const baseProps = {
  open: true,
  pluginName: 'tail-errors',
  latestVersion: '0.2.1',
  modifiedFiles: ['src/index.js', 'tool.json'],
};

describe('UpdateConfirmDialog', () => {
  it('renders title, plugin name, version, and modified files', () => {
    const { getByText, getAllByText } = render(
      <UpdateConfirmDialog
        {...baseProps}
        onClose={() => {}}
        onConfirm={vi.fn()}
        onForkInstead={() => {}}
      />
    );
    expect(getByText(/Update will overwrite local changes/)).toBeTruthy();
    expect(getByText('tail-errors')).toBeTruthy();
    expect(getByText('0.2.1')).toBeTruthy();
    expect(getByText('src/index.js')).toBeTruthy();
    expect(getByText('tool.json')).toBeTruthy();
    // both files render "modified" label
    expect(getAllByText('modified').length).toBe(2);
  });

  it('Cancel button calls onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <UpdateConfirmDialog
        {...baseProps}
        onClose={onClose}
        onConfirm={vi.fn()}
        onForkInstead={() => {}}
      />
    );
    fireEvent.click(getByTestId('update-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Fork instead button calls onForkInstead', () => {
    const onForkInstead = vi.fn();
    const { getByTestId } = render(
      <UpdateConfirmDialog
        {...baseProps}
        onClose={() => {}}
        onConfirm={vi.fn()}
        onForkInstead={onForkInstead}
      />
    );
    fireEvent.click(getByTestId('update-fork-instead'));
    expect(onForkInstead).toHaveBeenCalled();
  });

  it('Discard & update calls onConfirm and then onClose', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { getByTestId } = render(
      <UpdateConfirmDialog
        {...baseProps}
        onClose={onClose}
        onConfirm={onConfirm}
        onForkInstead={() => {}}
      />
    );
    await act(async () => {
      fireEvent.click(getByTestId('update-discard'));
    });
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

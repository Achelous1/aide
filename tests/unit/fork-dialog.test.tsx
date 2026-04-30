import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import { ForkAsNewPluginDialog } from '../../src/renderer/components/plugin/registry/dialogs/ForkAsNewPluginDialog';

afterEach(() => cleanup());

const baseProps = {
  open: true,
  onClose: () => {},
  originalPluginName: 'tail-errors',
  originalPluginId: 'plugin-x',
};

describe('ForkAsNewPluginDialog', () => {
  it('seeds new name and description from original', () => {
    const { getByTestId } = render(
      <ForkAsNewPluginDialog {...baseProps} onConfirm={vi.fn()} />
    );
    const name = getByTestId('fork-name-input') as HTMLInputElement;
    const desc = getByTestId('fork-description-input') as HTMLInputElement;
    expect(name.value).toBe('tail-errors-fork');
    expect(desc.value).toBe('Custom variant of tail-errors');
  });

  it('toggles restoreOriginal radio', () => {
    const { getByTestId } = render(
      <ForkAsNewPluginDialog {...baseProps} onConfirm={vi.fn()} />
    );
    const restore = getByTestId('fork-restore-original') as HTMLInputElement;
    const keep = getByTestId('fork-keep-original') as HTMLInputElement;
    expect(keep.checked).toBe(true);
    fireEvent.click(restore);
    expect(restore.checked).toBe(true);
    expect(keep.checked).toBe(false);
  });

  it('calls onConfirm with chosen values when Fork clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { getByTestId } = render(
      <ForkAsNewPluginDialog
        {...baseProps}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );
    const name = getByTestId('fork-name-input') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'my-fork' } });
    fireEvent.click(getByTestId('fork-restore-original'));
    await act(async () => {
      fireEvent.click(getByTestId('fork-confirm'));
    });
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        newName: 'my-fork',
        newDescription: 'Custom variant of tail-errors',
        restoreOriginal: true,
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('disables Fork button when name is empty', () => {
    const { getByTestId } = render(
      <ForkAsNewPluginDialog {...baseProps} onConfirm={vi.fn()} />
    );
    const name = getByTestId('fork-name-input') as HTMLInputElement;
    fireEvent.change(name, { target: { value: '   ' } });
    const btn = getByTestId('fork-confirm') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

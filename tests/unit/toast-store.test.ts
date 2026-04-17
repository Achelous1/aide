import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from '../../src/renderer/stores/toast-store';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('push adds a toast with generated id and createdAt', () => {
    const { push } = useToastStore.getState();
    push({ kind: 'error', title: 'Something went wrong' });

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBeTruthy();
    expect(typeof toasts[0].id).toBe('string');
    expect(toasts[0].createdAt).toBeGreaterThan(0);
    expect(toasts[0].kind).toBe('error');
    expect(toasts[0].title).toBe('Something went wrong');
  });

  it('push preserves detail field', () => {
    useToastStore.getState().push({ kind: 'warning', title: 'Warning', detail: 'some detail' });
    const { toasts } = useToastStore.getState();
    expect(toasts[0].detail).toBe('some detail');
  });

  it('dismiss removes the toast with matching id', () => {
    const { push, dismiss } = useToastStore.getState();
    push({ kind: 'info', title: 'First' });
    push({ kind: 'info', title: 'Second' });

    const { toasts: before } = useToastStore.getState();
    expect(before).toHaveLength(2);

    const idToRemove = before[0].id;
    dismiss(idToRemove);

    const { toasts: after } = useToastStore.getState();
    expect(after).toHaveLength(1);
    expect(after[0].id).not.toBe(idToRemove);
    expect(after[0].title).toBe('Second');
  });

  it('dismiss with unknown id leaves toasts unchanged', () => {
    useToastStore.getState().push({ kind: 'error', title: 'Test' });
    useToastStore.getState().dismiss('non-existent-id');
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('multiple pushes preserve insertion order', () => {
    const { push } = useToastStore.getState();
    push({ kind: 'info', title: 'A' });
    push({ kind: 'warning', title: 'B' });
    push({ kind: 'error', title: 'C' });

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(3);
    expect(toasts[0].title).toBe('A');
    expect(toasts[1].title).toBe('B');
    expect(toasts[2].title).toBe('C');
  });

  it('each push generates a unique id', () => {
    const { push } = useToastStore.getState();
    push({ kind: 'info', title: 'X' });
    push({ kind: 'info', title: 'Y' });

    const { toasts } = useToastStore.getState();
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });
});

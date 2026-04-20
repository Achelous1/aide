import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { Tooltip } from '../../src/renderer/components/ui/Tooltip';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Tooltip', () => {
  it('renders children always', () => {
    const { getByText } = render(
      <Tooltip content="tip text">
        <button>child</button>
      </Tooltip>
    );
    expect(getByText('child')).toBeTruthy();
  });

  it('tooltip is not in DOM initially', () => {
    const { queryByRole } = render(
      <Tooltip content="tip text">
        <button>child</button>
      </Tooltip>
    );
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('shows tooltip with content after mouseenter + delay', async () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="tip text">
        <button>child</button>
      </Tooltip>
    );
    const wrapper = getByText('child').closest('[data-tooltip-wrapper]') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    // before delay: still hidden
    expect(queryByRole('tooltip')).toBeNull();
    // advance past 200ms delay
    act(() => { vi.advanceTimersByTime(250); });
    expect(queryByRole('tooltip')).toBeTruthy();
    expect(queryByRole('tooltip')?.textContent).toBe('tip text');
  });

  it('hides tooltip after mouseleave', async () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="tip text">
        <button>child</button>
      </Tooltip>
    );
    const wrapper = getByText('child').closest('[data-tooltip-wrapper]') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    act(() => { vi.advanceTimersByTime(250); });
    expect(queryByRole('tooltip')).toBeTruthy();

    fireEvent.mouseLeave(wrapper);
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('shows tooltip on focus (keyboard a11y)', () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="focus tip">
        <button>child</button>
      </Tooltip>
    );
    const wrapper = getByText('child').closest('[data-tooltip-wrapper]') as HTMLElement;
    fireEvent.focus(wrapper);
    act(() => { vi.advanceTimersByTime(250); });
    expect(queryByRole('tooltip')).toBeTruthy();
  });

  it('hides tooltip on blur', () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="focus tip">
        <button>child</button>
      </Tooltip>
    );
    const wrapper = getByText('child').closest('[data-tooltip-wrapper]') as HTMLElement;
    fireEvent.focus(wrapper);
    act(() => { vi.advanceTimersByTime(250); });
    expect(queryByRole('tooltip')).toBeTruthy();

    fireEvent.blur(wrapper);
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('sets aria-describedby on wrapper pointing to tooltip when open', () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="aria tip">
        <button>child</button>
      </Tooltip>
    );
    const wrapper = getByText('child').closest('[data-tooltip-wrapper]') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    act(() => { vi.advanceTimersByTime(250); });
    // Tooltip is portal-rendered into document.body — use queryByRole which searches full document
    const tooltipEl = queryByRole('tooltip') as HTMLElement;
    expect(tooltipEl).toBeTruthy();
    expect(wrapper.getAttribute('aria-describedby')).toBe(tooltipEl.id);
  });

  it('cancels pending show when mouse leaves before delay', () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="hi"><button>x</button></Tooltip>
    );
    const trigger = getByText('x').closest('[data-tooltip-wrapper]') as HTMLElement;
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    act(() => { vi.advanceTimersByTime(500); });
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('clears pending timer on unmount', () => {
    const { getByText, unmount } = render(
      <Tooltip content="hi"><button>x</button></Tooltip>
    );
    fireEvent.mouseEnter(getByText('x').closest('[data-tooltip-wrapper]') as HTMLElement);
    unmount();
    expect(() => { act(() => { vi.advanceTimersByTime(500); }); }).not.toThrow();
  });

  it('dismisses tooltip on ESC keydown', () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="hi"><button>x</button></Tooltip>
    );
    const wrapper = getByText('x').closest('[data-tooltip-wrapper]') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    act(() => { vi.advanceTimersByTime(250); });
    expect(queryByRole('tooltip')).not.toBeNull();
    fireEvent.keyDown(wrapper, { key: 'Escape' });
    expect(queryByRole('tooltip')).toBeNull();
  });
});

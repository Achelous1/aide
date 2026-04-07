import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StatusDot, StatusBadge, BouncingDots } from '../../src/renderer/components/workspace/StatusIndicator';

afterEach(() => {
  cleanup();
});

describe('StatusDot', () => {
  describe('idle', () => {
    it('renders a blue ● character', () => {
      const { getByTestId } = render(<StatusDot status="idle" />);
      const dot = getByTestId('status-dot');
      expect(dot.getAttribute('data-status')).toBe('idle');
      expect(dot.textContent).toBe('●');
      expect(dot.getAttribute('style')).toContain('#3B82F6');
    });

    it('applies status-ding animation class', () => {
      const { getByTestId } = render(<StatusDot status="idle" />);
      expect(getByTestId('status-dot').className).toContain('status-ding');
    });
  });

  describe('processing', () => {
    it('renders bouncing dots (not the idle ● or awaiting ?)', () => {
      const { getByTestId, queryByText } = render(<StatusDot status="processing" />);
      const dot = getByTestId('status-dot');
      expect(dot.getAttribute('data-status')).toBe('processing');
      // Should contain the bouncing-dots container, NOT text content
      expect(getByTestId('bouncing-dots')).toBeTruthy();
      expect(queryByText('●')).toBeNull();
      expect(queryByText('?')).toBeNull();
    });

    it('renders exactly three bouncing dot spans', () => {
      const { getByTestId } = render(<StatusDot status="processing" />);
      const container = getByTestId('bouncing-dots');
      const dots = container.querySelectorAll('.dot-bounce');
      expect(dots.length).toBe(3);
    });
  });

  describe('awaiting-input', () => {
    it('renders a yellow ? character', () => {
      const { getByTestId } = render(<StatusDot status="awaiting-input" />);
      const dot = getByTestId('status-dot');
      expect(dot.getAttribute('data-status')).toBe('awaiting-input');
      expect(dot.textContent).toBe('?');
      expect(dot.getAttribute('style')).toContain('#F59E0B');
    });

    it('applies font-bold class for visibility', () => {
      const { getByTestId } = render(<StatusDot status="awaiting-input" />);
      expect(getByTestId('status-dot').className).toContain('font-bold');
    });

    it('applies status-ding animation class', () => {
      const { getByTestId } = render(<StatusDot status="awaiting-input" />);
      expect(getByTestId('status-dot').className).toContain('status-ding');
    });
  });

  describe('status remount', () => {
    it('changes data-status when prop changes', () => {
      const { getByTestId, rerender } = render(<StatusDot status="idle" />);
      expect(getByTestId('status-dot').getAttribute('data-status')).toBe('idle');

      rerender(<StatusDot status="processing" />);
      expect(getByTestId('status-dot').getAttribute('data-status')).toBe('processing');

      rerender(<StatusDot status="awaiting-input" />);
      expect(getByTestId('status-dot').getAttribute('data-status')).toBe('awaiting-input');
      expect(getByTestId('status-dot').textContent).toBe('?');
    });
  });
});

describe('StatusBadge', () => {
  describe('idle', () => {
    it('renders a blue circle badge with no text content', () => {
      const { getByTestId } = render(<StatusBadge status="idle" />);
      const badge = getByTestId('status-badge');
      expect(badge.getAttribute('data-status')).toBe('idle');
      expect(badge.className).toContain('bg-[#3B82F6]');
      expect(badge.textContent).toBe('');
    });
  });

  describe('processing', () => {
    it('renders a yellow badge containing bouncing dots', () => {
      const { getByTestId } = render(<StatusBadge status="processing" />);
      const badge = getByTestId('status-badge');
      expect(badge.getAttribute('data-status')).toBe('processing');
      expect(badge.className).toContain('bg-[#F59E0B]');
      expect(getByTestId('bouncing-dots')).toBeTruthy();
    });
  });

  describe('awaiting-input', () => {
    it('renders a yellow badge containing a ? character', () => {
      const { getByTestId } = render(<StatusBadge status="awaiting-input" />);
      const badge = getByTestId('status-badge');
      expect(badge.getAttribute('data-status')).toBe('awaiting-input');
      expect(badge.className).toContain('bg-[#F59E0B]');
      expect(badge.textContent).toBe('?');
    });

    it('uses bold black text for the ?', () => {
      const { getByTestId } = render(<StatusBadge status="awaiting-input" />);
      const badge = getByTestId('status-badge');
      const innerSpan = badge.querySelector('span');
      expect(innerSpan?.className).toContain('font-bold');
      expect(innerSpan?.className).toContain('text-black');
    });
  });
});

describe('BouncingDots', () => {
  it('renders three dot spans', () => {
    const { getByTestId } = render(<BouncingDots color="#F59E0B" />);
    const container = getByTestId('bouncing-dots');
    expect(container.querySelectorAll('.dot-bounce').length).toBe(3);
  });

  it('applies the specified color to each dot', () => {
    const { getByTestId } = render(<BouncingDots color="#10B981" />);
    const container = getByTestId('bouncing-dots');
    const dots = container.querySelectorAll('.dot-bounce');
    dots.forEach((dot) => {
      expect((dot as HTMLElement).style.backgroundColor).toBeTruthy();
    });
  });

  it('respects the size prop', () => {
    const { getByTestId } = render(<BouncingDots color="#F59E0B" size={5} />);
    const container = getByTestId('bouncing-dots');
    const firstDot = container.querySelector('.dot-bounce') as HTMLElement;
    expect(firstDot.style.width).toBe('5px');
    expect(firstDot.style.height).toBe('5px');
  });
});

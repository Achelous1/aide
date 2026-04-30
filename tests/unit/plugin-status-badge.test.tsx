import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PluginStatusBadge } from '../../src/renderer/components/plugin/registry/PluginStatusBadge';

afterEach(() => cleanup());

describe('PluginStatusBadge', () => {
  it('renders synced label with accent color', () => {
    const { container } = render(<PluginStatusBadge status="synced" />);
    const el = container.querySelector('[data-status="synced"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.textContent).toBe('synced');
    expect(el.getAttribute('data-color')).toBe('accent');
    expect(el.className).toMatch(/text-aide-accent/);
  });

  it('renders update-available with latest version arrow', () => {
    const { container } = render(
      <PluginStatusBadge status="update-available" latestVersion="0.2.1" />
    );
    const el = container.querySelector('[data-status="update-available"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.textContent).toBe('update 0.2.1 →');
    expect(el.getAttribute('data-color')).toBe('accent-info');
    expect(el.className).toMatch(/text-aide-accent-info/);
  });

  it('renders update-available without version when not provided', () => {
    const { container } = render(<PluginStatusBadge status="update-available" />);
    const el = container.querySelector('[data-status="update-available"]') as HTMLElement;
    expect(el.textContent).toBe('update available');
  });

  it('renders locally-modified with warning color', () => {
    const { container } = render(<PluginStatusBadge status="locally-modified" />);
    const el = container.querySelector('[data-status="locally-modified"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.textContent).toBe('locally modified');
    expect(el.getAttribute('data-color')).toBe('accent-warning');
    expect(el.className).toMatch(/text-aide-accent-warning/);
  });

  it('renders unknown as "local only" with tertiary color', () => {
    const { container } = render(<PluginStatusBadge status="unknown" />);
    const el = container.querySelector('[data-status="unknown"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.textContent).toBe('local only');
    expect(el.getAttribute('data-color')).toBe('tertiary');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock electron-store before importing the module under test
const mockStore = new Map<string, unknown>();
vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      private defaults: Record<string, unknown>;
      constructor(opts?: { name?: string; defaults?: Record<string, unknown> }) {
        this.defaults = opts?.defaults ?? {};
      }
      get(key: string, fallback?: unknown) {
        return mockStore.has(key) ? mockStore.get(key) : (fallback ?? this.defaults[key as string]);
      }
      set(key: string | Record<string, unknown>, value?: unknown) {
        if (typeof key === 'string') {
          mockStore.set(key, value);
        } else {
          for (const [k, v] of Object.entries(key)) {
            mockStore.set(k, v);
          }
        }
      }
    },
  };
});

// Mock electron app for module import
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/test' },
}));

import { getAppSettings, setAppSetting } from '../../src/main/ipc/app-settings-handlers';
import type { AppSettings } from '../../src/main/ipc/app-settings-handlers';

describe('app-settings-handlers', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  describe('getAppSettings', () => {
    it('returns defaults on first launch', () => {
      const settings = getAppSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.windowBounds).toBeNull();
    });

    it('returns saved theme', () => {
      mockStore.set('theme', 'light');
      const settings = getAppSettings();
      expect(settings.theme).toBe('light');
    });

    it('returns saved window bounds', () => {
      const bounds = { x: 100, y: 200, width: 1400, height: 900 };
      mockStore.set('windowBounds', bounds);
      const settings = getAppSettings();
      expect(settings.windowBounds).toEqual(bounds);
    });
  });

  describe('setAppSetting', () => {
    it('persists theme change', () => {
      setAppSetting('theme', 'light');
      expect(mockStore.get('theme')).toBe('light');
      expect(getAppSettings().theme).toBe('light');
    });

    it('persists window bounds', () => {
      const bounds = { x: 50, y: 50, width: 1600, height: 1000 };
      setAppSetting('windowBounds', bounds);
      expect(mockStore.get('windowBounds')).toEqual(bounds);
      expect(getAppSettings().windowBounds).toEqual(bounds);
    });

    it('overwrites previous values', () => {
      setAppSetting('theme', 'light');
      setAppSetting('theme', 'dark');
      expect(getAppSettings().theme).toBe('dark');
    });

    it('handles null windowBounds (reset)', () => {
      setAppSetting('windowBounds', { x: 0, y: 0, width: 800, height: 600 });
      setAppSetting('windowBounds', null);
      expect(getAppSettings().windowBounds).toBeNull();
    });
  });

  describe('AppSettings type contract', () => {
    it('theme only accepts dark or light', () => {
      const validThemes: AppSettings['theme'][] = ['dark', 'light'];
      for (const theme of validThemes) {
        setAppSetting('theme', theme);
        expect(getAppSettings().theme).toBe(theme);
      }
    });

    it('windowBounds has required fields when not null', () => {
      const bounds = { x: 10, y: 20, width: 1200, height: 800 };
      setAppSetting('windowBounds', bounds);
      const saved = getAppSettings().windowBounds;
      expect(saved).not.toBeNull();
      expect(saved).toHaveProperty('x');
      expect(saved).toHaveProperty('y');
      expect(saved).toHaveProperty('width');
      expect(saved).toHaveProperty('height');
    });
  });
});

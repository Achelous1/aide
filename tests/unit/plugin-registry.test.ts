import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../../src/main/plugin/registry';
import type { PluginSpec } from '../../src/main/plugin/spec-generator';

function makeSpec(id: string, name: string): PluginSpec {
  return {
    id,
    name,
    description: `${name} plugin`,
    version: '0.1.0',
    permissions: [],
    entryPoint: 'src/index.js',
    tools: [],
  };
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register / list', () => {
    it('lists registered plugins with scope', () => {
      registry.register(makeSpec('id-1', 'local-plugin'), '/tmp/local-plugin', 'local');
      registry.register(makeSpec('id-2', 'global-plugin'), '/tmp/global-plugin', 'global');
      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list.find((p) => p.id === 'id-1')?.scope).toBe('local');
      expect(list.find((p) => p.id === 'id-2')?.scope).toBe('global');
    });
  });

  describe('clearLocalPlugins', () => {
    it('removes all local plugins and keeps global plugins', () => {
      registry.register(makeSpec('local-1', 'local-a'), '/tmp/local-a', 'local');
      registry.register(makeSpec('local-2', 'local-b'), '/tmp/local-b', 'local');
      registry.register(makeSpec('global-1', 'global-a'), '/tmp/global-a', 'global');

      registry.clearLocalPlugins();

      const list = registry.list();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('global-1');
      expect(list[0].scope).toBe('global');
    });

    it('is a no-op when there are no local plugins', () => {
      registry.register(makeSpec('global-1', 'global-a'), '/tmp/global-a', 'global');
      expect(() => registry.clearLocalPlugins()).not.toThrow();
      expect(registry.list()).toHaveLength(1);
    });

    it('is a no-op on an empty registry', () => {
      expect(() => registry.clearLocalPlugins()).not.toThrow();
      expect(registry.list()).toHaveLength(0);
    });

    it('allows re-registering local plugins after clearing', () => {
      registry.register(makeSpec('local-1', 'local-a'), '/tmp/local-a', 'local');
      registry.clearLocalPlugins();
      registry.register(makeSpec('local-1', 'local-a'), '/tmp/local-a', 'local');
      expect(registry.list()).toHaveLength(1);
      expect(registry.list()[0].scope).toBe('local');
    });

    it('does not affect active status of global plugins', () => {
      registry.register(makeSpec('local-1', 'local-a'), '/tmp/local-a', 'local');
      registry.register(makeSpec('global-1', 'global-a'), '/tmp/global-a', 'global');

      registry.clearLocalPlugins();

      const global = registry.list().find((p) => p.id === 'global-1');
      expect(global).toBeDefined();
      expect(global?.active).toBe(false);
    });
  });

  describe('unregister', () => {
    it('removes a plugin by id', () => {
      registry.register(makeSpec('id-1', 'plugin-a'), '/tmp/plugin-a', 'local');
      registry.unregister('id-1');
      expect(registry.list()).toHaveLength(0);
    });

    it('returns false for unknown id', () => {
      expect(registry.unregister('nonexistent')).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { getAgentSpawnConfig } from '../../src/main/agent/agent-config';

const DEFAULT_SHELL = '/bin/zsh';

describe('getAgentSpawnConfig — claude', () => {
  it('returns command "claude"', () => {
    const config = getAgentSpawnConfig('claude', DEFAULT_SHELL);
    expect(config.command).toBe('claude');
  });

  it('returns empty args when mcpConfigPath is not provided', () => {
    const config = getAgentSpawnConfig('claude', DEFAULT_SHELL);
    expect(config.args).toEqual([]);
  });

  it('returns empty args when mcpConfigPath is undefined', () => {
    const config = getAgentSpawnConfig('claude', DEFAULT_SHELL, undefined);
    expect(config.args).toEqual([]);
  });

  it('includes --mcp-config flag when mcpConfigPath is provided', () => {
    const config = getAgentSpawnConfig('claude', DEFAULT_SHELL, '/tmp/mcp.json');
    expect(config.args).toContain('--mcp-config');
    expect(config.args).toContain('/tmp/mcp.json');
  });

  it('sets --mcp-config as the first arg followed by the path', () => {
    const config = getAgentSpawnConfig('claude', DEFAULT_SHELL, '/home/user/.config/mcp.json');
    expect(config.args).toEqual(['--mcp-config', '/home/user/.config/mcp.json']);
  });
});

describe('getAgentSpawnConfig — gemini', () => {
  it('returns command "gemini"', () => {
    const config = getAgentSpawnConfig('gemini', DEFAULT_SHELL);
    expect(config.command).toBe('gemini');
  });

  it('returns empty args without mcpConfigPath', () => {
    const config = getAgentSpawnConfig('gemini', DEFAULT_SHELL);
    expect(config.args).toEqual([]);
  });

  it('returns empty args even when mcpConfigPath is provided', () => {
    const config = getAgentSpawnConfig('gemini', DEFAULT_SHELL, '/tmp/mcp.json');
    expect(config.args).toEqual([]);
  });
});

describe('getAgentSpawnConfig — codex', () => {
  it('returns command "codex"', () => {
    const config = getAgentSpawnConfig('codex', DEFAULT_SHELL);
    expect(config.command).toBe('codex');
  });

  it('returns empty args without mcpConfigPath', () => {
    const config = getAgentSpawnConfig('codex', DEFAULT_SHELL);
    expect(config.args).toEqual([]);
  });

  it('returns empty args even when mcpConfigPath is provided', () => {
    const config = getAgentSpawnConfig('codex', DEFAULT_SHELL, '/tmp/mcp.json');
    expect(config.args).toEqual([]);
  });
});

describe('getAgentSpawnConfig — shell', () => {
  it('uses the provided defaultShell as the command', () => {
    const config = getAgentSpawnConfig('shell', '/bin/bash');
    expect(config.command).toBe('/bin/bash');
  });

  it('returns empty args without mcpConfigPath', () => {
    const config = getAgentSpawnConfig('shell', DEFAULT_SHELL);
    expect(config.args).toEqual([]);
  });

  it('returns empty args even when mcpConfigPath is provided', () => {
    const config = getAgentSpawnConfig('shell', DEFAULT_SHELL, '/tmp/mcp.json');
    expect(config.args).toEqual([]);
  });
});

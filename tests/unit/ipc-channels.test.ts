import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../../src/main/ipc/channels';

describe('IPC_CHANNELS', () => {
  it('should define terminal channels', () => {
    expect(IPC_CHANNELS.TERMINAL_SPAWN).toBe('terminal:spawn');
    expect(IPC_CHANNELS.TERMINAL_WRITE).toBe('terminal:write');
    expect(IPC_CHANNELS.TERMINAL_RESIZE).toBe('terminal:resize');
    expect(IPC_CHANNELS.TERMINAL_KILL).toBe('terminal:kill');
    expect(IPC_CHANNELS.TERMINAL_DATA).toBe('terminal:data');
  });

  it('should define workspace channels', () => {
    expect(IPC_CHANNELS.WORKSPACE_LIST).toBe('workspace:list');
    expect(IPC_CHANNELS.WORKSPACE_CREATE).toBe('workspace:create');
    expect(IPC_CHANNELS.WORKSPACE_OPEN).toBe('workspace:open');
    expect(IPC_CHANNELS.WORKSPACE_REMOVE).toBe('workspace:remove');
    expect(IPC_CHANNELS.WORKSPACE_RECENT).toBe('workspace:recent');
    expect(IPC_CHANNELS.WORKSPACE_OPEN_DIALOG).toBe('workspace:open-dialog');
  });

  it('should define agent channels', () => {
    expect(IPC_CHANNELS.AGENT_DETECT).toBe('agent:detect');
    expect(IPC_CHANNELS.AGENT_STATUS).toBe('agent:status');
  });

  it('should define plugin channels', () => {
    expect(IPC_CHANNELS.PLUGIN_LIST).toBe('plugin:list');
    expect(IPC_CHANNELS.PLUGIN_GENERATE_SPEC).toBe('plugin:generate-spec');
    expect(IPC_CHANNELS.PLUGIN_GENERATE).toBe('plugin:generate');
    expect(IPC_CHANNELS.PLUGIN_ACTIVATE).toBe('plugin:activate');
    expect(IPC_CHANNELS.PLUGIN_DEACTIVATE).toBe('plugin:deactivate');
    expect(IPC_CHANNELS.PLUGIN_DELETE).toBe('plugin:delete');
    expect(IPC_CHANNELS.PLUGIN_INVOKE).toBe('plugin:invoke');
  });

  it('should define MCP channels', () => {
    expect(IPC_CHANNELS.MCP_STATUS).toBe('mcp:status');
    expect(IPC_CHANNELS.MCP_TOOLS).toBe('mcp:tools');
  });

  it('should have at least 13 channel definitions', () => {
    const keys = Object.keys(IPC_CHANNELS);
    expect(keys.length).toBeGreaterThanOrEqual(13);
  });
});

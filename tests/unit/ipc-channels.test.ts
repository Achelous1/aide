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

  it('should define all channel keys', () => {
    const keys = Object.keys(IPC_CHANNELS);
    expect(keys.length).toBeGreaterThan(0);
  });
});

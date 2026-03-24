import { ipcMain } from 'electron';
import { registerTerminalHandlers } from './terminal-handlers';

export function registerIpcHandlers(): void {
  registerTerminalHandlers(ipcMain);
}

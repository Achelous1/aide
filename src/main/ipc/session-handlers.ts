import { IpcMain } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS } from './channels';
import type { SavedSession } from '../../types/ipc';

const store = new Store({ name: 'aide-sessions' });

const CURRENT_VERSION = 1;

export function registerSessionHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.SESSION_SAVE, (_event, session: SavedSession) => {
    store.set(session.workspaceId, session);
  });

  // Synchronous save used in beforeunload — guarantees write before window closes
  ipcMain.on(IPC_CHANNELS.SESSION_SAVE_SYNC, (event, session: SavedSession) => {
    store.set(session.workspaceId, session);
    event.returnValue = true;
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_LOAD, (_event, workspaceId: string): SavedSession | null => {
    const session = store.get(workspaceId) as SavedSession | undefined;
    if (!session || session.version !== CURRENT_VERSION) return null;
    return session;
  });
}

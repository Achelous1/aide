import type { IpcMain } from 'electron';
import { checkForUpdate, getCachedUpdateInfo, downloadUpdate } from '../updater/check';
import { IPC_CHANNELS } from './channels';

export function registerUpdaterHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, () => checkForUpdate());

  ipcMain.handle(IPC_CHANNELS.UPDATER_GET_INFO, () => getCachedUpdateInfo());

  ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD, () => downloadUpdate());
}

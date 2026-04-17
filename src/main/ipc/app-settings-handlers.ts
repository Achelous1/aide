import { type IpcMain } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS } from './channels';

export interface AppSettings {
  theme: 'dark' | 'light';
  windowBounds: { x: number; y: number; width: number; height: number } | null;
}

const defaults: AppSettings = {
  theme: 'dark',
  windowBounds: null,
};

const store = new Store<AppSettings>({ name: 'aide-app-settings', defaults });

export function getAppSettings(): AppSettings {
  return {
    theme: store.get('theme', defaults.theme),
    windowBounds: store.get('windowBounds', defaults.windowBounds),
  };
}

export function setAppSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  store.set(key, value);
}

export function registerAppSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.APP_SETTINGS_GET, () => {
    return getAppSettings();
  });

  ipcMain.handle(IPC_CHANNELS.APP_SETTINGS_SET, (_event, key: string, value: unknown) => {
    if (key === 'theme' || key === 'windowBounds') {
      store.set(key, value);
    }
  });
}

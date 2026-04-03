/**
 * File event bus — bridges FileExplorer user actions to plugin tool invocations
 * declared in {workspace}/.aide/settings.json eventBindings.
 */
import type { WorkspaceSettings } from '../../types/ipc';

type FileEventName = 'file:clicked' | 'file:right-clicked';

let cachedSettings: WorkspaceSettings | null = null;

/** Call after workspace switch to invalidate the settings cache. */
export function invalidateSettingsCache(): void {
  cachedSettings = null;
}

async function getSettings(): Promise<WorkspaceSettings> {
  if (!cachedSettings) {
    cachedSettings = await window.aide.settings.read();
  }
  return cachedSettings;
}

/**
 * Emit a file event. Looks up bindings in settings and sequentially
 * invokes each bound plugin tool with the event payload merged into args.
 */
export async function emitFileEvent(
  event: FileEventName,
  payload: { filePath: string }
): Promise<void> {
  let settings: WorkspaceSettings;
  try {
    settings = await getSettings();
  } catch {
    return;
  }

  const bindings = settings.eventBindings[event] ?? [];
  for (const binding of bindings) {
    try {
      await window.aide.plugin.invoke(binding.plugin, binding.tool, {
        ...binding.args,
        ...payload,
      });
    } catch (e) {
      console.error(
        `[EventBus] ${binding.plugin}.${binding.tool} failed for ${event}:`,
        e
      );
    }
  }
  // Broadcast to plugin iframe UIs
  window.dispatchEvent(new CustomEvent('aide:file-event', { detail: { event, ...payload } }));
}

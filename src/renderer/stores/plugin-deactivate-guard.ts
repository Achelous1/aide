/**
 * Shared set of plugin ids currently being deactivated.
 *
 * Lives in its own module to avoid a circular import between plugin-store
 * (the primary deactivator) and layout-store (which also triggers deactivate
 * when a plugin tab is closed directly via removeTabFromPane).
 *
 * When plugin-store.deactivate() runs it adds the id before calling
 * removeTabFromPane so layout-store can skip the auto-deactivate side effect
 * and avoid an infinite loop.
 */
export const deactivatingPluginIds = new Set<string>();

/**
 * Watcher exclusion patterns — shared across fs-handlers and plugin-handlers.
 * Mirrors VS Code's default files.watcherExclude to avoid CPU hotspots from
 * watching large build/dependency directories.
 *
 * Format: glob-like strings consumed by the Rust notify watcher's inline
 * matcher (see `crates/aide-core/src/watcher.rs`). Supported shapes:
 *   `**\/<name>/**` — any path component equals <name>
 *   `**\/*.<ext>`   — filename suffix match
 * The macOS `/dev/fd/**` fsevents EBADF guard is hard-coded in the Rust
 * matcher and does not need to be listed here.
 */
export const WATCHER_EXCLUSIONS: string[] = [
  // VCS
  '**/.git/**',
  '**/.hg/**',
  '**/.svn/**',
  // Dependencies
  '**/node_modules/**',
  // Build output
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/target/**',
  // Framework cache dirs
  '**/.next/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.cache/**',
  '**/.parcel-cache/**',
  '**/.vite/**',
  '**/.swc/**',
  // Transient files
  '**/*.log',
  '**/*.pid',
  '**/*.lock',
];

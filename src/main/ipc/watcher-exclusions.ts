/**
 * chokidar watcher exclusion patterns — shared across fs-handlers and plugin-handlers.
 * Mirrors VS Code's default files.watcherExclude to avoid CPU hotspots from
 * watching large build/dependency directories.
 */
export const WATCHER_EXCLUSIONS: (RegExp | string)[] = [
  /\/dev\/fd\//,
  /(^|[/\\])\.git([/\\]|$)/,
  /(^|[/\\])\.(hg|svn)([/\\]|$)/,
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])(dist|build|out|coverage)([/\\]|$)/,
  /(^|[/\\])\.(next|nuxt|turbo|cache|parcel-cache|vite|swc)([/\\]|$)/,
  /(^|[/\\])target([/\\]|$)/,
  /\.(log|pid|lock)$/,
];

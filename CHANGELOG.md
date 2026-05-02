# Changelog

All notable changes to Smalti are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning per [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.3.1] — 2026-05-02

Hotfix release closing the v0.2.x → v0.3.0 migration loop. Plugins generated under v0.1.x that hardcode `.aide/` workspace paths now resolve correctly through the MCP server, and the migration design is captured in a written PRD with full regression coverage.

### Fixed
- **MCP server sandbox alias for legacy `.aide/` plugin paths** — `src/main/mcp/server.js` now applies the same `.aide/` → `.smalti/` rewrite that v0.2.2 introduced in `src/main/plugin/sandbox.ts`. Without it, every plugin call routed through MCP (Claude/Gemini/Codex agents) saw `.aide/` resolve to a missing directory; the agent-todo-board kanban with all existing tasks appeared empty for users upgrading from v0.1.x. Two sandbox copies exist because `server.js` is loaded as a standalone JS via `?raw` import and cannot consume TS modules — the alias is now inlined in both with a property-based equivalence test that guards against drift. PR #143.
- **`migrateProjectMcpJson` strips both `aide` and `smalti` keys** from workspace `.mcp.json`. `smalti` is delivered per-invocation via `--mcp-config`; a workspace-level entry caused duplicate MCP server spawns. PR #143.

### Added
- **Migration PRD** (`docs/spec/migration-prd.md`) — 19 migration surface areas, 8 acceptance criteria, idempotency / partial-failure / marker / rename-first policies, back-compat retention vs. drop policy, out-of-scope items. PR #143.
- **Migration regression test suite** — +23 tests (637 → 660). Covers MCP sandbox alias per fs method, post-alias workspace boundary, sandbox.ts equivalence, Claude/Gemini/Codex global config migration with TOML array preservation, and home-migration partial-failure / marker-resurrected-source recovery. PR #143.
- **Plugin generator workspace path convention** — `CREATE_PLUGIN_DESC` now instructs new plugins to write under `<workspace>/.smalti/` instead of `.aide/`. Legacy `.aide/` paths still work via sandbox alias, but new plugins use `.smalti/` directly so API responses (e.g. echoed `filePath`) match disk reality. PR #143.

### Documentation
- **CLAUDE.md "Known Pitfalls"** — added `MCP server.js: sandbox alias must stay in sync with sandbox.ts` entry documenting the duplicated implementation and the equivalence test. PR #143.

## [0.3.0] — 2026-05-01

Plugin global registry — workspace plugins can now be exported, imported, and synced across workspaces with explicit Update / Fork / Publish flows. Plus an MCP namespace rebrand and a local-build identity flag.

### Added
- **Plugin global registry** (`~/.smalti/registry/`) — generated plugins auto-push to a shared on-disk registry; other workspaces can browse and import them. Sync-first model: workspace state classified as `synced` / `update-available` / `locally-modified` / `unknown`. Workspace-specific changes that need to be preserved go through "Fork as new plugin" (D6) — divergence under the same `pluginId` is impossible by construction. PRs #131 (design + plan), #133 (zip-utils + registry-global backend, TDD), #134 (IPC channels + PLUGIN_GENERATE auto-push), #135 (UI: PluginPanel v2, RegistryBrowser, Fork/Update/Publish dialogs).
- **`UpdateConfirmDialog` shows the file list that will be overwritten** — lazy IPC `plugin:registry:modified-files` unpacks the installed-version zip to compute file-level diff only when the destructive update dialog opens. PRs #136 (backend), #140 (UI wiring).
- **`sh build.sh --local` flag** — produces `Smalti-Local-Build.app` / `.dmg` with a separate macOS bundle ID (`com.smaltihq.smalti.local`) so a local test build coexists with the released app instead of overwriting Application Support and TCC permissions. PR #138.
- **design.pen** — Phase 0 mockups for the registry feature persisted to disk. PR #137.

### Changed
- **MCP rebrand `aide` → `smalti`** — builtin tools renamed (`aide_create_plugin` → `smalti_create_plugin`, etc., 5 tools total). External `mcpServers` config key renamed (Gemini `settings.json`, Codex `config.toml`, internal `mcp-config.json`); existing `aide` entries in the user's config files are auto-migrated to `smalti` on next launch. PR #132.
- **PluginPanel v2** — replaces the previous panel: status badges (synced/update-available/locally-modified) drive an action menu (Update / Fork as new plugin / Publish / Remove). Removes the inline "Generate plugin" form (the IPC channel and `plugin-store.generate` action remain — MCP and CLI entry points are unaffected). PRs #135, #139.

### Deprecated
- `aide_*` MCP tool aliases — still routed to the new `smalti_*` handlers with a one-time deprecation warning per process; will be removed in a future release.
- `mcpServers.aide` key in external configs — auto-migrated to `mcpServers.smalti` on register.

### Fixed
- **Update / Fork-restore-original flows now work** — `plugin:registry:pull` IPC accepts an `{ overwrite?: boolean }` option so `applyUpdate` and `forkAsNew(restoreOriginal: true)` can replace an existing plugin directory in place. Earlier release-candidate code rejected every such call as `name-conflict`, making the core update flow completely broken. Surfaced by Devil's Advocate review pre-release.
- **Registry list error no longer corrupts UI** — `plugin:registry:list` returns `[]` on filesystem error instead of `{ ok: false, error }`, preventing `RegistryBrowser` from crashing on `.map()`.

### Tests
- Suite grew from ~480 to **620 tests** with TDD coverage for zip-utils (round-trip + content hash determinism + path traversal), registry-global (push/pull/diff/state machine + immutable versions + atomic writes), IPC handlers (auto-push tolerance + diff states), all 5 UI components (badges, browser, 3 dialogs), the modifiedFiles wiring, and the local-build forge config branching.

### Upgrade notes
- v0.2.x users: install v0.3.0 and reopen the workspace. No data migration required.
- External clients (Claude Code, Gemini CLI, Codex CLI) calling the old `aide_*` MCP tool names will still work this release but log a deprecation warning. Update integrations to `smalti_*` to remove the warning.
- macOS still requires `xattr -c /Applications/Smalti.app` after install (unsigned build).

## [0.2.3] — 2026-04-27

Hotfix for blank plugin iframes after the v0.2.0 rebrand.

### Fixed
- **Plugin iframes rendered blank on every workspace.** v0.2.0 switched the iframe URL in `PluginView.tsx` from `aide-plugin://` to `smalti-plugin://`, but the renderer's `index.html` Content-Security-Policy `frame-src` allowlist was not updated and still permitted only `aide-plugin:`. Chromium silently blocked every iframe on CSP grounds, so users saw an empty pane regardless of whether the workspace migration (#127) had run.
- `frame-src` now allows both `smalti-plugin:` and `aide-plugin:` (legacy alias retained for 1–2 releases, in line with the existing scheme registration).
- `<title>AIDE</title>` updated to `<title>Smalti</title>` (stale since v0.2.0).

### Tests
- New `tests/unit/index-html-csp.test.ts` pins the `frame-src` allowlist so future scheme renames cannot drop CSP coverage silently.

### Upgrade notes
- v0.2.2 users: install v0.2.3 and reopen the workspace. No data migration required.
- macOS still requires `xattr -c /Applications/Smalti.app` after install (unsigned build).

## [0.2.2] — 2026-04-27

Hotfix for v0.2.0/v0.2.1 rebrand migration gap — workspace-level `.aide` directory and plugin path alias.

### Fixed
- **Per-workspace `.aide` → `.smalti` migration** — v0.1.x workspaces stored plugin data and JSON files under `<workspace>/.aide/`. v0.2.0 only renamed the user home directory (`~/.aide → ~/.smalti`); workspace-local directories were untouched. Opening a v0.1.x workspace showed zero plugins and an empty kanban board. New `migrateAideWorkspace()` runs inside the `WORKSPACE_OPEN` IPC handler (before the plugin loader fires), applying the same rename-first / merge-fallback strategy as the home-directory migration. Per-workspace marker (`<ws>/.smalti/.migrated-from-aide`) prevents repeat runs.
- **Plugin sandbox `.aide/` path alias** — Even after the directory migration, legacy plugins that hardcode `.aide/` as their workspace data prefix (e.g. `const DEFAULT_FILE = '.aide/agent-todos.json'`) would silently recreate `<workspace>/.aide/` and write fresh empty files there, making the kanban board show a blank state. New `resolveWorkspaceRel()` helper in `sandbox.ts` rewrites any leading `.aide/` segment to `.smalti/` before resolving, so legacy plugins transparently read and write the migrated location. Alias removed in v0.3.x.
- **Stale comment in `cdn-protocol.ts`** — JSDoc referenced `~/.aide/cdn-cache/`; corrected to `~/.smalti/cdn-cache/`.

### Tests
- 7 new cases for `migrateAideWorkspace` (no-aide-dir / rename / merge / conflict / nested / idempotent / stale-marker re-merge).
- 7 new cases for `resolveWorkspaceRel` alias logic (`.aide/` → `.smalti/`, directory-only, `./` prefix, already-new path, mid-path non-rewrite, unrelated path, no-dot identifier).

### Upgrade notes
- v0.1.x users: migration runs automatically on the first workspace open after upgrading. No manual action.

## [0.2.1] — 2026-04-27

Hotfix for v0.2.0 rebrand migration gap.

### Fixed
- **Legacy Electron `userData` directories were not migrated** — v0.2.0 only handled the `~/.aide → ~/.smalti` home-directory rename. The Electron `userData` directory (`~/Library/Application Support/{aide,AIDE}` on macOS, `%APPDATA%/{aide,AIDE}` on Windows, `~/.config/{aide,AIDE}` on Linux) was untouched, so users upgrading from v0.0.x or v0.1.x saw an empty workspace list, lost session history, and reset app settings on first launch of v0.2.0 (their data was sitting next to the new `smalti/` userData directory, invisible to the running app).
- New `migrateAideUserData()` runs at `app.on('ready')` after the home-directory migration. It walks each legacy basename (`aide`, `AIDE`) in the parent of the current `userData` and applies rename-first / merge-fallback (dest wins on conflict), reusing `mergeDirectory` from `migrate-aide-data`.
- Per-legacy markers (`.migrated-from-aide`, `.migrated-from-AIDE`) prevent double migration.
- Defensive cleanup: any merged-in `mcpServers.aide` entry whose `args[0]` no longer exists on disk is dropped, so `registerJsonMcpConfig()` rewrites the fresh `~/.smalti/smalti-mcp-server.js` path on the next launch.

### Tests
- 8 new unit cases (no-legacy / rename / merge / AIDE-only / dual legacy / marker isolation / same-path guard) on top of the 7 existing home-migration cases. 464/467 unit tests pass overall (3 pre-existing skipped).

### Upgrade notes
- v0.2.0 users: the migration runs automatically on first launch of v0.2.1. No manual action.
- macOS still requires `xattr -c /Applications/Smalti.app` after install (unsigned build, see v0.2.0 notes).

## [0.1.1] — 2026-04-23

Hotfix for v0.1.0 packaging regression.

### Fixed
- **Packaged app failed to locate Rust native module on macOS** — Vite `closeBundle` plugin's `candidateNativeFilenames()` did not recognize the `index.darwin-universal.node` filename produced by `build.sh`'s `--universal` lipo flow. Result: the `.node` never landed in `.vite/build/native/`, so the asar contained no native module, and the packaged app threw `[aide] Rust native module directory not found. Run \`pnpm build:native\` first.` immediately on open (file tree empty, terminal tabs crashed with `Failed to open terminal (UNKNOWN)`).
- Vite plugin candidate list now mirrors `src/main/ipc/fs-handlers.ts:candidateNativeFilenames` exactly — universal takes priority on darwin. Added a code comment tying the two functions together to prevent future drift.

### Known limitations
- v0.1.0 DMG on GitHub Releases is broken. Users who auto-updated to v0.1.0 must download v0.1.1 manually (the app cannot run to trigger its own updater).

## [0.1.0] — 2026-04-23

Minor release marking the Rust core migration milestone. Electron shell stays JavaScript; main-process backend (file system, watcher, PTY) now runs on a napi-rs Rust core. 37 feat/fix commits since v0.0.12.

### Added
- Rust core crates — `crates/aide-core` (pure Rust logic) + `crates/aide-napi` (napi-rs binding) producing `src/main/native/*.node`
- **macOS universal binary** — `scripts/build-native.mjs --universal` builds arm64 + x64 targets, `lipo`-merges into `index.darwin-universal.node`. Intel Macs now run the packaged DMG.
- **Cross-platform CI matrix** — Windows + Ubuntu + macOS all run Rust build + tests on every PR (first-time validation for non-macOS).
- **Postinstall auto-build** — `pnpm install` triggers `scripts/build-native.mjs`. No manual `.node` rebuild step.
- `skippedCount` field in `readTreeWithError` response — renderer can surface non-UTF8 filename skips instead of silent drops.
- Rust toolchain pinning — `rust-toolchain.toml` (stable 1.82) + `dtolnay/rust-toolchain` action pinned to SHA + `napi` / `napi-derive` / `napi-build` exact versions.
- CI cache key includes `rustc --version` — toolchain upgrade invalidates stale `target/` artifacts.

### Changed
- **File system IPC** (`FS_READ_TREE`, `FS_READ_TREE_WITH_ERROR`, `FS_READ_FILE`, `FS_WRITE_FILE`, `FS_DELETE`) — all route through the Rust native module. Error messages now prefixed with POSIX codes (`ENOENT:`, `EACCES:`, etc.) and include the offending path.
- **Workspace watcher** — replaced `chokidar` with Rust `notify` crate via a napi `ThreadsafeFunction` callback. Idle CPU on packaged DMG dropped from ~127% to ~0%.
- **Terminal PTY** — replaced `node-pty` with Rust `portable-pty`. UTF-8 multi-byte characters (Korean, emoji) now carry correctly across 4 KB read boundaries.
- `ExportedReadTreeError.code` narrowed from `string` to `'EPERM' | 'ENOENT' | 'ENOTDIR' | 'UNKNOWN'` via `#[napi(string_enum)]` — TS callers get exhaustive type checking.
- PR-merge workflow — `.node` binary no longer committed; CI + postinstall rebuild produces it.

### Removed
- **Git status bar section** — branch name and change-count display. Terminal agents handle git directly.
- **GitHub sidebar panel** — PR list and Issue list. Audit showed 5 of 7 underlying IPC channels had zero renderer consumers.
- `git:*` IPC channels (`GIT_STATUS`, `GIT_COMMIT`, `GIT_PUSH`, `GIT_PULL`, `GIT_BRANCH`, `GIT_LOG`, `GIT_REMOTE_URL`).
- `github:*` IPC channels (`GITHUB_LIST_PRS`, `GITHUB_LIST_ISSUES`, `GITHUB_GET_PR`).
- npm dependencies: `chokidar`, `simple-git`, `node-pty`.
- Committed `src/main/native/*.node` binary (gitignored; always rebuilt).

### Fixed
- **Terminal UTF-8 corruption** — Korean / emoji characters no longer render as `�` when the multi-byte sequence straddles a PTY read chunk boundary.
- **Windows ConPTY reader hang** — added a watchdog thread that drops the master PTY when the child exits naturally, unblocking the reader thread so `on_exit` fires and `Drop` can join cleanly.
- **macOS FSEvents canonical path** — `path_depth_below` now canonicalises the watch root so `/private/var/...` events strip against `/var/...` roots without silently dropping.
- **Symlink delete data-loss** — `delete_path` uses `symlink_metadata` so `delete(symlink_to_dir)` unlinks the symlink rather than recursively deleting the target contents.
- `trailing-slash` path test cross-platform correctness (Windows uses `\`, not `/`).
- `build.sh` no longer errors with `pty.node missing` — dead `node-pty` verification replaced with Rust `.node` presence check.
- Stale committed binary corrupting file tree on `pnpm start` after new Rust exports landed — resolved by removing the committed binary entirely.

### Security
- Rust-side path traversal guards in fs handlers + file index.
- macOS `/dev/fd/N` fsevents `EBADF` exclusion (hard-coded in watcher matcher, regression-tested).
- Finder-launch `HOME=/` sentinel — `getHome()` rejects `/` and falls back to `getpwuid()`.
- `dtolnay/rust-toolchain` action pinned to commit SHA (supply-chain).
- Napi error messages preserve I/O error kind as POSIX code prefix (no kind-erasure across the FFI boundary).

### Known limitations
- Windows PTY reader thread shutdown works for natural child exit and explicit `kill()`, but the smoke test is gated to Windows CI only (`#[cfg(windows)]`).
- `Powerlevel10k` right-prompt rendering can drift on terminal resize — pre-existing xterm.js + p10k interaction, not introduced by this release. Workaround: `POWERLEVEL9K_DISABLE_HOT_RELOAD=true` or `PS1='$ ' zsh -f` in the affected session.
- macOS build is unsigned. Installation requires `xattr -cr /Applications/AIDE.app` on first launch. Apple Developer signing deferred until signing infrastructure is in place.

### Migration notes
- Contributors need `rustup` with stable ≥ 1.82 installed. `pnpm install` auto-builds the native module. If Homebrew `rustc` shadows `rustup`, the build script prepends `~/.cargo/bin` to PATH — no action needed.
- Existing workspaces / settings / session state unchanged (`electron-store` persistence intact).
- GitHub panel users: use terminal + `gh` CLI (or a local Git client) instead.

[0.1.0]: https://github.com/Achelous1/aide/releases/tag/v0.1.0

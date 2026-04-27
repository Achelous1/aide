# Changelog

All notable changes to Smalti are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning per [SemVer](https://semver.org/spec/v2.0.0.html).

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

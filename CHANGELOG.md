# Changelog

All notable changes to AIDE are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning per [SemVer](https://semver.org/spec/v2.0.0.html).

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

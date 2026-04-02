# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIDE (AI-Driven IDE) - Electron-based terminal-centric IDE that integrates CLI code agents (Claude Code, Gemini CLI, Codex CLI) and generates plugins from natural language via "Create n Play" system.

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm start            # Dev server with HMR
pnpm run package      # Package app
pnpm run make         # Build distributable (dmg/exe)
pnpm lint             # ESLint
pnpm test             # Vitest (unit)
pnpm test:e2e         # Playwright (e2e)
```

## Architecture

**Electron 3-process model** with strict security boundaries:

- **Main Process** (`src/main/`) — Node.js, system access, native modules (node-pty), IPC handlers
- **Preload** (`src/preload/`) — contextBridge, exposes `window.aide` API to renderer
- **Renderer** (`src/renderer/`) — React UI, no Node.js access, communicates via `window.aide`

### Key Design Decisions

- **No direct LLM API calls** — AIDE spawns CLI agents (claude, gemini, codex) as pty processes via node-pty. Agents handle their own auth (OAuth).
- **IPC channels** defined in `src/main/ipc/channels.ts` — single source of truth for channel names shared between main and preload.
- **Plugin sandbox** — plugins run in isolated vm/worker context with scoped filesystem access per `plugin.spec.json` permissions.
- **Tool/Skill Registry** — generated plugins auto-register as AI tools that agents can invoke via their native protocols (MCP, function calling).

### Directory Map

```
src/main/agent/       # CLI agent process lifecycle (spawn/kill pty)
src/main/plugin/      # Plugin generation pipeline, sandbox, registry
src/main/ipc/         # IPC handlers (terminal, fs, git, plugin)
src/main/filesystem/  # File tree service (chokidar)
src/main/git/         # simple-git / octokit wrappers
src/preload/          # contextBridge API (window.aide)
src/renderer/         # React app (components, stores, styles)
src/types/            # Shared TypeScript interfaces (IPC contracts)
plugins/              # Generated plugins stored here
```

## Tech Stack

- Electron + electron-forge (Vite plugin)
- React 19 + TypeScript 5
- xterm.js + node-pty (terminal)
- Tailwind CSS 3 + Zustand 5 (UI/state)
- electron-store (local JSON persistence)
- Vitest + Playwright (testing)
- pnpm (package manager, `node-linker=hoisted` required — see `.npmrc`)

## Security Rules

- `contextIsolation: true`, `nodeIntegration: false` always
- Never expose Node.js APIs directly to renderer — all goes through preload's `contextBridge`
- node-pty requires `sandbox: false` in webPreferences (necessary trade-off)
- CSP meta tag in `index.html` restricts script/style sources
- node-pty must be unpacked from asar (`forge.config.ts` packagerConfig)

## Coding Guidelines

> These bias toward caution over speed. Use judgment for trivial tasks.

### 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No abstractions for single-use code.
- No "flexibility" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
- Touch only what you must. Don't "improve" adjacent code.
- Match existing style, even if you'd do it differently.
- Remove imports/variables YOUR changes made unused. Leave pre-existing dead code alone.

### 4. Goal-Driven Execution
- Transform tasks into verifiable goals before starting.
- For multi-step tasks, state a brief plan with verify steps:
  ```
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  ```

## Known Pitfalls (Lessons Learned)

### Zustand: Never return new objects/arrays from selectors
`useStore((s) => s.getAllPanes())` creates a new array every render → React's `useSyncExternalStore` detects a "change" → infinite re-render loop. **Always select primitives or stable references.** Compute derived data outside the selector:
```ts
// BAD: infinite loop
const panes = useLayoutStore((s) => s.getAllPanes());
// GOOD: select stable value, compute in component
const layout = useLayoutStore((s) => s.layout);
const paneCount = countPanes(layout);
```

### xterm.js: Defer open() until container has dimensions
`terminal.open(container)` crashes with "Cannot read properties of undefined (reading 'dimensions')" if the container has zero size (e.g., `display: none` or flex not yet resolved). **Wrap in `requestAnimationFrame`** to ensure layout is computed.

### xterm.js + pty: Connect in the same callback as open()
If xterm init is deferred (RAF) but pty connection is a separate `useEffect([sessionId])`, the connection effect fires first when `terminalRef.current` is still null → silently fails, never re-fires. **Always connect pty input/output inside the same RAF callback** that calls `terminal.open()`.

### Terminal tabs: Spawn pty BEFORE creating the tab
Creating a tab with `sessionId: ''` then updating it async causes the UI to render a tab with no terminal (PaneView skips `<TerminalPanel>` when `sessionId` is falsy). **Call `window.aide.terminal.spawn()` first, get the real sessionId, then create the tab with it.**

### Split pane limits: Count visual grid, not per-node children
Checking `node.children.length >= 3` only prevents direct siblings but allows nested splits to bypass the limit (e.g., a vertical split inside a horizontal split can add more horizontal panes). **Count visual columns/rows across the entire tree recursively.** For horizontal: sum children columns in horizontal splits, take max in vertical splits.

### Auto-spawn: Let PaneView own its lifecycle
Moving auto-spawn from `App.tsx useEffect` to `PaneView` eliminates timing issues where layout-store state wasn't ready when App's effect fired. The component that renders the terminal should be responsible for ensuring it has content.

### Packaging: Only externalize native modules in Vite
Vite's `external` list means "don't bundle, resolve at runtime." But electron-forge's Vite plugin does NOT copy `node_modules` into the asar — only `.vite/build/` output goes in. So any pure JS package marked external (e.g., `electron-store`, `chokidar`) will be missing at runtime. **Only native modules (`node-pty`, `fsevents`) and `electron` should be external.** Pure JS deps get bundled by Vite automatically. Native modules need `afterCopy` hook in `forge.config.ts` to copy them into the build path.

### Packaging: Packaged apps don't inherit shell PATH
Electron apps launched from Finder (not terminal) get a minimal `PATH` (`/usr/bin:/bin`). CLI tools like `claude`, `zsh` in `/usr/local/bin` or `/opt/homebrew/bin` won't be found. **`fix-env.ts` runs the login shell to load the full environment before any pty spawn.** This only runs when `app.isPackaged` is true.

### Packaging: Finder sets HOME=/ — guard all home directory access
macOS Finder launches packaged apps with `HOME=/` (not the user's home). `app.getPath('home')`, `os.homedir()`, and `process.env.HOME` all return `/` in this context. **Never use `app.getPath('home')` directly.** Use the `getHome()` helper pattern that rejects `/` and falls back to `os.userInfo().homedir` (which uses `getpwuid()`). `fix-env.ts` also overrides HOME from the login shell, but if it fails, the safety net catches it. All `app.on('ready')` code that touches `~/.aide/` must be wrapped in try-catch so failures don't prevent window creation.

### Packaging: Disable Electron Fuses for unsigned builds
`EnableEmbeddedAsarIntegrityValidation`, `OnlyLoadAppFromAsar`, and `EnableCookieEncryption` in `forge.config.ts` Fuses must be `false` until the app is code-signed. These silently abort the process when the asar hash doesn't match or native modules load outside the asar bundle.

### Packaging: macOS fsevents EBADF on /dev/fd/
In packaged apps, the `fsevents` native module reports `/dev/fd/N` paths. When chokidar tries to `lstat` them, the FD is already closed → `EBADF`. The `ignored` option doesn't help because the error occurs before filtering. **A process-level `uncaughtException` handler suppresses this specific error** (see `src/main/index.ts`).

## Platform Notes

- macOS: bash/zsh default shell, .dmg/.zip packaging
- Windows: powershell.exe default, Squirrel installer
- node-pty is a native module — rebuilds on `pnpm install` per platform

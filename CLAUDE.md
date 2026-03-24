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

## Platform Notes

- macOS: bash/zsh default shell, .dmg/.zip packaging
- Windows: powershell.exe default, Squirrel installer
- node-pty is a native module — rebuilds on `pnpm install` per platform

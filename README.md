[한국어](./README_kor.md) · **English**

# AIDE — AI-Driven IDE

> A terminal-centric IDE that integrates CLI code agents (Claude Code, Gemini CLI, Codex CLI) and lets you generate plugins from natural language via the **Create n Play** system.

---

## Overview

AIDE is an Electron-based IDE built around a single core idea: **the IDE should adapt to you, not the other way around**. Instead of installing dozens of pre-built plugins from a marketplace, you describe what you want in natural language and an AI agent generates a working plugin instantly. The plugin runs in a sandboxed environment, registers itself as an AI tool, and is immediately usable both by you and by the AI assistant.

AIDE does not call LLM APIs directly. It spawns CLI agents (`claude`, `gemini`, `codex`) as PTY processes via `node-pty`, so each agent manages its own authentication and you keep full control of your provider relationships.

---

## Why need it

Existing IDEs (IntelliJ, VSCode) have huge plugin ecosystems, but:

- Most plugins are over-engineered for what you actually need
- Finding a plugin that does exactly the one thing you want is hard
- Building your own plugin requires learning a heavy SDK and a build pipeline
- The mental tax of context-switching between IDE, terminal, and AI chat slows you down

AIDE collapses this stack:

- **One workspace** holds your terminal, AI agents, file tree, Git, and plugin UIs
- **Natural-language plugins** mean the marginal cost of "I wish my IDE could do X" drops to a single sentence
- **CLI-first** means you bring your own agent and your own auth — no vendor lock-in

---

## Key Features

| Feature | Description |
|---|---|
| **Multi-agent terminal** | Run Claude Code, Gemini CLI, Codex CLI, and a regular shell side by side. Each tab is an isolated PTY session with full ANSI color, status detection, and session save/resume. |
| **Split-screen layout** | Up to a 3×2 grid of panes. Drag tabs between panes to split, or to a pane edge to create a new split. Layout persists per workspace. |
| **Workspace management** | Multi-project navigation, recent project history, per-workspace tab/layout/plugin state, automatic restoration on launch. |
| **Plugin system (Create n Play)** | Natural-language plugin generation via MCP. Plugins run in a VM sandbox with permission-gated filesystem access and render their UI as iframe tabs. |
| **Hot reload** | Plugin code, HTML, and disk additions are picked up live without restarting AIDE. New plugins created by the AI appear in the panel instantly. |
| **Offline CDN** | Plugins load external libraries via the `aide-cdn://` protocol, which caches CDN assets locally so plugins keep working offline. |
| **Agent status indicators** | Real-time visual feedback (idle / processing / awaiting input) for every agent session, surfaced in the workspace navbar. |
| **Theme system** | Dark and light themes with smooth transitions, JetBrains Mono typography, agent-specific accent colors. |

---

## Key Features — Plugin Creation

AIDE plugins are created entirely through natural language conversation with an AI agent. There is no manual SDK, no boilerplate generator, no build step.

### The Create n Play flow

```
You:    "Make a plugin that highlights unused TypeScript imports
         and lets me delete them with one click."

Agent:  (uses MCP aide_create_plugin tool)
        → generates plugin.spec.json (id, name, permissions, tools)
        → generates plugin source code (CommonJS module)
        → generates index.html UI with AIDE design tokens
        → registers as an MCP tool the agent itself can later invoke

AIDE:   Plugin appears in the Plugins panel. Toggle ON to activate.
        Click "Open as tab" to render its UI inside a pane.
```

### Plugin anatomy

```
.aide/plugins/my-plugin/
├── plugin.spec.json   # id, name, permissions, tools
├── tool.json          # tool manifest exposed to MCP
├── src/index.js       # CommonJS module: invoke(toolName, args)
├── index.html         # iframe UI (auto-injected window.aide shim)
├── mcp/               # MCP-specific assets
└── skill/             # skill assets
```

### Sandbox guarantees

- Plugins run in `node:vm` contexts — no access to `child_process`, `net`, or unrestricted `fs`
- `require('fs')` is gated by the plugin's declared permissions (`fs:read`, `fs:write`) and scoped to the workspace
- Iframe UIs run with `sandbox="allow-scripts"` on the custom `aide-plugin://` origin (their own opaque origin, isolated from the host app)
- External libraries must be loaded via `aide-cdn://` from an allowlisted CDN host

### Plugin scopes

| Scope | Location | Use case |
|---|---|---|
| **Local** | `<workspace>/.aide/plugins/` | Project-specific tools (linters, formatters, code generators tailored to one repo) |
| **Global** | `~/.aide/plugins/` | Reusable tools available across all workspaces |

Plugins added at runtime (via MCP, manual file copy, or any file manager) are auto-discovered without restarting the app.

---

## Installation

### Requirements

- **macOS** (Apple Silicon or Intel) — Windows and Linux builds are planned
- **Node.js** ≥ 18
- **pnpm** (the project uses `node-linker=hoisted`, so npm/yarn will not work as-is)

### Optional CLI agents

AIDE detects installed agents automatically. Install whichever you use:

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Gemini CLI
npm install -g @google/gemini-cli

# Codex CLI
npm install -g @openai/codex
```

Each CLI manages its own authentication (`claude login`, `gemini auth`, etc.).

### Run from source

```bash
git clone https://github.com/Achelous1/aide.git
cd aide
pnpm install
pnpm start    # dev server with HMR
```

### Build a distributable

```bash
sh build.sh   # macOS — produces out/AIDE.dmg
```

The build script handles dependency install, lint, package, and DMG creation with a drag-and-drop installer layout.

---

## Architecture

AIDE follows Electron's three-process model with strict security boundaries.

```
┌──────────────────────────────────────────────────────────┐
│                       Renderer Process                    │
│  React + TypeScript + Tailwind + Zustand                  │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │ Workspace   │ │ Pane Tree  │ │ Plugin iframes        │ │
│  │ Nav         │ │ (split)    │ │ (aide-plugin://)      │ │
│  └─────────────┘ └────────────┘ └──────────────────────┘ │
│           ↑                   ↓                            │
│           └─── window.aide ───┘  (contextBridge)           │
└──────────────────────────────────────────────────────────┘
                            ↕  IPC
┌──────────────────────────────────────────────────────────┐
│                       Preload Script                      │
│  Exposes a typed API surface to the renderer               │
└──────────────────────────────────────────────────────────┘
                            ↕  IPC
┌──────────────────────────────────────────────────────────┐
│                       Main Process (Node.js)             │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │ Terminal    │ │ Plugin     │ │ MCP Server           │ │
│  │ (node-pty)  │ │ Registry   │ │ (NDJSON over stdio)  │ │
│  └─────────────┘ └────────────┘ └──────────────────────┘ │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │ FS / Git    │ │ VM Sandbox │ │ Custom Protocols     │ │
│  │ Watchers    │ │            │ │ (aide-plugin/cdn)    │ │
│  └─────────────┘ └────────────┘ └──────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Security boundaries

- `contextIsolation: true`, `nodeIntegration: false` in all renderer windows
- All Node.js access goes through the preload script's `contextBridge`
- Plugin iframes are served by a custom `aide-plugin://` protocol so they get their own opaque origin
- CDN assets are proxied through `aide-cdn://` with a hostname allowlist and on-disk cache
- Plugin VM sandboxes have an explicit `require()` shim that only allows `path` and a permission-gated `fs`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Shell** | Electron + electron-forge (Vite plugin) |
| **UI** | React 19, TypeScript 5, Tailwind CSS 3 |
| **State** | Zustand 5 |
| **Terminal** | xterm.js + node-pty |
| **Persistence** | electron-store (per-workspace sessions) |
| **Plugin sandbox** | Node.js `vm` module with scoped `require` |
| **Custom protocols** | `aide-plugin://`, `aide-cdn://` |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Package manager** | pnpm (`node-linker=hoisted`) |
| **Typography** | JetBrains Mono (primary), IBM Plex Mono (secondary) |

---

## MCP Integration

AIDE ships with an embedded **Model Context Protocol** server that exposes plugin tools to any MCP-aware agent.

### What the MCP server does

When AIDE starts, it writes a self-contained MCP server script to `~/.aide/aide-mcp-server.js` and registers it in each agent's global config:

| Agent | Config file | Format |
|---|---|---|
| Claude Code | `~/.claude.json` | JSON (`mcpServers` key) |
| Gemini CLI | `~/.gemini/settings.json` | JSON (`mcpServers` key) |
| Codex CLI | `~/.codex/config.toml` | TOML (`[mcp_servers.aide]`) |

The server runs as a standalone Node process per agent invocation and speaks NDJSON over stdio.

### Built-in tools

| Tool | Purpose |
|---|---|
| `aide_create_plugin` | Generate a new plugin from a natural-language description (creates spec, code, HTML, registers tools) |
| `aide_edit_plugin` | Patch an existing plugin's code, HTML, or spec in place |
| `aide_delete_plugin` | Remove a plugin and clean up its files |
| `aide_list_plugins` | List all installed plugins with their tools |
| `aide_invoke_tool` | Call any plugin tool from the agent |

### Dynamic tool registration

Every plugin's declared `tools` are automatically exposed under the namespace `plugin_<plugin-name>_<tool-name>`. When you create a plugin called `json-formatter` with a `format` tool, the agent immediately gets a callable tool named `plugin_json-formatter_format` — no restart needed.

### Plugin → AIDE → Plugin call chain

```
User → Agent: "Format this JSON file"
Agent → MCP: plugin_json-formatter_format({path: "data.json"})
MCP → Plugin sandbox: invoke("format", {path: "data.json"})
Plugin → fs (scoped): readFileSync, JSON.parse, JSON.stringify, writeFileSync
Plugin → return: {success: true, lines: 42}
MCP → Agent: tool result
Agent → User: "Formatted 42 lines."
```

The same plugin's iframe UI can call `window.aide.invoke('json-formatter', 'format', {...})` from the browser side, and plugins can invoke each other's tools through the same channel.

---

## License

See [LICENSE](./LICENSE).

## Contributing

Issues and PRs welcome at [github.com/Achelous1/aide](https://github.com/Achelous1/aide).

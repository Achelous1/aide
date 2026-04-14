# AIDE Documentation Guide

> This file governs how Claude reads, writes, and maintains the `docs/` knowledge base.
> It encodes the **LLM Wiki** pattern (Karpathy, 2025): knowledge compiled once into a persistent,
> interlinked wiki that compounds across sessions — not re-derived per query via RAG.

---

## Three-Layer Architecture

```
docs/
├── spec/          Layer 1 — Raw Sources (human-authored, immutable)
├── raw/           Layer 1 — Raw Sources (articles, papers, reference data)
└── wiki/          Layer 2 — LLM Wiki (Claude-owned, always evolving)
```

**Layer 1 — Raw Sources** (`spec/`, `raw/`)
Immutable input documents. Claude reads but never modifies these.
- `spec/PRD.md` — Product Requirements. Read before any feature work.
- `spec/TRD.md` — Technical Requirements. Read before any architecture decision.
- `spec/UI-SPEC.md` — UI Functional Specification. Read before any UI change.
- `raw/` — Articles, papers, reference data brought in for context.

**Layer 2 — LLM Wiki** (`wiki/`)
Claude owns this layer entirely. Create, update, and reorganize freely as understanding evolves.
The wiki sits between raw sources and query answers — it pre-compiles knowledge so the same
insight doesn't need to be re-derived from scratch each session.

---

## Wiki Page Structure

Every wiki page uses this YAML frontmatter:

```markdown
---
title: "Page Title"
category: architecture | decision | pattern | debugging | environment | session-log
tags: [tag1, tag2, tag3]
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: [[other-page]], [[another-page]]
---

# Page Title

Content here.
```

### Categories

| Category | When to use |
|----------|-------------|
| `architecture` | System structure, component relationships, data flows |
| `decision` | Why a design choice was made — alternatives considered and rejected |
| `pattern` | Recurring code patterns, idioms, conventions used in this codebase |
| `debugging` | Diagnosed bugs, root causes, pitfalls to avoid |
| `environment` | Build setup, tooling quirks, platform-specific notes |
| `session-log` | Significant discoveries made during a session |

### Cross-References

Use `[[page-name]]` (Obsidian wiki-link syntax) to link between pages.
The `docs/` folder is an Obsidian vault — links render in the graph view.

```markdown
See also: [[plugin-sandbox-model]], [[ipc-contract]]
```

---

## Core Operations

### Ingest

When encountering significant new knowledge — a root cause diagnosed, an architecture clarified,
a pattern discovered — write it into the wiki immediately. Do not defer.

**Triggers:**
- Diagnosing a non-obvious bug or pitfall
- Making or understanding a design decision with meaningful trade-offs
- Discovering how a system component actually works (vs. how it appeared to work)
- Completing a session with lasting insights

**Rules:**
- Touch 1–15 related pages per ingest (update existing pages before creating new ones)
- Keep pages focused: one concept, one decision, one pattern per page
- File name = kebab-case title, e.g. `plugin-sandbox-model.md`
- Update `wiki/index.md` after every write (see Index section below)
- Append to `wiki/log.md` with a one-line entry (see Log section below)

**Example ingest candidates from this codebase:**
```
# New page: plugin-entrypoint-resolution.md
Captures how resolvePluginDir reads spec.entryPoint and why src/index.js was wrong as a hardcoded default.

# Update existing: zustand-pitfalls.md
Add the snapshot-mutation pitfall (mutating getAllPanes() result doesn't update store).

# New page: iframe-null-origin.md
Documents that sandbox="allow-scripts" (without allow-same-origin) creates a null-origin context
that blocks aide-cdn:// subresource requests at the Chromium network level.
```

### Query

When asked a question that may be answered by existing wiki knowledge:

1. Check `wiki/index.md` for relevant page titles and tags
2. Read the specific page(s) that match
3. Synthesize an answer with explicit citations: `([[page-name]])`
4. If the query reveals a gap, ingest the answer as a new page

**Do not re-read raw sources (`spec/`, `raw/`) for questions already captured in the wiki.**
The wiki is the compiled, authoritative layer — use it.

### Lint

Periodically (or when asked) health-check the wiki for:

| Issue | Description |
|-------|-------------|
| **Orphan pages** | Pages not linked from index.md or any other page |
| **Stale claims** | Assertions contradicted by current code (check against source) |
| **Contradictions** | Two pages making opposing claims about the same behavior |
| **Oversized pages** | Pages > 300 lines that should be split |
| **Missing cross-refs** | Pages that clearly relate but don't link to each other |
| **Empty categories** | Index sections listed but no pages filed under them |

Run lint proactively after major refactors or when the wiki grows beyond 20 pages.

---

## Maintaining `wiki/index.md`

`index.md` is the navigational catalog. Keep it organized by category, not by recency.

```markdown
# AIDE Wiki Index

## Architecture
- [[electron-3-process-model]] — Main/Preload/Renderer boundaries and security rules
- [[ipc-contract]] — Channel definitions and contextBridge API surface
- [[plugin-sandbox-model]] — vm sandbox, scoped fs, permission system

## Decisions
- [[why-no-direct-llm-calls]] — CLI agent spawn model vs. API integration
- [[nvm-node-injection]] — Why PATH injection happens in terminal-handlers, not fix-env

## Patterns
- [[zustand-pitfalls]] — Selector stability, snapshot mutation, infinite re-render
- [[xterm-init-timing]] — open() deferral and pty connection sequencing

## Debugging
- [[iframe-null-origin]] — sandbox="allow-scripts" blocks aide-cdn:// in Chromium

## Environment
- [[packaging-macos]] — Finder HOME=/, Fuses, asar unpacking, fsevents EBADF
```

---

## Maintaining `wiki/log.md`

`log.md` is an append-only chronological record. Add one line per significant operation.

```
YYYY-MM-DD [ingest] Created [[plugin-entrypoint-resolution]] — resolvePluginDir now reads spec.entryPoint
YYYY-MM-DD [update] Updated [[zustand-pitfalls]] — added snapshot mutation pitfall
YYYY-MM-DD [lint]   Fixed stale claim in [[ipc-contract]] — TERMINAL_RESIZE channel renamed
YYYY-MM-DD [query]  Answered "why does aide-cdn fail" — cited [[iframe-null-origin]]
```

Prefix format: `[ingest]` | `[update]` | `[lint]` | `[query]` | `[delete]`

---

## When NOT to Write to the Wiki

- **Code patterns already visible in source** — prefer a comment in code over a wiki page
- **Temporary state** — in-progress work, current task list, this-session context
- **Git history** — who changed what and why belongs in commit messages
- **Duplicating spec docs** — don't restate what `PRD.md` or `TRD.md` already says clearly

The wiki captures what is *non-obvious*, *synthesized*, or *cross-cutting* — not what is already
readable from the code or specs.

---

## Seeding the Wiki (First Session)

If `wiki/` is empty, seed it before starting work:

1. Read `spec/PRD.md`, `spec/TRD.md`, `spec/UI-SPEC.md`
2. Create `wiki/index.md` and `wiki/log.md` (empty stubs)
3. Ingest 3–5 foundational pages covering the core architecture:
   - Electron process model and security boundaries
   - IPC contract and channel conventions
   - Plugin sandbox and permission model
4. Add a session-log page summarizing what was read and what is now understood

From that point, the wiki grows organically — one ingest at a time, session after session.

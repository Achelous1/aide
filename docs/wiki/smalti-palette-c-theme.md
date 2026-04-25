---
title: "smalti Palette C Theme — Token System and Migration"
category: architecture
tags: [theme, design-system, palette-c, smalti, rebrand, tailwind, css-variables]
created: 2026-04-25
updated: 2026-04-25
related: [[rebrand-smalti]], [[app-settings-persistence]], [[index]]
---

# smalti Palette C Theme — Token System and Migration

The smalti rebrand swapped the live UI from the old emerald-based palette (formerly AIDE) to **Palette C (Hacker-Byzantine Hybrid)** — the product-UI flavor of the smalti brand. This page captures how the token system is wired so future component work doesn't drift back to ad-hoc colors.

## TL;DR

- **Two layers of color tokens.** Legacy `aide-*` Tailwind tokens (existing components) are now aliases for the smalti CSS variables. New `smalti-*` Tailwind tokens point at the same variables but support opacity modifiers via `rgb(var(...) / <alpha-value>)`.
- **One source of truth.** Token *values* live only in `src/renderer/styles/global.css`. Touching the variables there re-skins the whole app.
- **Theme switch.** `:root` holds dark values; `.light` overrides every variable. JS toggles the `.light` class on `<html>` to swap themes — no inline-style swapping, no React context for colors.

## Token layers

```
   global.css :root  (dark)            global.css .light  (light overrides)
   ┌────────────────────────┐          ┌────────────────────────┐
   │ --background: #0A0B10  │          │ --background: #F5F5F0  │
   │ --surface:    #11131B  │          │ --surface:    #EAEAE4  │
   │ --accent:     #4FB3BF  │          │ --accent:     #2B8A94  │
   │ ...                    │          │ ...                    │
   │ --smalti-canvas: 10 11 16 │      │ --smalti-canvas: 245 245 240 │
   │ --smalti-cyan:   79 179 191│      │ --smalti-cyan:   43 138 148 │
   │ ...                    │          │ ...                    │
   └────────────────────────┘          └────────────────────────┘
              │                                       │
              ▼                                       ▼
   tailwind.config.js  ──── two consumer classes per role ────
   ┌────────────────────────────────────────────────────────────┐
   │ Legacy aide-* (existing component class names)             │
   │   text-aide-text-primary    →  var(--text-primary)         │
   │   bg-aide-surface-elevated  →  var(--surface-elevated)     │
   │   bg-aide-accent            →  var(--accent)               │
   │                                                            │
   │ New smalti-* (opacity-modifier safe)                       │
   │   bg-smalti-canvas          →  rgb(var(--smalti-canvas) /  │
   │                                    <alpha-value>)          │
   │   bg-smalti-cyan/10         → 10% Glass Cyan overlay       │
   │   ring-smalti-gold          →  active-state accents        │
   └────────────────────────────────────────────────────────────┘
```

## Token mapping

Use this table when picking a class for a new component or when checking that an existing component matches `design.pen`.

| Role | Dark | Light | Tailwind classes |
|------|------|-------|------------------|
| Canvas (full-app bg) | `#0A0B10` | `#F5F5F0` | `bg-aide-background`, `bg-smalti-canvas` |
| Surface (sidebar, terminal pane) | `#11131B` | `#EAEAE4` | `bg-aide-surface`, `bg-smalti-surface` |
| Raised (status bar, cards, hover) | `#1B1E2A` | `#DEDED6` | `bg-aide-surface-elevated`, `bg-smalti-raised` |
| Divider / 1px border | `#2A2E3D` | `#C8C8BE` | `border-aide-border`, `border-smalti-divider` |
| Body text | `#E6E7ED` | `#11131B` | `text-aide-text-primary`, `text-smalti-ink-body` |
| Muted text | `#9BA0B0` | `#5A5F6E` | `text-aide-text-secondary`, `text-smalti-ink-muted` |
| Glass Cyan — primary action | `#4FB3BF` | `#2B8A94` | `text-aide-accent`, `bg-aide-accent`, `text-smalti-cyan` |
| Antique Gold — point accent (~1%) | `#C9A24B` | `#A8802A` | `text-aide-accent-warning`, `text-smalti-gold` |
| Sky Blue — info / brand asset | `#6FC5DB` | `#4A9FB8` | `text-aide-accent-info`, `text-smalti-sky-blue` |
| Crimson — error / critical | `#F10C45` | `#C8083A` | `text-smalti-crimson` (no aide-* alias) |

### When to reach for which layer

| Need | Use |
|------|-----|
| Existing component, no opacity modifier needed | Legacy `aide-*` (one-line change usually) |
| New component or any opacity modifier (`/10`, `/40`, etc.) | New `smalti-*` |
| Brand-asset raw HEX (logo, marketing) | Theme-static `smalti-ink-*` / `smalti-black` |

## Key decisions baked into the tokens

1. **Glass Cyan is the only primary action color.** Sky Blue is brand-asset only — never used for CTA. (See `_workspace/04_visual_identity.md` §3.3 B05 decision log.)
2. **Gold is restricted to ~1% of the screen.** Active-tab top border, agent label in the status bar, hero accents. Never a button background.
3. **Crimson is error/critical only.** Not a general accent. Reserved for destructive actions and inline error states.
4. **Terminal panes use Surface tone in both themes.** No more "dark terminal in light mode" exception — design lands consistently.
5. **Active-row indicator is a 3-layer combination** — 3px Cyan accent bar + 10% Cyan tint background + 2px Gold avatar ring. See [[../components/workspace/WorkspaceNav.tsx]] for the canonical implementation.

## Migration history

The rebrand landed in waves so the live app could keep building while we worked.

| Wave | What landed | Reference |
|------|-------------|-----------|
| 1 (PR #111) | Registered `smalti-*` Tailwind tokens + RGB-triplet CSS variables | [[rebrand-smalti]] §B07 |
| 2 (PR #112) | WorkspaceNav active-state Cyan-bar/Gold-ring (issue #108) | `tests/unit/workspace-nav-active.test.tsx` |
| 3 (PR #113 wave 4) | IPC protocols, userData migration, README/spec/wiki sweep | [[../ideation/rebrand-smalti]] |
| 4 (post-#113) | Re-aliased legacy `--background` / `--surface` / `--accent` CSS variables to palette C values; user-visible string fixes; renderer audit against `design.pen` | This page |

## Common pitfalls

- **Don't hardcode brand HEX in components.** Always go through Tailwind classes. The palette gets tuned occasionally and hardcoded colors are how regressions ship.
- **Don't use `bg-aide-accent` as a "light primary surface".** It's the active/CTA color (Cyan). For an elevated panel, use `bg-aide-surface-elevated`. The first version of the rebranded `StatusBar.tsx` had this exact bug — cyan background instead of raised surface — until it was caught against `design.pen sbComp`.
- **Don't put inline `style={{ background: 'var(--accent)' }}` when a Tailwind class exists.** It bypasses Tailwind purging and can't be mass-changed when palettes shift.
- **Always check `design.pen` before adjusting a color.** The pencil file is the single source of truth for visual decisions; anything in the wiki here is a *summary* of that file, not a substitute.

## Guard tests

Brand-related regressions are gated by `tests/unit/brand-*.test.ts`:

- `brand-tokens.test.ts` — Tailwind token shape (37 assertions)
- `brand-renderer-strings.test.ts` — Hero text, top bar, error messages
- `brand-palette-decision.test.ts` — Glass Cyan vs Sky Blue separation
- `brand-claude-md.test.ts` / `brand-readme.test.ts` / `brand-spec-docs.test.ts` / `brand-wiki.test.ts` — prose drift

Run `pnpm test tests/unit/brand-*` after any color change to catch regressions before they ship.

## See also

- [[rebrand-smalti]] — Rebrand ideation and full decision log
- [[../ideation/rebrand-smalti]] — Trademark / namespace audit, conditional-go gate
- `_workspace/04_visual_identity.md` — Full visual identity spec (palettes A/B/C/D, typography, logo)
- `design.pen` — Live design source of truth (Hybrid frames at x=8700 / x=10200, design system at x=12000)

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'aide-background': 'var(--background)',
        'aide-surface': 'var(--surface)',
        'aide-surface-elevated': 'var(--surface-elevated)',
        'aide-surface-sidebar': 'var(--surface-sidebar)',
        'aide-border': 'var(--border)',
        'aide-terminal-bg': 'var(--terminal-bg)',
        'aide-terminal-text': 'var(--terminal-text)',
        'aide-text-primary': 'var(--text-primary)',
        'aide-text-secondary': 'var(--text-secondary)',
        'aide-text-tertiary': 'var(--text-tertiary)',
        'aide-accent': 'var(--accent)',
        'aide-accent-warning': 'var(--accent-warning)',
        'aide-accent-info': 'var(--accent-info)',
        'aide-agent-claude': 'var(--agent-claude)',
        'aide-agent-gemini': 'var(--agent-gemini)',
        'aide-agent-codex': 'var(--agent-codex)',
        'aide-tab-active-bg': 'var(--tab-active-bg)',
        'aide-tab-inactive-bg': 'var(--tab-inactive-bg)',
        // --- smalti semantic tokens (theme-responsive) ---
        // Uses rgb(var(...) / <alpha-value>) pattern: CSS vars hold RGB triplets so that
        // Tailwind opacity modifiers (e.g. bg-smalti-canvas/50) compile to valid CSS.
        // Values change between :root (dark) and .light — always use these for UI surfaces/text.
        'smalti-canvas':    'rgb(var(--smalti-canvas)    / <alpha-value>)',
        'smalti-surface':   'rgb(var(--smalti-surface)   / <alpha-value>)',
        'smalti-raised':    'rgb(var(--smalti-raised)    / <alpha-value>)',
        'smalti-divider':   'rgb(var(--smalti-divider)   / <alpha-value>)',
        'smalti-ink-body':  'rgb(var(--smalti-ink-body)  / <alpha-value>)',
        'smalti-ink-muted': 'rgb(var(--smalti-ink-muted) / <alpha-value>)',
        'smalti-cyan':      'rgb(var(--smalti-cyan)      / <alpha-value>)',
        'smalti-gold':      'rgb(var(--smalti-gold)      / <alpha-value>)',
        'smalti-crimson':   'rgb(var(--smalti-crimson)   / <alpha-value>)',
        'smalti-sky-blue':  'rgb(var(--smalti-sky-blue)  / <alpha-value>)',
        // --- smalti brand assets (theme-static) ---
        // Fixed HEX values — intentionally NOT theme-responsive.
        // Use for logo, brand identity, raw palette reference (palette D + ink scale).
        'smalti-black':    '#0D0D10',
        'smalti-ink-50':   '#F5F5F0',
        'smalti-ink-100':  '#E6E7ED',
        'smalti-ink-300':  '#9BA0B0',
        'smalti-ink-500':  '#5A5F6E',
        'smalti-ink-700':  '#2A2E3D',
        'smalti-ink-800':  '#1B1E2A',
        'smalti-ink-900':  '#11131B',
        'smalti-ink-950':  '#0A0B10',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

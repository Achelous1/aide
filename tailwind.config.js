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
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

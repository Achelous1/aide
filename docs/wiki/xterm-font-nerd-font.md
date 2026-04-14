---
title: "xterm.js Nerd Font 글리프 렌더링"
tags: ["xterm", "font", "nerd-font", "terminal", "oh-my-zsh", "powerline"]
category: environment
created: 2026-04-14
related: [[eperm-uv-cwd-bugfix]]
---

# xterm.js Nerd Font 글리프 렌더링

## 문제

oh-my-zsh/Powerlevel10k 등이 사용하는 Powerline/Nerd Font 글리프(U+E000–U+F8FF)가 xterm.js 터미널에서 박스(□)로 표시된다.

## 원인

`xterm-cache.ts`의 `fontFamily`에 Nerd Font 변종이 없음. JetBrains Mono, Menlo 등 일반 모노스페이스 폰트는 PUA(Private Use Area) 글리프를 포함하지 않는다.

## 해결

### 1. Symbols Nerd Font Mono 번들링

`src/renderer/assets/fonts/SymbolsNerdFontMono-Regular.ttf` (2.2MB)  
→ 글리프만 포함하는 보조 폰트. 기존 텍스트 렌더링에 영향 없음.

### 2. @font-face 등록 (`src/renderer/styles/global.css`)

```css
@font-face {
  font-family: 'Symbols Nerd Font Mono';
  src: url('../assets/fonts/SymbolsNerdFontMono-Regular.ttf') format('truetype');
}
```

### 3. fontFamily 업데이트 (`src/renderer/lib/xterm-cache.ts`)

```ts
fontFamily: "'JetBrainsMono Nerd Font Mono', 'JetBrainsMono NF', 'MesloLGS NF', 'JetBrains Mono', 'IBM Plex Mono', Menlo, Monaco, 'Symbols Nerd Font Mono', monospace",
unicodeVersion: '11',
```

폴백 순서:
1. 시스템에 설치된 JetBrains Mono Nerd Font → 있으면 사용
2. MesloLGS NF (Powerlevel10k 권장) → 있으면 사용
3. 일반 JetBrains Mono / IBM Plex Mono → 텍스트 렌더링
4. **Symbols Nerd Font Mono (번들)** → Nerd Font 글리프 폴백 보장

## 참고

- 연구 문서: `docs/raw/nerd-fonts-terminal-rendering.md`
- Nerd Font 글리프 범위: U+E000–U+F8FF (PUA), 일부 U+10XXXX 확장
- `unicodeVersion: '11'` — 이모지/광폭 문자 너비 올바른 계산

# Nerd Fonts & Terminal Rendering in xterm.js

**Date**: 2026-04-14  
**Context**: AIDE xterm.js 터미널에서 oh-my-zsh/Powerlevel10k 글리프 렌더링 문제 분석

---

## Nerd Font 글리프 범위

Nerd Fonts는 기존 모노스페이스 폰트에 아이콘 글리프를 추가 패치한 폰트 컬렉션이다.

| 범위 | 이름 | 예시 |
|------|------|------|
| U+E000–U+E00A | Seti-UI + Custom | 파일 아이콘 |
| U+E0A0–U+E0A2 | Powerline | 브랜치 , 자물쇠 |
| U+E0B0–U+E0B3 | Powerline Extra | 화살표 , |
| U+E0C0–U+E0D7 | Powerline Extra Symbols | 물결, 불꽃 |
| U+E200–U+E2A9 | Font Awesome Extension | |
| U+E700–U+E7C5 | Devicons | 언어 로고 |
| U+F000–U+F2E0 | Font Awesome | 일반 아이콘 |
| U+F400–U+F4E6 | Octicons | GitHub 아이콘 |
| U+F500–U+FD46 | Material Design Icons | |

oh-my-zsh 테마(Powerlevel10k 등)가 주로 사용하는 범위: **U+E0A0–U+E0D7** (Powerline 화살표/글리프)

---

## xterm.js fontFamily 폴백 메커니즘

xterm.js는 웹 표준 CSS `font-family` 폴백을 그대로 사용한다:

1. 목록의 첫 번째 폰트에서 글리프를 찾음
2. 해당 폰트에 글리프가 없으면 다음 폰트로 폴백
3. 모든 폰트에 없으면 대체 문자(□ 박스)로 표시

**핵심**: JetBrains Mono, Menlo 등 일반 모노스페이스 폰트는 U+E000 이상의 PUA(Private Use Area) 글리프를 포함하지 않는다. Nerd Font 패치 버전이나 Symbols Nerd Font를 fontFamily에 포함해야 한다.

---

## Symbols Nerd Font Mono vs 풀 Nerd Font 패치

| 구분 | Symbols Nerd Font Mono | 풀 패치 폰트 (e.g., JetBrainsMono NF) |
|------|------------------------|---------------------------------------|
| 내용 | 심볼 글리프만 포함 (텍스트 없음) | 기존 폰트 + 심볼 글리프 |
| 크기 | ~2.4MB (TTF) | 기존 폰트 크기 + 심볼 |
| 용도 | 보조 폰트 (다른 폰트와 조합) | 단독 사용 |
| 장점 | 기존 텍스트 렌더링에 영향 없음 | 단일 폰트로 완결 |

**AIDE 선택**: Symbols Nerd Font Mono를 보조 폰트로 번들링  
→ 기존 JetBrains Mono 텍스트 렌더링 유지 + Nerd Font 글리프 보장

---

## unicodeVersion이 렌더링에 미치는 영향

xterm.js의 `unicodeVersion` 옵션은 유니코드 문자 너비 계산에 사용된다:

| 버전 | 영향 |
|------|------|
| `6` (기본값) | 이모지/광폭 문자를 단일 너비로 처리할 수 있음 |
| `11` | 이모지, CJK 확장 문자, 광폭 기호의 너비를 유니코드 11 표준으로 계산 |

`unicodeVersion: '11'`로 설정 시: 이모지, CJK 문자, 일부 Nerd Font 광폭 글리프가 올바른 너비(2칸)로 렌더링된다. 미설정 시 글리프 옆에 빈 공간이 생기거나 텍스트가 겹치는 현상이 발생할 수 있다.

---

## 주요 Nerd Font 패밀리 이름 (CSS font-family)

시스템에 설치된 경우 fontFamily에서 인식되는 이름:

```
"JetBrainsMono Nerd Font Mono"   ← JetBrains Mono NF
"JetBrainsMono NF"
"MesloLGS NF"                    ← Powerlevel10k 공식 권장
"Hack Nerd Font Mono"
"FiraCode Nerd Font Mono"
"Symbols Nerd Font Mono"         ← 심볼 전용, 보조 폰트로 사용
"Symbols NFM"
```

---

## AIDE 적용 방안

1. `Symbols Nerd Font Mono Regular` TTF를 `src/renderer/assets/fonts/`에 번들링
2. `global.css`에 `@font-face`로 등록
3. `xterm-cache.ts` fontFamily에 추가 (모노스페이스 바로 앞 폴백)
4. `unicodeVersion: '11'` 설정

이 방식의 장점:
- 사용자가 Nerd Font를 설치하지 않아도 글리프 표시
- 기존 텍스트 렌더링(JetBrains Mono) 영향 없음
- 번들 크기 증가 ~2.4MB (Electron 앱 규모 대비 무시 가능)

---

## 참고

- Nerd Fonts GitHub: https://github.com/ryanoasis/nerd-fonts
- xterm.js Unicode 지원: https://xtermjs.org/docs/api/terminal/interfaces/iterminaloptions/
- Powerline 글리프 범위: https://github.com/ryanoasis/nerd-fonts/wiki/Glyph-Sets-and-Code-Points

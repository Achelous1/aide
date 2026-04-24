# 브랜드 리네이밍 입력 정리

## 배경
- 현재 프로덕트명 **AIDE**(AI-Driven IDE)는 Android IDE와 네이밍 충돌 → SEO·혼동 리스크
- `docs/ideation/rebrand-partide.md`: Partide(1순위 권장) — particle+IDE 블렌드 조어, 화학 "-ide" 톤
- `docs/ideation/rebrand-wnide.md`: wnide(보류) — "whine" 동음·wn- 자음 클러스터 리스크

## 사용자 요청 (이번 세션)
> 현재 프로덕트 이름을 좀 변경하고 싶어. AI Driven IDE라서 AIDE로 지었는데, 이미 Android IDE가 있어.
> docs/ideation/ 하위에 리브랜드 문서를 읽고 적절한 이름을 지어줬으면 좋겠는데,
> **oh-my-claudecode나, jq 같은 hacky한 톤**이 되었으면 좋겠어.

## 사업 영역
- 터미널 중심 Electron IDE
- CLI 코드 에이전트(claude/gemini/codex) 오케스트레이터
- 자연어 → 플러그인 자동 생성("Create n Play")
- Rust 코어 이전 진행 중(napi-rs 기반)

## 타깃
- CLI에 익숙한 개발자 (power user, hacker culture)
- AI 에이전트를 일상 도구로 쓰는 얼리어답터
- 커스터마이징을 즐기는 tinkerer (neovim·tmux·zsh 생태계 사용자군)

## 톤 레퍼런스
- **`jq`** — 2글자, 소문자, CLI, cryptic, JSON query
- **`ripgrep` / `rg`** — 짧은 별칭, 빠름 상징
- **`fzf`, `fd`, `sd`, `bat`, `eza`** — 소문자, 2–3글자 선호
- **`oh-my-zsh` / `oh-my-claudecode`** — 커뮤니티 훅, 자학적 유머
- **`starship`, `atuin`, `zoxide`** — 중간 길이, 서정적 해커 톤
- **`tmux`, `nvim`, `htop`** — 축약·포스트픽스 관습
- **`warp`, `zed`, `quark`** (사용자 추가) — 4자 내외 punchy 단음절/단어, 현대 dev-tool 브랜드 톤. 단 Quark은 기존 상표(Quark Software) 충돌 지적됨(partide §3 참조) → 동일 단어 금지, 질감만 차용
- **회피**: 마케팅적 superlative, corporate suffix(-ify, -ly, -io), 긴 조어

## 하드 요구사항
- 소문자 표기 기본 (`all-lowercase`)
- 4–8자 권장 (2–3자는 CLI alias로만 따로 제공 가능)
- 영어권 발음 가능 + 한국어 음차 1가지로 고정 가능
- npm·GitHub org·도메인(.dev/.sh 우선) 선점 가능성 높아야 함
- Android IDE와 별개로 식별됨
- 기존 AIDE 자산(이메일 `jsdesign1204@gmail.com`, 도메인 미확정)과 충돌 없음

## 회피 사항
- "Particle" 단독 사용 금지(Particle Industries 충돌, partide 문서 §6)
- "whine" 동음 회피(wnide 문서 §6.1)
- 이미 개발자 도구로 사용되는 이름 (Forge/Anvil/Kiln/Lepton 등 partide §3 참조)

## 이번 네이밍 모드에서 기대하는 것
1. 해커 CLI 전통 톤의 네이밍 후보 12개 이상
2. 각 후보별: 의미 레이어, 발음, 네임스페이스 간이 확인, 리스크
3. TOP 5 선정 + 평가 매트릭스(독창성/발음/해커톤/네임스페이스/확장성)
4. 슬로건 톤 예시 2–3개 (본격 카피는 별도 단계)
5. 사용자가 Partide(기존 1순위)와 정면 비교 가능한 형태

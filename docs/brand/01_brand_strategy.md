# 브랜드 전략 브리프 (naming-specialist 용)

> 풀 전략 아님. 네이밍 탐색을 위한 최소 입력.
> 입력 근거: `_workspace/00_input.md`, `docs/ideation/rebrand-{partide,wnide}.md`, `docs/ideation/rust-core-migration.md`.

---

## 1. 한 줄 브랜드 정의

**터미널에 사는, 당신이 직접 조립하는 AI 에이전트 IDE** — 기성품 IDE 범주에 대한 도발. 감성은 해커 CLI 언더그라운드(`jq`, `ripgrep`, `nvim`, `starship` 계열), 마케팅 광택 없는 소문자 실용주의.

---

## 2. 타깃 페르소나

**P1. 터미널 네이티브 (primary)**
- nvim/tmux/zsh 또는 fish + starship, dotfiles 깃헙 공개
- `brew install`·`cargo install` 로 도구를 쌓아올림, GUI IDE는 무겁다고 느낌
- Claude Code / Codex CLI / aider 를 이미 쓰고 있고, "오케스트레이션"과 "플러그인 조립"에 반응함
- 이름에서 기대: 짧고, 타이핑 쉽고, 대문자 없고, "이게 뭔지" 궁금하게 만드는 cryptic함

**P2. AI 에이전트 tinkerer (secondary)**
- 자연어로 도구를 만드는 것에 흥분하는 얼리어답터
- MCP 서버를 직접 짜고, CLI 에이전트 여러 개를 병렬로 돌리는 사람
- 이름에서 기대: 조립/해킹 은유, 자학적 유머 허용 (`oh-my-*` 밈 소화)

---

## 3. 브랜드 아키타입 — 주: Outlaw(반항아) / 부: Magician(마법사)

### 왜 Outlaw 70%
- 제품 철학이 **"왜 기성 IDE가 필요한가"** (wnide 문서 §4.3) — 이건 반항아의 정의("규칙은 깨라고 있다")에 직결.
- 타깃이 GUI IDE·엔터프라이즈 SaaS를 거부하고 터미널로 내려간 사람들. 순응이 아니라 이탈.
- 해커 CLI 전통(`jq`, `ripgrep`, `vim`) 자체가 Outlaw 톤 — 대문자·마케팅·친절한 온보딩을 거부.
- 톤: 도발적, 날것, self-deprecating, 설명하지 않음. `ripgrep` README 첫 문장이 "ripgrep is a line-oriented search tool"인 것처럼 기능만 말함.

### 왜 Magician 30% (부)
- 제품은 단순 반항이 아니라 **"자연어 → 플러그인"** 이라는 변환 능력을 갖고 있음 (Create n Play).
- Rust 코어 이전은 "보이지 않는 내부를 다시 만들어 체감 속도를 바꾸는" 마법사적 행위.
- Outlaw만 쓰면 냉소에 갇히고, Magician이 들어오면 "이걸로 뭐든 만들 수 있다"는 가능성이 열림.
- Apple(Magician)의 "다르게 생각하라"와 Harley(Outlaw)의 "길 위의 반항"을 교차시킨 자리.

### 금기 체크
- ❌ Caregiver/Innocent 배제 — "따뜻한", "누구나 쉽게" 같은 온보딩 카피 금지.
- ❌ Ruler 배제 — "프리미엄", "엔터프라이즈급", "최고의" 금지.
- ❌ Jester 과용 금지 — `oh-my-*` 밈은 프로덕트명이 아니라 **커뮤니티/별칭 레이어**로 제한.

### 아키타입이 네이밍에 반영되는 방식
- **소문자 강제** — 대문자는 권위(Ruler)의 기호. Outlaw는 소문자만 씀.
- **짧고 cryptic** — 설명하지 않음이 미덕. `jq`가 "JSON Query"인 걸 README 안 읽으면 모르듯.
- **조어·축약·동사 어근 환영** — 기성 단어 그대로 쓰는 건 평범인(Everyman) 영역.
- **"-ide" / "-sh" / "-ctl" 같은 유닉스 접미사 우호** — 계보 내 소속 신호.

---

## 4. 에센스 키워드 (네이밍 어휘 풀)

naming-specialist가 블렌딩·조어·은유에 활용할 씨앗 7개:

1. **assemble / compose / stitch** — 조립, 사용자가 부품으로 만드는 IDE
2. **particle / fragment / shard / grain** — 최소 단위, 입자 (※ "particle" 단독은 Particle Industries 충돌로 회피, 은유로만)
3. **forge-not / anti-IDE / un-** — 반항·부정 접두사 (기성 카테고리 거부)
4. **core / kernel / shell / nucleus** — 얇은 셸 + Rust 코어 하이브리드 (rust-core-migration 맥락)
5. **weave / knit / braid** — CLI 에이전트 여러 개를 엮는 오케스트레이션
6. **drift / nomad / vagrant** — 고정된 환경이 아닌 유동적 도구
7. **spark / kindle / ignite** — Create n Play, 자연어로 불붙이는 순간 (단, 스타트업틱하면 감점)

---

## 5. 경쟁·레퍼런스 톤 맵

naming-specialist가 "우리가 이 계보의 어디에 앉을 것인가"를 잡기 위한 좌표.

| 레퍼런스 | 포지션 | 톤 시사점 |
|---|---|---|
| **jq** | 2자, cryptic, 도메인 특화. 이름만 봐선 뭔지 모름 → 쓴 사람만 안다. | 짧을수록 강하다. 설명을 포기하는 용기. |
| **ripgrep / rg** | 풀네임은 서술적(`grep` 계보 선언), alias는 2자. "더 빠른 X" 포지션. | 이중 레이어: 풀네임(계보) + alias(실사용). 우리도 채택 고려. |
| **oh-my-zsh** | zsh 위에 얹는 커뮤니티 프레임워크. 자학적 감탄사 + 기존 도구명. | 프로덕트명으론 길지만, 커뮤니티·설정팩 브랜드로는 이상적. 서브레이어 후보. |
| **neovim / nvim** | vim의 리포크, "다음 세대" 선언. `n-` 접두사로 계보와 단절 동시에. | 기성 카테고리의 재해석이 이름 구조에 박혀있음. "n-IDE" 계열 탐색 근거. |
| **starship** | 중간 길이(8자), 서정적 명사, 도메인(.rs). prompt generator라는 좁은 목적에 거대 은유. | 짧음만이 정답은 아님. 시적 명사 + Rust 생태계 소속감. fallback 경로. |
| **zoxide / atuin** | 4-5자 조어, 기존 단어(z, 역사적 인물) 변형. `.rs` 생태계 친화. | 조어가 이미 생태계 표준. 우리도 조어 1순위 OK. |

**결론 좌표**: `jq` 축(극단 cryptic·2자)과 `starship` 축(서정 조어·8자) 사이, **`zoxide/ripgrep` 라인(4-7자 조어 + 짧은 alias)**에 앉는 것이 가장 안정적.

---

## 6. 네이밍 제약 요약

### 하드 제약 (00_input.md §하드 요구사항)
- all-lowercase 기본
- 4–8자 권장 (2–3자는 CLI alias로만)
- 영어 발음 가능 + 한국어 음차 1가지 고정 가능
- npm / GitHub org / `.dev` 또는 `.sh` 도메인 선점 가능성 높아야 함
- Android IDE와 분리 식별
- 기존 AIDE 자산과 충돌 없음

### 회피 영역
- **Particle 단독** — Particle Industries(Class 9 활성) 충돌. 은유·복수형 일반명사로만 사용 가능.
- **whine 동음** — wnide 교훈. `/waɪn/` 발음 나는 조합 금지.
- **이미 쓰이는 개발자 도구명** — Forge, Anvil, Kiln, Lepton, Quark 전부 아웃 (partide §3).
- **corporate suffix** — `-ify`, `-ly`, `-io`, `-ify` 금지 (해커 톤 위반).
- **마케팅 superlative** — "ultra-", "super-", "hyper-", "smart-" 금지.
- **백크로님 냄새** — 강제 이니셜리즘은 wnide 사례처럼 역효과 (W-N-I-D-E는 발음 불가).

### 보너스 조건 (있으면 좋음)
- 2-3자 CLI alias 도출 가능 (`ripgrep→rg` 패턴)
- Rust 크레이트 네임스페이스 친화 (`*-core`, `*-cli`)
- 동사로도 쓸 수 있으면 가점 (`let me {name} it`)

---

## 7. 네이밍 방향성 — 탐색 축 3가지

naming-specialist는 **각 축에서 최소 4후보씩, 총 12+개**를 뽑아주세요.

### 축 A. 조어·블렌드 (particle-IDE 계보 계승)
- partide의 화학 `-ide` 패턴을 유지하되 Particle Industries 회피.
- 후보 씨앗: `-ide` 접미사 + 조립/입자/유동 어근의 조합.
- 예시 시드(참고만): `shardide`, `weavide`, `driftide`, `knide`(wnide 재시도), `grainide`.
- 평가 포인트: 화학 톤이 해커 톤과 충돌하지 않는지, 발음이 자연스러운지.

### 축 B. 동사·명령형 (CLI 네이티브 톤, jq/rg/fd 계보)
- 짧은 동사 또는 축약형. 터미널에 `$ {name} .` 쳤을 때 말이 되는가?
- 후보 씨앗: assemble/compose/weave/stitch/forge의 축약 + 3-5자.
- 예시 시드: `asm`, `wv`, `stitch`, `compo`, `forgd`.
- 평가 포인트: 기존 유닉스 커맨드와 충돌 없는지 (`man <name>` 체크 필수), alias 자연스러운지.

### 축 C. 메타·self-referential (wnide의 도발 계승, 순화)
- "IDE인데 IDE가 아니다" 같은 메타 선언을 조어 안에 숨김.
- 접두사 활용: `n-`(neovim 패턴), `un-`, `non-`, `post-`, `x-`.
- 후보 씨앗: `nide`, `unide`, `xide`, `postide`, `noide`.
- 평가 포인트: whine/wide/void 같은 부정 동음 회피, 타이핑 시 손가락 충돌 없는지.

---

## 부록. naming-specialist에게 넘기는 필수 체크리스트

각 후보 평가 시 반드시 통과시킬 것:

- [ ] 소문자 표기 자연스러움
- [ ] 4–8자 (또는 풀네임+alias 이중 구조)
- [ ] 한국어 음차 1개로 고정 가능 (분열 없음)
- [ ] `npm view <name>` 404, `github.com/<name>` available (샘플링)
- [ ] `.dev` 또는 `.sh` 도메인 선점 가능성
- [ ] `man <name>` — 기존 유닉스 커맨드 없음
- [ ] Android IDE·Particle Industries·whine 3종 회피
- [ ] Outlaw+Magician 톤에 부합 (Caregiver·Ruler·Innocent 기운 없음)
- [ ] Partide(기존 1순위)와 1:1 비교 가능한 차별점 1줄 서술

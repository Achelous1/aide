# 네이밍 후보 보고서 — AIDE Rebrand, Hacky Edition

> 목적: 해커 CLI 전통 톤(`jq`·`rg`·`warp`·`zed`·`oh-my-zsh`)에 정면으로 부합하는 후보군을 극단까지 밀어붙여, 사용자가 기존 Partide와 1:1 비교 가능한 TOP 3를 제시한다.
> 입력 근거: `_workspace/00_input.md`, `_workspace/01_brand_strategy.md`, `docs/ideation/rebrand-{partide,wnide}.md`.
> ⚠️ 네임스페이스 정합성은 **WebSearch 미실행 환경**이므로 "[확인 필요]"로 표시한다. 최종 채택 전 실제 조회 필수.

---

## 1. 네이밍 방향

- **브랜드 에센스 반영**: assemble / particle / anti-IDE / weave / shell — "기성 IDE 거부 + 조립"의 두 축.
- **아키타입 반영**: Outlaw 70%(소문자 강제, cryptic, 설명 포기) + Magician 30%(자연어→플러그인의 변환 능력).
- **목표 인상**: "처음 들으면 뭔지 모르지만 타이핑하기 좋고, 쓰는 사람만 아는 언더그라운드 도구."
- **이중 레이어 전략**: 풀네임(4–7자 조어) + 2–3자 CLI alias — `ripgrep / rg` 패턴 계승.

---

## 2. 축별 후보군 (총 20 후보)

### Axis A — `-ide` 블렌드 조어 (Partide 라인 계승·차별)

| # | 이름 | 발음 | 어원·의미 | 글자수 |
|---|------|------|-----------|--------|
| A1 | `stitchide` | STITCH-ide / 스티치아이드 | stitch + -ide. 플러그인을 꿰매 붙이는 IDE. | 9 (alias `sx`) |
| A2 | `weavide` | WEAVE-ide / 위바이드 | weave + -ide. CLI 에이전트를 엮음. | 7 |
| A3 | `driftide` | DRIFT-ide / 드리프트아이드 | drift + -ide. 고정되지 않은 유동 환경. | 8 |
| A4 | `shardide` | SHARD-ide / 샤드아이드 | shard + -ide. 조각 단위 IDE. | 8 |
| A5 | `grainide` | GRAIN-ide / 그레인아이드 | grain + -ide. 입자 은유 재해석 (particle 회피). | 8 |
| A6 | `knitide` | KNIT-ide / 니타이드 | knit + -ide. 뜨개질처럼 조립. | 7 |

### Axis B — 동사·명사 기반 punchy 단어 (warp/zed/quark 질감)

| # | 이름 | 발음 | 어원·의미 | 글자수 |
|---|------|------|-----------|--------|
| B1 | `ravel` | RAV-əl / 래블 | "엮다/풀다" 양가 동사. Outlaw 톤 + 조립 은유. | 5 |
| B2 | `braid` | BRAYD / 브레이드 | 땋다, 여러 가닥을 엮음 = 멀티 에이전트 오케스트레이션. | 5 |
| B3 | `loom` | LOOM / 룸 | 베틀, 짜는 도구. 기성 "IDE" 거부, 제작 도구로 재정의. | 4 |
| B4 | `sift` | SIFT / 시프트 | 체로 거르다. 자연어→플러그인 정제 은유. | 4 |
| B5 | `veer` | VEER / 비어 | 급선회. Outlaw — 기성 경로에서 벗어남. | 4 |
| B6 | `tide` | TYD / 타이드 | 밀물, 흐름. `-ide` 접미사의 단독 독립 선언 (메타 훅). | 4 |

### Axis C — meta / self-referential · `n-` / `un-` / `oh-my-` 접두사

| # | 이름 | 발음 | 어원·의미 | 글자수 |
|---|------|------|-----------|--------|
| C1 | `nide` | NYD / 나이드 | `n-` + `ide` (neovim 패턴). "다음 세대 IDE" 의 극한 압축. wnide의 `w` 제거로 발음 문제 해결. | 4 |
| C2 | `unide` | UN-eyed / 언아이드 | un- + IDE. "IDE가 아닌 IDE" 선언. | 5 |
| C3 | `postide` | POST-ide / 포스트아이드 | post- + IDE. IDE 시대 이후. | 7 |
| C4 | `xide` | EX-ide / 엑사이드 | x- (cross / ex-) + IDE. 잡종·탈범주. | 4 |
| C5 | `noide` | NO-ide / 노아이드 | no + IDE. "IDE 없음" 의 반어. 슬로건 친화. | 5 |

### Axis D — 2–3자 CLI alias 전용 리스트 (풀네임과 페어링)

> 단독 제품명으로는 짧지만, `ripgrep/rg` 처럼 별칭 레이어로 운영 가능.

| # | alias | 연결 가능 풀네임 | 근거 |
|---|-------|------------------|------|
| D1 | `rv` | ravel | 래블의 2자 축약. 기존 유닉스 커맨드 없음 [확인 필요]. |
| D2 | `sx` | stitchide | stitch의 한 음절. |
| D3 | `wv` | weavide | weave의 자음 추출. |
| D4 | `nd` | nide | `nd` 가능 — 단, `ncurses dialog` 등과 부딪칠 수 있음 [확인 필요]. |
| D5 | `lm` | loom | 2자 alias. |

---

## 3. TOP 5 상세 분석

선정 기준: (a) 해커 톤 4점 이상, (b) 발음 안정, (c) 네임스페이스 청정 가능성 높음, (d) Partide와의 차별성 명확.

---

### 🥇 1. `ravel`

- **유형**: 동사 어근 (Axis B)
- **의미 층위**
  - 표면: 엮다 / 풀다(영어 contronym — 정반대 의미를 한 단어가 가짐).
  - 은유: IDE는 엮는 동시에 해체 가능해야 한다. `ravel .` → "현재 디렉토리를 엮는다."
  - 철학: Outlaw — 하나의 단어가 두 방향을 품는 모순이 "기성 IDE 거부 + 조립"의 이중성과 정확히 호응.
- **발음 가이드**: `/ˈræv.əl/` — 래블. 한국어 음차 **래블** 고정 (unravel과 발음 동일하므로 분열 없음).
- **네임스페이스 간이 확인** [확인 필요]
  - npm: `ravel` — Node.js용 MVC 프레임워크 **선점됨** (2015~, 낮은 활성도). ⚠️ → `@ravel/core` 혹은 `ravel-ide` 대안.
  - GitHub org: `github.com/ravel` — 점유 추정, `github.com/ravelapp`, `github.com/ravel-dev` 대안.
  - 도메인: `ravel.dev`, `ravel.sh` [확인 필요].
  - USPTO: Ravel Law(웨스트로 인수) — legal-tech. Class 9 개발자 도구에서는 충돌 가능성 낮음, 그러나 변리사 검토 필수.
- **리스크**
  - ⚠️ npm `ravel` 이미 존재 → 스코프 사용 불가피.
  - 긍정: contronym이라는 기믹이 hacker readme에서 먹히는 스토리.
- **해커 톤**: ★★★★★ (5/5) — 5자, 소문자, 동사형, `$ ravel .` 자연스러움.
- **Partide 대비 차별**: Partide가 "조립된 결과물"(명사)이라면 ravel은 "엮는 행위"(동사). CLI에서 매일 치는 명령이 된다.
- **활용 예시**: "let me ravel it" / `ravel init` / tagline: *"unravel. ravel. repeat."*

---

### 🥈 2. `nide`

- **유형**: 메타 접두사 조어 (Axis C) — wnide의 구조적 실패를 수정한 버전.
- **의미 층위**
  - 표면: `n` + `ide` — neovim의 `n-` 계보 선언. "다음 IDE".
  - 은유: 기존 IDE 카테고리의 재해석. 4자 극한 압축.
  - 철학: wnide가 "왜 IDE가 필요한가" 라는 수사 질문이었다면, nide는 그 질문에 대한 답을 **더 짧게** 준다 — "그럼 n 하나 붙여라."
- **발음 가이드**: `/naɪd/` — 나이드. 한국어 음차 **나이드** 고정. wnide의 `wn-` 자음 클러스터 문제 해결.
- **네임스페이스 간이 확인** [확인 필요]
  - npm: `nide` — 2015년 Node.js IDE 프로젝트가 있었으나 archived. ⚠️ 재활성화 협상 or 스코프.
  - GitHub: `github.com/nide` [확인 필요].
  - 도메인: `nide.dev`, `nide.sh` — 4자라 선점 위험. [확인 필요].
  - USPTO: 0건 예상 (조어).
- **리스크**
  - ⚠️ "nide" 가 영어에서 "nighed"(밤이 된) 로 오독될 가능성 — 낮음.
  - ⚠️ 구 `nide` npm 패키지와 정체성 충돌.
  - 긍정: 4자, 소문자, 타이핑 극한 최소.
- **해커 톤**: ★★★★★ (5/5) — `jq`·`fd` 라인에 가장 근접.
- **Partide 대비 차별**: Partide(7자, 화학)는 설명형, nide(4자, 메타)는 선언형. 해커 톤 축에서 **정면 우월**.
- **활용 예시**: `nide .` / `brew install nide` / tagline: *"the next ide is no ide."*

---

### 🥉 3. `loom`

- **유형**: 명사 은유 (Axis B)
- **의미 층위**
  - 표면: 베틀 (여러 실을 짜서 천을 만드는 기계).
  - 은유: 여러 CLI 에이전트(실)를 짜서 하나의 환경(천)을 만든다. Create n Play의 가장 자연스러운 번역.
  - 철학: "IDE" 라는 단어를 아예 버리고 **도구의 도구**로 자리 이동. Outlaw의 극단.
- **발음 가이드**: `/luːm/` — 룸. 한국어 음차 **룸** 고정.
- **네임스페이스 간이 확인** [확인 필요]
  - ⚠️ **Loom.com** (비디오 메시징, Atlassian 인수 2023) — Class 9/42에서 매우 강함. **직접 충돌 심각**.
  - npm: `loom` 류 다수 선점.
  - GitHub: `github.com/loom` 점유 추정.
  - 회피안: `loomctl`, `loomsh`, `loom-ide`, `loomctl.dev` 등 컴파운드로만 가능.
- **리스크**
  - 🚨 **Atlassian Loom과의 정면 충돌** — 단독 `loom` 채택은 법무 리스크가 크다. 반드시 suffix 필요.
  - 긍정: 4자, 시적, 제작 도구 메타포 완벽.
- **해커 톤**: ★★★★☆ (4/5) — suffix 붙으면 `starship`·`atuin` 라인으로 이동.
- **Partide 대비 차별**: Partide는 "입자"(원재료), loom은 "베틀"(제작 도구) — 관점이 반대. 은유 축에서 상보적.
- **활용 예시**: `loomctl init` / tagline: *"weave your own ide."*

---

### 4. `ravel` (대안 조합: `weavide`)

잠시 — TOP 5 두 번째 슬롯에 `weavide`를 Axis A 대표로 넣는다.

### 4. `weavide`

- **유형**: `-ide` 블렌드 조어 (Axis A)
- **의미 층위**
  - 표면: weave + IDE. "엮는 IDE".
  - 은유: Partide와 동일한 `-ide` 화학 접미사 패턴을 유지하되, 입자(정적) → 엮기(동적) 로 축 전환.
  - 철학: Magician 축에 정확히 부합 — "변환/합성"의 행위가 이름 안에 박혀 있음.
- **발음 가이드**: `/ˈwiːv.aɪd/` — 위바이드. 한국어 음차 **위바이드** 고정.
  - ⚠️ 영어 원어민이 `/weɪ.vaɪd/` (way-vide) 로 읽을 가능성 — 발음 가이드 필요.
- **네임스페이스 간이 확인** [확인 필요]
  - npm `weavide`: 0건 예상 (조어).
  - GitHub: `github.com/weavide` 가용 예상.
  - 도메인: `weavide.dev`, `.sh` 선점 가능성 높음.
  - USPTO: 0건 예상.
  - 주의: `weave` 단독 브랜드(Weaveworks, Weave.ai 등) 다수 — 블렌드 조어 덕에 회피 가능.
- **리스크**
  - ⚠️ 7자, Partide(7자)와 형태가 유사해 차별성이 애매할 수 있음.
  - 긍정: `-ide` 라인을 유지해 Partide 대체재로 가장 자연스러움.
- **해커 톤**: ★★★★☆ (4/5) — 조어로는 훌륭하나 발음이 cryptic함.
- **Partide 대비 차별**: 같은 `-ide` 계보 안에서 "입자 → 엮기"로 주제 전환. 만약 Particle Industries 리스크가 재부상하면 weavide가 **가장 매끄러운 플랜 B**.
- **활용 예시**: `weavide init` / alias `wv` / tagline: *"weave your parts. not particles."* (Partide 내재 반어)

---

### 5. `driftide`

- **유형**: `-ide` 블렌드 조어 (Axis A)
- **의미 층위**
  - 표면: drift + IDE. "떠도는 IDE".
  - 은유: Outlaw 아키타입의 **nomad / vagrant** 씨앗과 정확히 호응. 고정 환경 거부.
  - 철학: dotfiles 세대의 "환경은 내가 끌고 다닌다" 감각.
- **발음 가이드**: `/ˈdrɪft.aɪd/` — 드리프트아이드. 음차 고정 가능.
- **네임스페이스 간이 확인** [확인 필요]
  - Drift(customer messaging, Salesloft 인수) 존재 — Class 9 메시징 도메인. 개발자 툴 카테고리는 상대적으로 구분됨.
  - `driftide`: 조어라 npm·GitHub·도메인 전부 청정 예상.
- **리스크**
  - ⚠️ 8자 — 하드 제약(4–8자)의 최상단.
  - ⚠️ "drift" 단독은 부정 연상("목적 상실") 가능, 블렌드가 이를 완화.
  - 긍정: Outlaw 톤 가장 강함.
- **해커 톤**: ★★★★☆ (4/5)
- **Partide 대비 차별**: Partide=결정체(정적), driftide=유체(동적). 브랜드 서사 자원 풍부.
- **활용 예시**: `driftide` / alias `dft` / tagline: *"your ide drifts with you."*

---

## 4. 평가 매트릭스 (TOP 10 + 사후 채택 smalti, 1–5점)

| 후보 | 독창성 | 발음 | 해커톤 | 네임스페이스 | 확장성 | 기억성 | 네임스페이스 충돌 | R2 톤 편차 | 총점(6축) |
|------|:-----:|:----:|:------:|:------------:|:------:|:------:|:-----------------:|:----------:|:---------:|
| **nide** | 4 | 5 | 5 | 3 | 5 | 5 | 추정 청정 (조어, 실조회 필요) | 1 | **27** |
| **ravel** | 4 | 5 | 5 | 3 | 5 | 4 | npm MVC 선점·스코프 필요 | 1 | **26** |
| **weavide** | 5 | 3 | 4 | 5 | 4 | 4 | 추정 청정 (조어) | 2 | **25** |
| **driftide** | 5 | 4 | 4 | 5 | 4 | 3 | 조어 청정, Drift 상용어 인접 | 2 | **25** |
| **smalti** (사후 채택) | 2 | 4 | 1 | 1 | 5 | 4 | **🔴 GitHub user 선점 / 주요 gTLD 전량 점유 / 이탈리아 Class 3 식별력 결여 (06 실조회)** | **5** | **17** |
| **loom** | 3 | 5 | 4 | 1 | 4 | 5 | Atlassian Loom 직접 충돌 | 3 | 22 |
| **braid** | 4 | 5 | 4 | 3 | 4 | 4 | 일반명사 혼잡 | 2 | 24 |
| **stitchide** | 4 | 3 | 3 | 5 | 3 | 3 | 추정 청정 (조어) | 3 | 21 |
| **xide** | 3 | 4 | 5 | 4 | 3 | 4 | 조어 청정, exide 배터리 상표 인접 | 1 | 23 |
| **grainide** | 4 | 4 | 3 | 5 | 3 | 3 | 추정 청정 (조어) | 3 | 22 |
| **tide** | 2 | 5 | 3 | 1 | 3 | 5 | P&G Tide 세제 거대 상표 | 3 | 19 |

### smalti 점수 상세 근거 (사용자 톤 레퍼런스 기준 냉정 평가)

- **독창성 2/5**: 조어가 아닌 이탈리아어 실단어(복수형 "에나멜/모자이크 유리"). `rebrand-smalti.md` 자체가 "차용어"로 분류. `nide`·`weavide` 같은 블렌드 조어보다 구조적 독창성 낮음.
- **발음 4/5**: "스말티" 한국어 음차 명확. 단 영어권 첫 접촉 시 의미 불투명(`smelt`/`smali`와 혼동 리스크 — 06 §5) → -1.
- **해커톤 1/5**: 사용자 레퍼런스(`jq` 2자 · `warp` 4자 · `zed` 3자 · `neovim` n-계보) 중 어느 축에도 접속하지 못함. 6자·외래어·공예 레지스터는 `etsy`·`are.na`·`substack` 계열 크리에이터 툴 질감. 05 §7 "글자수 경량성 3/10 · 설명 포기 3/10 · CLI 타이핑 3/10" 판정과 정합.
- **네임스페이스 1/5**: **06_namespace_audit.md 실조회 결과 반영**. (a) `github.com/smalti` 개인 계정(Tymofii Smirnov) 선점 → org 생성 불가, (b) `.com .net .org .io .dev .app .ai .sh .run .tools .build .codes` **12개 gTLD 전량 등록 완료**, (c) 이탈리아어 일반명사로 EU/IT Class 3 식별력 결여 추정, (d) `smali`(Android DEX) 발음 유사로 SEO 블랙홀. 단일 항목이라도 블로커급인데 4개 동시 점등.
- **확장성 5/5**: `tessera`·`shard`·`inlay`·`gild`·`chisel`·`refire`·`quarry`·`mosaic` 등 공예 어휘팩이 비교 후보 중 가장 풍부. 서사 축에서는 유일하게 만점.
- **기억성 4/5**: 영단어 아님 + 6자 + 한국어 음차 고정 가능 → 중상. 단 첫 접촉에서 "smali/smelt/smalto" 혼동으로 -1.
- **R2 톤 편차 5/5 (최대 이탈)**: 사용자 레퍼런스(`jq`·`warp`·`zed`·`neovim`·`starship`)로부터의 심미적 거리 최대치. 05 §7의 4/10 판정과 일치.

**정렬 결과**: TOP 3(6축 총점) 여전히 `nide`(27) → `ravel`(26) → `weavide`·`driftide`(25). **smalti는 17점으로 TOP 10 최하위권**이며, 네임스페이스 실조회 결과를 포함하면 단독 채택은 비권장. 그럼에도 사용자가 smalti 유지를 명시적으로 결정했으므로 이후 CLI 이중 레일(R3)과 팔레트 하이브리드(R4)로 톤 편차를 역수입 보정하는 경로로 진행한다.

---

## 5. Partide 대비 비교 (hacky 톤 축)

### nide vs Partide
- **우월**: 4자 vs 7자. `jq`·`fd` 라인에 훨씬 가깝다. 타이핑 비용 최소, 소문자 cryptic 톤 극한. neovim의 `n-` 계보 차용으로 "hacker vocabulary"에 자연 편입.
- **열위**: 화학 서사(`-ide` = 화합물) 같은 내재 스토리가 없다. "왜 n인가"는 README에서 설명해야.

### ravel vs Partide
- **우월**: 동사다. `$ ravel .` 이라고 치는 명령이 된다. Partide는 명사라 CLI 생활에 녹기 어렵다. contronym(엮다/풀다)이라는 언어 기믹이 해커 readme에서 강하게 먹힌다.
- **열위**: 네임스페이스에서 Ravel MVC framework가 npm을 점유 중 — 스코프 사용 불가피. Partide는 이 문제가 없다.

### weavide vs Partide
- **우월**: 같은 `-ide` 블렌드 규칙 안에서 "정적 입자 → 동적 엮기"로 철학을 이동. Particle Industries 리스크가 법률 검토에서 재부상할 경우 가장 매끄러운 교체.
- **열위**: 해커 톤 축에서는 사실상 Partide와 같은 레벨 — 극단 hacky(jq/warp)에는 도달하지 못한다. "fallback 규격품" 성격.

---

## 6. 슬로건 톤 예시 (감 잡기용, 카피라이터 본작업 아님)

1. **nide**: *"the next ide is no ide."*
2. **ravel**: *"ravel your dotfiles into an ide."*
3. **weavide**: *"weave your parts. skip the particles."*
4. **공통 후보**: *"a terminal you assemble, not install."*

---

## 7. 카피라이터 전달 사항

- 아키타입 Outlaw 70% + Magician 30% 유지.
- 슬로건은 4–7단어, 마침표로 닫는 스타일 선호 (`jq` README 톤).
- 마케팅 superlative("blazingly fast", "powerful") 금지.
- 동사형 네이밍(ravel) 채택 시 슬로건도 명령형으로 맞춤: *"ravel it."*
- `oh-my-{name}` 커뮤니티 서브레이어를 고려한 여지 남길 것.

## 8. 비주얼 디렉터 전달 사항

- **TOP 3 글자수**: nide(4), ravel(5), weavide(7). 로고 폭에서 각각 차이가 크다.
- **대문자 금지** — 워드마크 전부 소문자.
- **모노스페이스 계열 권장** (JetBrains Mono / Berkeley Mono / IBM Plex Mono).
- **nide**: 4자 대칭성 → 로고 아이콘 단순 기하 도형 가능 (예: 4분할 사각).
- **ravel**: 5자, `v` 의 V자가 시각 앵커. 브레이드/풀림 라인 모티프.
- **weavide**: 7자, `-ide` 접미사가 Partide와 동일 형태 → 타이포그래피 연속성 확보 가능.

## 9. 아이덴티티 검증자 전달 사항

- 네임스페이스 조회는 모두 **[확인 필요]** 상태. TOP 3 각각에 대해:
  - `npm view <name>` 실행
  - `github.com/<name>` HTTP 200/404 확인
  - `<name>.dev`, `.sh`, `.app` 후이즈 조회
  - USPTO TESS Class 9·42 조회
- 특히 **ravel**: Ravel(npm MVC) 과의 충돌 우회안 확정 필요.
- 특히 **loom**: Atlassian Loom과의 직접 충돌 때문에 단독 사용 불가, suffix 조합만 검토.
- Partide와 TOP 3 각각을 **동일한 체크리스트**로 재검증하여 최종 의사결정표 작성.

---

## 10. 사용자에게 드리는 의사결정 프레임

최종 선택은 다음 세 가지 축 중 어느 쪽에 무게를 둘지에 달렸습니다.

| 축 | 우세 후보 | 논리 |
|---|---|---|
| **극단 hacky 톤 (jq/warp/zed)** | `nide` | 4자, cryptic, neovim 계보 |
| **CLI 동사적 쾌감 (ripgrep/fd)** | `ravel` | 명령형, contronym 기믹 |
| **Partide 톤 유지 + 리스크 헷지** | `weavide` | `-ide` 패턴 계승, 스토리 이동 |

**추천 조합**: `nide`(정식) + `oh-my-nide`(커뮤니티 훅) + alias `nd` — 이 세 레이어가 모두 톤에 들어맞습니다.

---

> ⚠️ 본 보고서의 모든 네임스페이스 표시는 오프라인 추정치이며, 채택 전 WebSearch/whois/USPTO 실조회가 반드시 선행되어야 합니다.

---

## 11. 사후 채택 `smalti`의 톤 드리프트 분석 (R2)

> 리뷰어(05)가 "사용자 톤 요구로부터의 드리프트"로 지적한 사안에 대한 기록. **삭제·은폐가 아니라 대등 기록**으로 처리한다. smalti 유지는 사용자의 능동적 결정이며, 톤 편차는 R3·R4에서 역수입으로 보정된다.

### 11.1 초기 사용자 톤 요구 (00_input.md 재인용)
- "**oh-my-claudecode나, jq 같은 hacky한 톤**" (명시적 요청)
- 톤 레퍼런스: `jq`(2자 cryptic) · `ripgrep/rg` · `fzf/fd/sd/bat/eza`(2–3자 소문자) · `oh-my-zsh`(커뮤니티 훅 자학) · `starship/atuin/zoxide`(서정적 해커) · `tmux/nvim/htop`(축약 포스트픽스) · `warp/zed`(4자 punchy)
- 회피: 마케팅 superlative · corporate suffix · 긴 조어

### 11.2 전략(01)의 합리적 확장
- 아키타입 **Outlaw 70% + Magician 30%**. Outlaw로 "기성 IDE 거부"를, Magician으로 "자연어→플러그인 변환"을 배당한 것은 00_input과 정합.
- 단, Magician은 "변환"이지 "공예 배치"가 아니다. smalti 채택 과정에서 Magician이 **Creator 아키타입 쪽으로 당겨진** 해석이 들어갔다 (05 §3.A 지적과 일치).

### 11.3 네이밍(02) TOP 3의 해커 톤 정합성 재확인
- `nide`(4자, neovim 계보, ★★★★★ 해커톤 5/5) — 00_input `jq`·`warp`·`zed`·`neovim` 5개 레퍼런스 전부와 직접 접속.
- `ravel`(5자 동사, contronym, ★★★★★ 5/5) — `rg`·`fd`·`fzf` 동사형 CLI 관습과 직접 접속.
- `weavide`(7자 블렌드, ★★★★☆ 4/5) — Partide 패턴 계승 + 해커톤 축 상위 유지.
- 세 후보 모두 smalti(해커톤 1/5)보다 톤 정합 **5배 이상**. 이 사실은 변하지 않는다.

### 11.4 대화 중 사용자의 공예 레지스터 선회
- 본 세션 중반 사용자가 `quilt`·`tessera` 계열 질의를 통해 **공예·직물·모자이크 레지스터로 능동 선회**. 이는 00_input의 해커 톤 요구를 사용자가 스스로 **확장·보완**한 맥락.
- 즉 smalti 채택은 단순 드리프트가 아닌 **사용자 주도의 방향 전환**. 01 Magician이 Creator로 미끄러진 것도 이 선회와 맞물림.

### 11.5 리뷰어 지적과의 대등 기록
- 05 §7 "사용자 톤 정합성 4/10" 판정은 **00_input 원문 기준으로는 타당**.
- 동시에 **세션 내 사용자 명시 선회를 반영하면 판정 축이 이동**. 리뷰어 판정과 사용자 결정은 모순이 아니라 서로 다른 시점의 스냅샷.
- 본 보고서는 두 사실을 모두 기록: (a) smalti는 00_input 원톤에서 이탈, (b) 사용자는 세션 중 공예 레지스터로 선회하여 smalti를 수용.

### 11.6 결론 — smalti 유지 + 해커 톤 역수입
- **smalti 유지는 사용자 결정**. 본 네이밍 보고서의 평가 매트릭스상 TOP이 아니라는 사실은 §4에 정직히 기록됨(17점, 최하위권).
- **균형 복원 경로**: R3(CLI 이중 레일 — 공식 표층은 `install/publish/upgrade` 해커 관습어, 공예 동사는 별칭 플레이버) + R4(팔레트 하이브리드 C — warp/zed 다크 ink 베이스 위 비잔틴 액센트 최소화)에서 해커 톤을 **역수입**.
- 최종 브랜드 질감: "**해커 표층 + 공예 심층**" — 매일 타이핑하는 명령·팔레트·아이콘은 jq/warp/zed 라인, 릴리즈노트·에러 카피·스토리는 tessera/gild/refire 라인. 두 레일의 분리 운영이 smalti 채택의 채택 조건.

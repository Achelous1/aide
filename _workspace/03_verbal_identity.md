# 버벌 아이덴티티 — smalti

> ⚠️ **런칭 게이트 (조건부 초안)**
> - `smalti`는 이탈리아어 일반명사(*smalto*의 복수, "네일 에나멜/에나멜")로 **Class 3 화장품에서 식별력 결여** 리스크가 확인됨.
> - WYCON · Rybella · Diego Dalla Palma 등 이탈리아 화장품 브랜드가 카탈로그 분류어로 `smalti`를 상시 사용 중.
> - USPTO Reg 2405658 "LA COMPAGNIA DELL'ORO SMALTI…" 복합 상표 존재 (근거: `_workspace/06_namespace_audit.md`).
> - **변리사 Class 9(SW) / Class 42(SaaS) 식별력 검토 완료 전까지** 본 문서 전체를 "조건부 초안"으로 취급한다.
> - Class 3 대상자에게도 간섭이 없는 Class 9/42 독점 확보 가능 여부가 smalti 최종 채택의 승패를 결정한다.
> - 게이트 통과 전에는 대외 런칭·도메인 공개 구매·소셜 핸들 확보를 **보류**한다.

> 📌 **2026-04-24 로고 확정 반영**
> - 공식 앱 아이콘 확정: `docs/brand/smalti-icon-source-1024.png` — 4-컬러 glossy squircle.
> - 4색 매핑: **Sky Blue translucent**(좌상, `#A8DEEF→#6FC5DB`) = 탐험/시작 · **Obsidian Black**(우상, `#0D0D10`) = 규율/포커스 · **Antique Gold**(좌하, `#C9A24B→#E6C36B`) = 크래프트/성취 · **Crimson**(우하, `#F10C45`) = 도발/긴급.
> - "네 조각의 smalti가 하나의 타일로 융합" — Outlaw 70% + Magician 30% 아키타입과 정합 (Sky 한 조각만 반투명 = self-deprecating "완벽하지 않지만 합쳐서 하나").
> - 기존 슬로건 `an ai-native ide for cli agents.` **유지 판정** — 로고 톤(하이콘트라스트·모던) 변경으로 인한 문구 교체 불필요.
> - 마이크로카피 조정: Crimson 정합으로 에러 톤을 살짝 더 단호하게. (예시) ✅ `that tessera didn't fit. fix the edges.` ↔ 기존 `that tessera didn't fit. check the edges.` — `check`→`fix` 로 책임 지시 강화.

> 확정 제품명 **smalti**(전부 소문자, 한글 **스말티**)의 카피·톤·어휘 시스템.
> 근거: `_workspace/00_input.md`, `_workspace/01_brand_strategy.md`, `docs/ideation/rebrand-partide.md`.
> 아키타입: Outlaw 70% + Magician 30%. 레퍼런스: jq · oh-my-zsh · warp · zed · neovim · starship.

---

## 0. 어원 앵커 (전체 카피의 뿌리)

**smalti** (이탈리아어, 단수 *smalto*)
> 비잔틴 모자이크에 쓰이는 손으로 자른 유리 조각. 금박이나 산화금속을 녹여 만든 색유리를, 장인이 망치와 하디(hardie)로 쪼개 작은 tessera로 만든다. 각 조각은 그 자체로 빛을 내지만, 모여야 비로소 하나의 이미지가 된다.

이 한 단락이 카피 전체의 원전(原典)이다. 모든 슬로건·스토리·마이크로카피는 여기서 파생되어야 한다.

- **smalti 1장** = 플러그인 1개 = 터미널 도구 1개
- **모자이크 전체** = 조립된 IDE
- **장인(mosaicist)** = 사용자
- **유리가 빛을 내는 방식** = Rust 코어가 CLI를 데우는 방식

---

## 1. 슬로건 후보 7개

선정 규칙: ≤8 words, 소문자 우선, 마침표로 닫는 jq-README 스타일. 마케팅 superlative 금지.

### S1. `a mosaic of your own making.` ★ 1순위 후보
- **해석**: 모자이크 메타포를 정면으로 꺼낸다. "너의 조립"과 "너의 작품"을 이중으로 함의.
- **길이**: 6 words / 31자.
- **리듬**: 강-약-강-약-약-강-약 — 문미 `making`에서 무게가 떨어짐.
- **사용처**: 웹사이트 hero, README 첫 줄.

### S2. `ide, glass by glass.` ★ 1순위 후보
- **해석**: IDE를 소문자·콤마로 끌어내린 뒤, `glass by glass`가 어원을 환기. `piece by piece` 관용구의 smalti 번역.
- **길이**: 4 words / 20자.
- **리듬**: 약-약 / 약-약-약 — 콤마 뒤 두 번 반복되는 `glass`가 북소리처럼 박힘.
- **사용처**: CLI 스플래시, 트위터 bio, 스티커.

### S3. `cut your own tesserae.`
- **해석**: 명령형. tessera(모자이크 조각의 단수형)의 복수. 사용자가 직접 자르라는 선언.
- **길이**: 4 words / 22자.
- **톤**: Outlaw 극단. 공예 용어가 hacker readme 톤과 맞물림.
- **사용처**: 플러그인 생성 온보딩 헤드라인.

### S4. `no ide. just pieces.`
- **해석**: `wnide`의 "왜 IDE인가" 도발을 부드럽게 계승. 두 문장을 마침표로 끊어 하드하게.
- **길이**: 4 words / 20자.
- **톤**: 가장 공격적. `zed`·`warp`의 단문 광고 톤.
- **사용처**: 랜딩 서브카피, 런칭 포스트.

### S5. `assemble. ship. repeat.`
- **해석**: `unravel. ravel. repeat.` 리듬을 계승하되 smalti의 조립 동사로 교체. 개발 사이클 자체.
- **길이**: 3 words / 22자.
- **톤**: CLI 네이티브. 명령형 3연타.
- **사용처**: 푸터, 릴리즈 노트 프리픽스.

### S6. `every shard counts.`
- **해석**: `shard`(유리/데이터 조각) 이중 의미. 작은 플러그인도 브랜드 본체라는 메시지.
- **길이**: 3 words / 18자.
- **톤**: 공동체 친화. `oh-my-smalti` 서브레이어와 짝.
- **사용처**: 컨트리뷰터 문서, 플러그인 레지스트리.

### S7. `terminal, tessellated.`
- **해석**: `tessellated`(테셀레이션된, 빈틈없이 조각된)가 어원을 다시 호출. 2어 슬로건의 극한.
- **길이**: 2 words / 21자.
- **톤**: jq 축 — 설명 포기. 아는 사람만 읽는다.
- **사용처**: 티셔츠, GitHub org tagline.

---

## 2. 태그라인

### 공식 1순위
> **`a mosaic of your own making.`**

선정 이유: (1) 어원을 직역하지 않으면서도 곧바로 환기한다. (2) `your own`이 커스터마이즈의 정체성을 정확히 박는다. (3) 영어 원어민이 읽었을 때 스캔 리듬이 가장 자연스럽다. (4) 6 words로 로고 옆에 붙여도 과하지 않다.

### 대안 2개 (맥락별 교체 가능)
- **선언형 (공격적 맥락)**: `no ide. just pieces.` — 런칭·해커뉴스·도발적 포스트용.
- **CLI형 (터미널 네이티브 맥락)**: `ide, glass by glass.` — 설치 스크립트 완료 메시지, `smalti --help` 하단.

### 사용 맥락 매핑
| 위치 | 태그라인 |
|------|---------|
| 로고 하단 / favicon 메타 | `a mosaic of your own making.` |
| GitHub org 설명 | `a mosaic of your own making.` |
| `smalti --version` 하단 | `ide, glass by glass.` |
| 이메일 서명 | `smalti — a mosaic of your own making.` |
| 런칭 포스트 H1 | `no ide. just pieces.` |

---

## 2.5 워드마크 사용 규칙 (smalti 두 `i` 도트 이중색)

`smalti` 워드마크의 두 `i` 도트를 **Sky Blue · Crimson** 이중색으로 처리하는 시각 장치는 **가독성 임계값 ≥ 20px** 에서만 사용한다. (2026-04-24 로고 확정으로 기존 Cobalt/Gold → Sky Blue/Crimson 매핑 업데이트.)

### 사이즈별 규칙
| 크기 | 처리 |
|------|------|
| **≥ 20px** | 두 `i` 도트 이중색 (Sky Blue 좌 · Crimson 우) — 풀 아이덴티티 |
| **16–19px** | 단일 색상으로 통일 (Crimson 또는 Sky Blue 중 배경에 따라 택1) |
| **≤ 16px** (파비콘 · 앱 아이콘 스몰 · README 배지 · 터미널 prompt icon) | **이중색 금지**. 단일 Crimson 또는 Sky Blue로 통일. 도트 생략 허용 (`smaltı`→`smalti` 단색 flat). |

### 이유
- 16px 이하에서 이중 도트는 렌더링 시 채도 차가 뭉개지며 **`smalt!` 또는 `¡smalti`처럼 느낌표·역느낌표로 오독**되는 리스크가 있다.
- 모바일 파비콘·GitHub 검색 결과 썸네일·favicon 32px 등 실사용 밀도가 높은 지점에서 특히 민감하다.

### 구현 체크
- [ ] 파비콘 16/32/48 세트는 **단색 버전**으로 내보낸다 (이중색 SVG를 favicon.ico로 그대로 다운스케일 금지).
- [ ] README 배지 (shields.io)는 **Gold 단일**을 기본값으로 한다.
- [ ] 터미널 prompt에 embed될 경우 (`$ smalti …` 로고 prefix) 단일 색 + 도트 생략 가능.

---

## 3. 브랜드 스토리

### 3.1 Short — 1줄 (엘리베이터 피치의 극한)

> **smalti는 당신이 직접 자르고 붙이는 터미널 IDE다. 비잔틴 장인이 유리 조각을 쪼개 모자이크를 만들 듯, 당신의 플러그인 하나하나가 IDE의 한 조각이 된다.**

### 3.2 Medium — 3–5줄 (README 상단 / About 페이지)

> 1,500년 전 라벤나의 장인들은 유리를 녹이고, 금박을 끼우고, 하디 위에서 한 조각씩 쪼갰다. 그들이 만든 것은 그림이 아니라 **조립 시스템**이었다 — smalti라 불리는 유리 조각들.
>
> smalti(스말티)는 그 이름을 빌린 터미널 IDE다. 기성 IDE 한 덩어리를 설치하는 대신, 당신이 필요한 조각 — CLI 에이전트, 자연어 플러그인, 모자이크처럼 맞물리는 레이아웃 — 을 직접 고르고 자르고 붙인다.
>
> Rust 코어가 타일의 뒷면을 데우고, 당신의 손이 앞면을 구성한다. 조립이 곧 사용이고, 사용이 곧 제작이다.

### 3.3 Long — 단락 (공식 About, 투자자/컨트리뷰터 덱)

> #### why smalti
>
> IDE 시장에는 이미 완성된 모자이크가 많다. VS Code, JetBrains, Android Studio. 그림은 훌륭하지만, 조각을 바꿀 수는 없다. 당신이 원하는 건 누군가의 풍경이 아니라, 당신이 매일 쓰는 도구 — 그리고 그걸 언제든 다시 자를 수 있는 권한이다.
>
> #### where the name comes from
>
> *smalti*는 이탈리아어로 비잔틴 모자이크의 유리 조각을 뜻한다. 장인은 색유리를 녹여 얇은 판을 만들고, 하디라는 쐐기 위에서 망치로 쪼갠다. 쪼개진 조각 하나하나를 *tessera*라 부른다. 각 tessera는 살짝 기울어진 각도로 박혀, 빛이 들어올 때마다 다르게 반짝인다 — 완벽하게 평평한 그림보다 훨씬 살아있는 이미지를 만든다.
>
> 이 방식은 개발자 도구의 미래와 닮아 있다. 하나의 거대한 IDE가 모든 것을 해결하는 시대는 끝났다. AI 에이전트, CLI 도구, 파일시스템 훅, 자연어 플러그인 — 각각이 작은 유리 조각이다. 당신이 그들을 배열하는 방식이 곧 당신의 작업 환경이다.
>
> #### how it works
>
> smalti는 얇은 Electron 셸과 Rust 네이티브 코어, 그리고 CLI 에이전트 오케스트레이터로 이루어진다. 플러그인은 자연어로 기술하면 자동 생성되어 당신의 모자이크에 끼워진다. 마음에 들지 않으면 뜯어낸다. 조각을 공유하고 싶으면 레지스트리에 올린다. 그게 전부다.
>
> 우리는 "blazingly fast" 같은 말을 하지 않는다. 장인의 작업실에는 그런 형용사가 없다. 대신 우리가 약속하는 것: **당신이 조각을 자를 수 있다는 것, 그리고 그 조각이 빛을 낸다는 것.**
>
> #### who this is for
>
> neovim과 tmux에서 내려오지 못한 사람들. `cargo install`과 `brew install`로 책상을 쌓는 사람들. 자연어로 도구를 만드는 것이 마법이 아니라 노동이라는 걸 아는 사람들. GUI IDE가 "친절하다"고 느낀 적 없는 사람들.
>
> 당신이 그 중 하나라면, 망치를 드시라.

---

## 4. 톤앤보이스 가이드

### 4.1 브랜드 성격 5축 (Outlaw 70% + Magician 30% 구현)

| 축 | 지향 | 반지향 |
|----|------|--------|
| **공예적 (craft)** | 장인 용어, 손의 감각, 재료의 질감 | 기계/자동화 승리 서사 |
| **터미널 네이티브 (terminal-native)** | 소문자, 마침표, 짧은 문장, 명령형 | 대문자 강조, 느낌표 남발 |
| **설명 없음 (cryptic restraint)** | 모르는 사람에겐 굳이 풀지 않는다 | 온보딩형 친절 카피 |
| **모순 허용 (paradox-friendly)** | "조립하면서 해체한다" 같은 양가성 | 일차원 장점 나열 |
| **마법의 흔적 (latent magic)** | 가끔 이탈리아어·라틴어가 튀어나옴 | 판타지/점성술 과잉 |

### 4.2 Do ✅ (8개)

1. **소문자를 기본으로**: 문장 첫 글자도 필요 없으면 소문자. `smalti is an ide. you assemble it.`
2. **마침표로 닫는다**: 느낌표는 릴리즈 축하 한 줄에만 허용. 나머지는 마침표.
3. **공예 어휘를 자연스럽게**: `cut`, `shard`, `tessera`, `inlay`, `grout`, `polish` — 억지로가 아니라 자주.
4. **짧은 문장을 여러 개 쓴다**: `smalti cuts plugins. you place them. the mosaic is yours.`
5. **자학 OK**: `we didn't invent anything. we just gave the pieces a name.`
6. **이탈리아어 단어 한 개씩 섞는다**: `tessera`, `smalto`, `musivo` — 각주 없이.
7. **사용자를 `you` / `당신`으로 호칭**: "the user"가 아니다.
8. **기능은 동사로, 제품은 명사로**: `smalti cuts` (X — 제품은 주어지만 과장), `you cut with smalti` (O).

### 4.3 Don't ❌ (8개)

1. **마케팅 superlative 금지**: blazingly fast, revolutionary, game-changing, powerful, ultimate, world-class.
2. **온보딩형 친절 카피 금지**: "anyone can do it", "no code required", "just click and go".
3. **enterprise 어휘 금지**: solution, platform(동사적 과용), synergy, streamline, empower.
4. **대문자 브랜드명 금지**: `Smalti`, `SMALTI`, `SmAlTi` — 전부 탈락. 문장 첫머리여도 `smalti`.
5. **이모지 금지 (공식 카피)**: README·웹사이트·에러 메시지. 커뮤니티 디스코드·트위터는 별개.
6. **AI 승리 서사 금지**: "AI writes your code for you", "your AI pair programmer". smalti는 장인의 도구다.
7. **허세 라틴어 금지**: 이탈리아어 장인 용어는 허용, `lorem ipsum` 스타일 라틴 장식은 금지. 한 단락에 이탈리아어 한 단어 이상 쓰지 않는다.
8. **경쟁사 직접 조롱 금지**: VS Code·JetBrains 이름을 슬로건에 박지 않는다. 도발은 카테고리(`ide`)에 한다.

### 4.4 예시 문장 쌍 (좋은 / 나쁜)

| 맥락 | ✅ 좋은 표현 | ❌ 나쁜 표현 |
|------|-------------|-------------|
| 랜딩 hero | `a mosaic of your own making.` | `The world's most powerful AI-powered IDE!` |
| 설치 성공 | `smalti is ready. cut your first piece.` | `🎉 Success! Welcome to Smalti!` |
| 플러그인 설명 | `a shard that reads git history.` | `Revolutionary AI git assistant for developers.` |
| 에러 | `that tessera didn't fit. check the edges.` | `An unexpected error occurred. Please try again.` |
| 릴리즈 노트 | `v0.3.0 — new shards, cleaner grout.` | `v0.3.0: Major Release with Exciting New Features!` |

### 4.5 톤 스펙트럼 (맥락별 가변)

| 맥락 | 톤 | 예시 |
|------|-----|------|
| 공식 문서 (spec, api) | 절제 · 기술적 | `smalti spawns one pty per tab via node-pty.` |
| 마케팅 (랜딩) | 공예적 · 서정 | `cut. place. grout. repeat.` |
| CLI 출력 | 미니멀 · 명령형 | `cut 3 shards. placed 2. 1 didn't fit.` |
| 에러 메시지 | 담담 · 원인 지시 | `the shard cracked. here's why:` |
| 릴리즈 노트 | 장인의 수공 기록 톤 | `polished the grout around terminal tabs.` |
| 커뮤니티 (discord, issues) | 자학 · 친근 | `yeah that one's a jagged edge. file a shard report.` |

---

## 5. 핵심 어휘 팩 (Lexicon)

제품 전반에 일관되게 재사용할 용어. 기본 원칙: **모자이크·공예 레지스터**. 기술 용어가 필요할 때만 기술 용어를 쓴다.

### 5.1 제품 개념 매핑

| 일반 용어 | smalti 용어 | 비고 |
|----------|-------------|------|
| plugin | **shard** (복수 shards) | 공식 1순위. "a shard that tails logs." |
| plugin (격식) | **tessera** (복수 tesserae) | 공식 문서·스토리. 모자이크 역사 용어. |
| plugin assembly process | **inlay** (동사·명사) | "inlay a shard into your workspace." |
| installed plugin set | **mosaic** | "your mosaic has 12 shards." |
| config glue / boilerplate | **grout** | 조각 사이를 메우는 회반죽. 설정·glue 코드. |
| theme / color palette | **palette** (그대로) / **glaze** (공예 톤 강조 시) | glaze = 유약. 시각 테마를 의미. |
| version (major) | **firing** | 가마에 굽는 횟수. v0 → v1 넘어갈 때. |
| version (minor/patch) | **polish** | 광택 내기. 일상 릴리즈. |
| release notes | **workshop notes** | 작업실 기록. |
| CLI agent | **artisan** (시적) / **agent** (기술) | 맥락별 선택. |
| plugin registry | **quarry** | 채석장. 원재료를 캐는 곳. |
| user's custom setup | **mosaic** / **atelier** | atelier(공방)는 개인 구성 강조. |
| share / publish | **gild** | 금박 입히기. 플러그인을 공개하는 행위. |
| fork / customize | **recut** | 다시 자른다. |
| uninstall | **chisel out** | 끌로 떼어낸다. |
| crash / break | **crack** | 유리의 균열. |
| bug report | **shard report** | |
| onboarding | **first cut** | 첫 조각. |

### 5.2 금지된 일반 용어 → 대체

| 쓰지 말 것 | 쓸 것 |
|-----------|------|
| "extension" | **shard** |
| "ecosystem" | **quarry** (레지스트리 맥락) / **workshop** (도구 맥락) |
| "install plugin" | **inlay a shard** |
| "activate plugin" | **place a shard** |
| "plugin marketplace" | **quarry** |
| "update" (동사) | **polish** (minor) / **refire** (major) |
| "user community" | **guild** |
| "theming" | **glazing** |

### 5.3 중립 유지 (공예어로 번역하지 않음)

다음은 억지 번역 시 오히려 허세가 된다. 기술 용어 그대로 유지:
`terminal`, `pty`, `shell`, `rust`, `electron`, `cli`, `agent`, `file`, `directory`, `session`, `token`, `tab`.

---

## 6. CLI 커맨드 — 이중 레일 (표층 해커 동사 + 공예 별칭)

smalti CLI는 **이중 레일 구조**를 채택한다. `jq`·`npm`·`cargo` 사용자가 첫 1초에 이해할 수 있도록 **표층(primary)은 표준 해커 동사**를 노출하고, 공예어(alias)는 브랜드 맥락에서 선택적으로 쓰인다. 튜토리얼·에러 메시지·`--help`는 표층 동사 우선, 공예어는 괄호 병기.

### 6.1 표층 / 별칭 매핑

| 표층 (Primary) | 별칭 (Alias · 공예어) | 목적 |
|----------------|----------------------|------|
| `smalti init` | `grout` | 새 mosaic 초기화 |
| `smalti install <shard>` | `inlay` | 기존 shard 설치 |
| `smalti remove <shard>` | `chisel` | shard 제거 |
| `smalti update` | `refire` | 업그레이드 / migration |
| `smalti publish <shard>` | `gild` | quarry(레지스트리) 게시 |
| `smalti search <query>` | `quarry` | 사용 가능한 shard 검색 |
| `smalti list` | `mosaic` / `mo` | 현재 조립 상태 출력 |
| `smalti run <description>` | `cut` | 자연어로 shard 생성·실행 (Create n Play 입구) |

별칭은 **진짜 alias** 로 동작한다 (`smalti inlay foo` ≡ `smalti install foo`). 내부 구현은 하나, 노출 이름이 둘.

### 6.2 `--help` 시각화 (이중 레일 노출 방식)

```
$ smalti --help
smalti — a mosaic of your own making.

usage:
  smalti <command> [args]

commands:
  init      (alias: grout)    initialize a new mosaic
  install   (alias: inlay)    install a shard into the current mosaic
  remove    (alias: chisel)   remove a shard
  update    (alias: refire)   upgrade shards and core
  publish   (alias: gild)     publish a shard to the quarry
  search    (alias: quarry)   search available shards
  list      (alias: mosaic)   list placed shards
  run       (alias: cut)      generate & run a shard from natural language

run `smalti <command> --help` for details.
```

### 6.3 표층 사용 원칙 (실사용 / 문서 / 에러)

- **튜토리얼·README·온보딩**: 표층 동사만 사용. `smalti install claude-agent` (공예어 병기 선택적).
- **에러 메시지**: 표층 동사만. `couldn't install that shard. run 'smalti update' first.`
- **CI 로그·스크립트 예시**: 표층 동사만. `npm install` 문법을 그대로 옮긴 인지 모델 유지.
- **권장 호칭 순서**: 첫 등장 시 `smalti install (alias: inlay) <shard>` 로 병기, 이후 본문에서는 `install` 만 반복.

### 6.4 공예어 사용 원칙 (브랜드·flavor 레이어)

- **브랜드 스토리 · 마케팅 카피 · 릴리즈 노트 내러티브**: 공예어 자유 사용. `this release refires the core and gilds three new shards.`
- **CLI 출력의 flavor text**: 공예어 허용. 성공 메시지·스피너 문구에서 `cutting…`, `gilded.`, `polished.` 등 그대로 유지.
- **파워유저 alias**: 공예어 자체가 숏컷 역할. `smalti in foo`(install), `smalti q react`(search), `smalti mo`(list).

### 6.5 동사 선정 원칙 (유지)

- **`man <verb>` 확인**: `cut`은 GNU coreutils에 있음 → smalti 바깥 alias(`alias cut=…`) 금지, 반드시 `smalti run`/`smalti cut` 서브커맨드로만 노출.
- **동사만 사용**: 명사 서브커맨드(`smalti plugin add`) 회피. 표층은 npm 스타일 동사(`install`/`remove`/`update`/`publish`/`search`/`list`/`run`/`init`)로 통일.
- **충돌 없음**: `install`·`remove`·`update` 등 표층 동사는 `smalti` 네임스페이스 안에서만 의미를 가진다.

### 6.6 출력 톤 예시 (이중 레일 반영)

표층 동사 + 공예 flavor text 혼합 — 브랜드 톤은 **출력 본문**에서 살리고, 명령어 자체는 관용적:

```
$ smalti run "tail build logs and highlight errors"
cutting… shard shaped in 4.2s.
    name: tail-errors
    type: terminal-hook
    edges: clean.
install now? [Y/n]
```

```
$ smalti list
mosaic: ~/dotfiles/smalti/atelier
12 shards placed · 2 cracked · 1 pending update.
    ▢ claude-agent       placed
    ▢ tail-errors        placed
    ▣ git-inlay          cracked — see `smalti update --why`
```

```
$ smalti install react-devtools
inlaying react-devtools… polished. 1 shard placed.
```

```
$ smalti publish tail-errors
gilded. your shard is in the quarry. anyone can install it now.
```

명령어는 `jq`·`npm`처럼 읽히고, 출력은 여전히 smalti답게 빛난다.

---

## 7. 마이크로카피 샘플

### 7.1 에러 (3개)

1. **shard 컴파일 실패**
   > `the shard cracked. rust couldn't finish cutting. run smalti grout --log to see the fracture.`

2. **CLI agent 연결 실패**
   > `no artisan responded. is claude installed? try: which claude`

3. **파일시스템 권한**
   > `this shard wants to touch ~/.ssh. deny unless you know why.`

### 7.2 로딩 / 진행 (3개)

1. **첫 실행**
   > `heating the kiln…` (Rust 코어 부트)

2. **플러그인 생성 중**
   > `cutting. this usually takes 2–20s depending on the shape.`

3. **대용량 인덱싱**
   > `tessellating your project. 2,341 files grouted so far.`

### 7.3 빈 상태 (3개)

1. **mosaic 비어있음**
   > `no shards yet. start with: smalti cut "what you want"`

2. **quarry 검색 결과 0건**
   > `no shards match. the quarry is wide — try a shorter query.`

3. **artisan 미설치**
   > `no cli agents found. smalti needs at least one: claude, gemini, or codex.`

### 7.4 성공 (3개, 추가)

1. **설치 완료**
   > `smalti is ready. cut your first piece: smalti cut --help`

2. **shard 게시 완료**
   > `gilded. your shard is in the quarry. anyone can inlay it now.`

3. **업데이트 완료**
   > `polished. 3 shards refit.`

---

## 8. 금지어 리스트 (브랜드 톤 위반)

아래 단어·표현은 공식 카피·UI·README·마케팅 어디에도 쓰지 않는다.

### 8.1 마케팅 superlative
- blazingly fast, lightning-fast, ultra-fast, hyper-fast
- revolutionary, groundbreaking, game-changing, next-gen
- powerful, robust, best-in-class, world-class, industry-leading
- cutting-edge, state-of-the-art, bleeding-edge
- seamless, effortless, magical (단 `magic`은 Magician 축에서 문맥적으로 허용, `magical`은 금지)
- ultimate, definitive, premier, flagship

### 8.2 enterprise / SaaS 말투
- solution, platform (동사·포괄명사 용법), ecosystem (quarry로 대체)
- synergy, leverage(동사), streamline, empower, unlock
- transform, elevate, accelerate
- users (복수 일반화, 가능하면 `you`)
- customer, client (개발자는 customer가 아니다)

### 8.3 AI 과잉 서사
- AI-powered, AI-driven (카테고리 설명 외 금지)
- your AI pair programmer, your AI copilot
- let AI do the work, AI writes your code
- intelligent, smart (단순 형용사로 금지)

### 8.4 친절 온보딩
- anyone can, no experience needed, no code required
- just click, simply, easily
- welcome to the future
- get started in seconds / minutes (구체 수치도 피함)

### 8.5 허세 표현
- artisanal (아이러니하게도 금지 — 실제 공예어를 쓰기 때문에 형용사형은 중복 허세)
- craftsmanship (명사형 금지. 행위 동사 `cut`, `grout` 등으로 표현)
- bespoke, curated (스타트업 hipster vocabulary)
- reimagined, reinvented

### 8.6 대문자·기호 위반
- `Smalti`, `SMALTI` (브랜드명은 언제나 소문자)
- 느낌표 2개 이상, 느낌표+물음표 `?!`
- 이모지 (공식 카피 한정)
- `™`, `®` 기호 (법률 맥락 외 금지)

---

## 9. 비주얼 디렉터 전달 사항

- **타이포 원칙**: 소문자 강제. 워드마크 `smalti`는 모노스페이스 또는 커스텀 sans. JetBrains Mono / Berkeley Mono / IBM Plex Mono 계열이 톤과 맞음.
- **어원 시각 자산**: 비잔틴 모자이크 tessera의 불규칙 격자 — 완벽한 픽셀 그리드가 아니라 **살짝 기울어진 조각들**. 이것이 smalti 시각 언어의 핵심.
- **색 힌트**: 비잔틴 모자이크의 3대 색 — 깊은 군청(lapis), 금박(gold leaf), 짙은 청록(verdigris). 다만 rebrand-partide의 emerald 계승 여부는 visual-director 판단.
- **조각의 기울기**: 평평한 그리드를 피하고, 각 UI 요소가 미세하게 다른 각도로 빛을 반사하는 느낌(그림자/하이라이트 미세 차).
- **톤 일관성**: 카피가 소문자·절제·공예어인 만큼, 비주얼도 **과도한 그라디언트·네온·glassmorphism 금지**. 재료의 질감(유리·금·돌) 우선.
- **금지**: AI/뇌/회로/마법사 시각 클리셰. smalti는 **손의 도구**다.

---

## 10. 아이덴티티 검증자 전달 사항

버벌 아이덴티티 검증 항목:

- [ ] **어원 일관성**: 모든 카피가 smalti(비잔틴 유리 모자이크)에서 파생되는가, 아니면 튀는 메타포(로켓·뇌·마법) 혼입이 있는가.
- [ ] **소문자 규칙**: README·package.json·UI 전체에서 브랜드명이 `smalti` 소문자로 통일되는가.
- [ ] **Outlaw 70% 점검**: 설명형·친절형 카피가 Outlaw 기조를 흐리지 않는가.
- [ ] **Magician 30% 점검**: 조립/변환의 "작은 마법"이 어디선가 한두 번 드러나는가 (없으면 톤이 너무 건조).
- [ ] **금지어 스캔**: §8의 금지어가 마케팅 페이지·README·에러 메시지에서 0건인가.
- [ ] **어휘 팩 적용**: `plugin` → `shard` 치환이 일관되게 이루어졌는가 (기술 API 주석은 예외 허용).
- [ ] **슬로건-네이밍 리듬**: `smalti — a mosaic of your own making.`을 소리 내어 읽었을 때 호흡이 끊기지 않는가.
- [ ] **한국어 음차**: `스말티`가 공식 문서·한국어 README에서 단일 표기로 고정되는가 (스몰티/스말띠 등 분열 금지).
- [ ] **CLI 커맨드 비충돌**: §6의 서브커맨드들이 기존 유닉스 커맨드와 충돌 없이 `smalti <verb>` 네임스페이스 안에서만 작동하는가.
- [ ] **공예어 밀도**: 한 단락에 공예 용어가 3개 이상 몰리면 장식 과잉. 1–2개로 유지되는가.

---

> ⚠️ 본 문서는 smalti의 **언어적 골조**다. 실제 UI 스트링·마케팅 페이지·공식 문서는 이 골조를 따르되, 각 맥락별 톤 스펙트럼(§4.5)을 참조하여 조정한다.

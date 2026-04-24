---
title: "AIDE → smalti 리브랜딩 아이데이션"
category: ideation
tags: [branding, naming, rebrand, smalti, trademark, namespace, logo]
created: 2026-04-24
updated: 2026-04-24
related: [[rebrand-partide]], [[rebrand-wnide]], [[index]]
---

# AIDE → smalti 리브랜딩 아이데이션

> 🔖 **Current rebrand candidate.** Supersedes [[rebrand-partide]] and [[rebrand-wnide]]. Status: conditional GO pending trademark Class 3 clearance (task_reb_a01).

> 이 문서는 리브랜딩 아이데이션 기록이며, 실행 전 단계입니다.
> `rebrand-partide.md`·`rebrand-wnide.md` 와 동일한 포맷으로 작성되어, 세 후보를 1:1:1 비교할 수 있게 맞췄습니다.

## 1. 요약 (Executive Summary)

- 현재 브랜드 **"AIDE"** 가 Android IDE 와 네이밍 충돌 → 리브랜딩 필요 (동일 배경).
- 대체 후보: **smalti** — 비잔틴 모자이크 공예에서 쓰는 **유리 조각(tessera) 의 복수형** 을 그대로 차용한 이탈리아어 차용어.
- 서브 카피 후보 (초안 레벨; copywriter 본작업 예정):
  - "assemble your mosaic."
  - "smalti — a terminal you compose, tile by tile."
- **권고 결론: 제1순위 후보로 병렬 검토** — Partide 대비 해커 톤 축에서 우월하고, 모자이크 메타포가 "Create n Play" 철학과 3계층으로 정렬됨. 단, 이탈리아 화장품(네일 에나멜) 카테고리의 `smalto/smalti` 용어 사용 이력 때문에 상표 실조회 결과가 승패를 가름.
- **로고 확정 (2026-04-24)**: 공식 앱 아이콘 `docs/brand/smalti-icon-source-1024.png` — 4-컬러 glossy squircle (Sky Blue translucent · Obsidian Black · Antique Gold · Crimson). 비잔틴 smalti 4종 색유리 조각이 단일 squircle로 융합된 상태를 시각화.

## 2. 리브랜딩 배경

- Android IDE 와 네이밍 겹침 → SEO·사용자 혼동 (Partide·wnide 문서 §2 와 동일).
- "Create n Play" 철학 반영 필요: 사용자가 부품(플러그인) 을 조립해 자기만의 IDE 를 구성.
- 기존 두 후보는 **입자/화학** (Partide) 과 **도발적 수사** (wnide) 축에 앉아 있었음.
- smalti 는 **공예(craft) 메타포** 라는 제3의 축을 연다 — "장인이 유리 조각을 배열해 모자이크를 이룬다" 는 이미지는 터미널 네이티브의 dotfiles 문화(자기 손으로 조립한 환경) 와 직결.

## 3. 후보 탐색 여정 (Decision Log)

Partide·wnide 문서 §3 탐색 결과에 이번 세션에서 검토된 공예·조각 계열을 추가.

| 후보 | 컨셉 | 결론 | 이유 |
|------|------|------|------|
| (Partide 문서 §3 전 항목) | — | — | `rebrand-partide.md` 참조 |
| (wnide) | "Why Need IDE?" 이니셜리즘 | 조건부 보류 | `rebrand-wnide.md` §6 참조 |
| quilt | 퀼트, 조각보 | 스킵 | Meta Quilt (GraphQL 툴), Quilt Data 등 dev-tool 카테고리에서 선점 |
| tessera | 모자이크 개별 조각 (단수) | 스킵 | Tessera Therapeutics(나스닥 상장 바이오) 활성, 검색 오염 심각 |
| tessel | 모자이크 조각 (영어 변형) | 스킵 | **Tessel Board** (JS 임베디드 보드) 선례 — 개발자 도구 카테고리 직격 |
| scion | 접목 가지, 후예 | 스킵 | Toyota Scion 잔존 + Scion Framework (Delphi) — 톤은 맞으나 크로스 카테고리 노이즈 |
| cairn | 돌탑, 길잡이 돌무더기 | 보관 | 조립 은유 훌륭, 그러나 Cairn (CI tool, HP 등) 중복 |
| weft | 가로실 (직조) | 보관 | 너무 niche, 발음 /wɛft/ 이 한국어 음차 분열 (웨프트/웨프) |
| opus | 작품, 대작 | 스킵 | Opus audio codec, Anthropic Opus 모델 — 이름 충돌 치명적 |
| codex | 고서, 필사본 | 스킵 | OpenAI Codex CLI 본체와 충돌 (우리 앱이 호출하는 에이전트 이름) |
| **smalti** | 비잔틴 모자이크용 유리 조각 (복수) | **채택 (병렬 검토)** | 네임스페이스 청정 예측 + 3계층 메타포(tessera/smalti/mosaico) 적합 + 공예 어휘 특유의 해커 톤 |

**smalti 채택 이유 요약**:
1. **네임스페이스 청정 예측** — 공예 전문 용어라 개발자 도구 카테고리에 전례 없음.
2. **메타포 적합도** — 단일 조각(tessera) → 여러 조각(smalti) → 완성품(mosaico) 3계층이 Create n Play 흐름에 정확히 대응.
3. **해커 톤 부합** — `jq`/`nvim` 처럼 **쓰는 사람만 아는 cryptic함** (비잔틴 공예 용어를 어떻게 아나?) 유지.

## 4. smalti 브랜드 상세

### 4.1 네이밍 구조

- Product name: **smalti** (all-lowercase — `ripgrep`·`nvim` 관례, Outlaw 아키타입).
- 한글 공식 표기: **스말티** (국립국어원 외래어 표기법 기반 권장; §6 참조).
- Domain handle 후보: **smalti.dev** (primary), `smalti.sh`, `smalti.app`, `smalti.tools`.
- CLI alias 후보: `sm` (2자) — 단 `systemd` 계열·`sendmail` 과의 충돌 여부 `man sm` 로 확인 필요.
- 복수형 그 자체가 이름이므로 영어 문법 내에서 "smalti are..." 복수 취급이 자연스러움 (단수로 "a smalto" 라고 부를 수도 있으나 제품명 레벨에서는 복수 고정 권장).

### 4.2 의미 층위

1. **표면**: 이탈리아어 "smalti" = "유리 에나멜 조각들". 비잔틴 시대부터 모자이크 성상화(聖像畵) 에 쓰이는 색유리 큐브.
2. **공예 3계층**:
   - `tessera` (단수, 개별 타일) → 플러그인 하나
   - `smalti` (복수, 재료 더미) → 사용자가 보유한 플러그인 셋
   - `mosaico` (완성된 모자이크) → 조립된 IDE 환경
3. **철학적**: IDE 는 **만들어진 완제품이 아니라 재료** 다. 이름 자체가 "아직 배열되지 않은 부품들" 을 가리킨다 — "Create n Play" 의 언어학적 재번역.
4. **아이콘적 해석 (2026-04-24 추가)**: 공식 앱 아이콘의 4색 타일 (Sky/Black/Gold/Crimson)은 가상의 smalti 4종 색유리 조각이 **하나의 squircle로 융합된 상태** — 복수(smalti)의 조각이 단수(하나의 앱)로 수렴하는 제품 철학을 시각화한다.
5. **해커 톤**: 영어 원어민에게 즉각적 의미 불투명 → `jq` 의 "JSON Query를 몰라도 되는" 태도와 동일. 쓰는 사람이 README 를 읽어 의미를 확보한다.

### 4.3 서사 (narrative arc)

- 비잔틴의 장인은 금박을 붙인 유리 조각(smalti) 한 알 한 알을 직접 배치해 벽 하나를 성상으로 만들었다.
- 현대의 터미널 네이티브는 dotfiles·플러그인·CLI 에이전트 한 조각씩을 배치해 자기만의 개발 환경을 만든다.
- smalti 는 이 평행 구조를 이름 한 단어로 압축한다: **"당신은 IDE 를 설치하는 사람이 아니라 배열하는 사람"**.
- Partide 의 "입자 → 원자" (물리·화학) 메타포와 달리, smalti 는 **손(手) 의 메타포** — 조립이 기계적 결합이 아니라 장인적 배치임을 강조.
- **4색 타일 각각의 상징** (2026-04-24 로고 확정 반영): **Sky** = 탐험/시작 · **Black** = 규율/포커스 · **Gold** = 크래프트/성취 · **Crimson** = 도발/긴급. 네 원소가 하나의 IDE로 융합된다.

### 4.4 태그라인 후보

- A: "assemble your mosaic."
- B: "a terminal you compose, tile by tile."
- C: "smalti — your ide is not installed. it is arranged."
- D: "every plugin a tile."
- **권장 (초안 단계)**: **A** 또는 **C** — copywriter 가 `_workspace/03_verbal_identity.md` 에서 톤 조정 예정이므로 여기서는 방향성만 제시.

## 5. 네임스페이스 Audit 결과

> ✅ **실조회 완료 (2026-04-24)** — 상세: `_workspace/06_namespace_audit.md`. 판정: **🔴 RED — 단독 채택 비권장** (법률 자문 선행 조건부 GO).

### 5.1 주요 블로커 (4종)

> 🔴 **블로커 #1 — GitHub `smalti` 핸들 선점**
> `github.com/smalti` = Tymofii Smirnov 개인 계정 (7 repo, `gmock-win32` 등). org `smalti` 생성 불가.

> 🔴 **블로커 #2 — 주요 개발자 gTLD 전량 점유**
> `smalti.com/.net/.org/.io/.dev/.app/.ai/.sh/.run/.tools/.build/.codes` 전부 ACTIVE (미등록 0건).
> `smalti.com`은 WitsEnd Mosaic (미국 위스콘신 모자이크 유리 판매점)이 1999년부터 활발 운영 중.

> 🔴 **블로커 #3 — EU/IT Class 3 이탈리아 화장품 일반명사**
> `smalti` = "네일 에나멜"의 이탈리아어 일상 상거래 용어. WYCON, Rybella, Diego Dalla Palma, LCN, OPI Italy 등 다수 이탈리아 화장품사가 카탈로그 분류어로 편재 사용. EUIPO 출원 시 **식별력 결여 (descriptive mark) 판정 가능성 🔴 HIGH**.

> 🔴 **블로커 #4 — USPTO Reg 2405658 복합 상표 존재**
> "LA COMPAGNIA DELL'ORO SMALTI E RIFLESSI DI MURANO" (Serial 75739767) — `SMALTI` 포함 복합 마크. 단독 `SMALTI` 등록은 불명 (변리사 공식 조회 필요).

### 5.2 차선 전략 (채택 강행 시)

- **GitHub org**: `smaltihq` (권장), `smalti-dev`, `smalti-ai`, `getsmalti` 가용성 동시 확인.
- **도메인**: `getsmalti.com` (권장), `trysmalti.com`, `usesmalti.com`, `smaltihq.com`, `smalti-dev.com`.
- **대체 표기 예비안**: `smaltid`, `smaltide`, `oh-my-smalti`, `smalti-cli` (브랜드 순도 vs 가용성 트레이드오프).

### 5.3 미확인 (로컬 CLI 재검증 필수)

npm `smalti` / PyPI `smalti` / crates.io `smalti` — 검색 인덱스엔 무결과이나 WebFetch 403으로 **미점유 단정 불가**. 최종 결정 전 로컬에서 `npm view smalti` / `pip index versions smalti` / `cargo search smalti` 수행.

상세 내역·근거·출처는 `_workspace/06_namespace_audit.md` 참조.

## 6. ⚠️ 치명적 주의사항 — smalti 고유 리스크

smalti 의 구조적 약점 4종. Partide 는 **외부 상표**(Particle Industries), wnide 는 **내재 언어**(whine 동음) 리스크였다면, smalti 는 **언어 분열 + 카테고리 교차** 가 주 리스크.

### 6.1 발음 분열 리스크

- 이탈리아어 원어 발음: **/ˈzmal.ti/** — "즈말티". 이탈리아어 음운 규칙상 모음 앞 `s` + 유성자음(`m`) 은 /z/ 로 유성화.
- 영어 차용 발음: **/ˈsmɑːl.ti/** — "스말티". 영어 화자는 유성화 규칙을 적용하지 않음.
- 한국어 외래어 표기: **"스말티"** 고정 권장 (외래어 표기법 기준; 영어 차용 경로가 현실적).
- 결과: 브랜드 발화 시 "즈말티 vs 스말티" 분열 가능. wnide 의 3중 발음 분열보다는 덜 심각하지만, 공식 발음 가이드를 FAQ 레벨에 명시해야 함.

### 6.2 의미 불투명성

- 영단어 아님 → 영어권 첫 접촉 시 "뭔지 모르는 이탈리아어 단어".
- **장점**: 상표 청정 + `jq` 톤의 cryptic 매력.
- **단점**: 마케팅 카피 없이 단독 노출되면 의미 전달 0. 랜딩·README hero 영역에 각주 필요.
- 완화책: "tessera·smalti·mosaico" 3계층을 hero 에 미니 용어집으로 노출 (한 줄로 끝내는 디자인).

### 6.3 화장품 카테고리 교차 (Class 3)

- 이탈리아어에서 **"smalto"** (단수) 는 **매니큐어·네일 에나멜** 을 일컫는 일상어. `smalti` 는 그 복수.
- L'Oréal·Kiko Milano·Essie 이탈리아 지사 제품 설명에서 "smalti per unghie" (네일 에나멜) 표기 빈출.
- Class 3 (화장품) 에 `SMALTI` 관련 상표가 **존재할 가능성이 높다**.
- Class 9 (소프트웨어) / Class 42 (SaaS) 와는 상이한 분류지만, 국가별 상표 심사관의 "연관 카테고리 혼동" 판단에 따라 기각 가능성 있음.
- **변리사 검토 시 반드시 Class 3/9/42 모두를 교차 조회할 것.**

### 6.4 한국어권 인지도 제로

- "스말티" 는 한국어 일반 어휘에 없음. 공예·미술 전공자 외에는 미지의 단어.
- Partide 도 조어라 인지도 0 은 같지만, Partide 는 "particle + IDE" 가 직관 해독 가능. smalti 는 **순수 외래어 학습** 을 요구.
- 완화책: 브랜드 스토리에서 "비잔틴 모자이크 장인" 이미지를 초반부터 주입 — 시각 자원(금박 유리 조각 사진) 으로 의미 구축.

**결론**:

- ❌ Class 3 상표 실조회 전 `smalti.com` 구매나 상표 출원 진행 금지.
- ❌ 공식 발음 미고정 상태로 마케팅 비디오 제작 금지.
- ✅ 한글 표기 **"스말티"** 1안으로 고정 (외래어 표기법 준거).
- ✅ 공예 3계층(tessera/smalti/mosaico) 서사를 브랜드 에셋 전반에 일관 적용.
- ✅ Partide·wnide 대비 해커 톤 축이 우월하므로, 법률 리스크가 해소되면 제1순위 승격 가능.

> ⏳ **변리사 Class 3 조회 결과 대기 중** — task_reb_a01 (변리사 선임) · task_reb_a03 (USPTO·EUIPO·UIBM·KIPO 공식 `SMALTI` 단독어 + Class 9/42 검증) 진행 중. 결과 🔴 RED 시 브랜드 자산(로고·팔레트·디자인 시스템)은 보존하되 네임으로만 Partide 폴백.

## 7. 실행 체크리스트 (Not Yet)

Partide·wnide 체크리스트와 동일 구조. smalti 채택 시 변경되는 값만 표기.

### Phase A: 네임스페이스 선점

- [ ] `smalti.dev` 등록
- [ ] `smalti.sh` 등록
- [ ] `smalti.app` 등록
- [ ] `smalti.tools` 등록 (공예·도구 함의로 보험)
- [ ] `smalti.com` 가격 조회 (미술재료 상점 보유 시 협상 비용 추정)
- [ ] npm `smalti` 예약 (스켈레톤 publish)
- [ ] npm `@smalti` 스코프 점유
- [ ] `github.com/smalti` org 생성
- [ ] `github.com/smalti-dev` 대안 확보

### Phase B: 법률

- [ ] 변리사 선임
- [ ] USPTO TESS 전문 조회 — `SMALTI` Class 9 / 42
- [ ] USPTO TESS — `SMALTI` / `SMALTO` Class 3 (화장품) 교차 조회
- [ ] EUIPO (이탈리아 원어권) 조회 — Class 3 이탈리아 화장품 선점 여부
- [ ] KIPO 상표 검색
- [ ] 위험 평가 보고서 수령

### Phase C: 브랜드 에셋

- [x] **로고 최종 확정** (2026-04-24, `docs/brand/smalti-icon-source-1024.png`) — 4-컬러 glossy squircle
- [ ] **발음 가이드 페이지** — `/ˈsmɑːl.ti/` (영어) + 한글 "스말티" 고정 + 이탈리아어 원어 참고
- [x] 컬러 팔레트 확정 (팔레트 C Hybrid 실사용 / 팔레트 D Icon-4Color 브랜드 자산)
- [x] 타이포그래피 정의 (Space Grotesk / Inter / JetBrains Mono)
- [ ] 아이콘 `.icns` / `.ico` 빌드 — task_reb_b03
- [ ] "tessera / smalti / mosaico" 3계층 용어집 페이지

### Phase D: 코드 마이그레이션

- [ ] `package.json`: `name: "smalti"`, `productName: "smalti"`
- [ ] `forge.config.ts`: `name`, `icon`
- [ ] `Info.plist`: `CFBundleName`, `CFBundleDisplayName`
- [ ] IPC 프로토콜: `aide://` → `smalti://`, `aide-plugin://` → `smalti-plugin://`, `aide-cdn://` → `smalti-cdn://`
- [ ] 환경변수: `AIDE_*` → `SMALTI_*`
- [ ] 앱 메뉴 문자열
- [x] 에러·로그 프리픽스 `[AIDE]` → `[smalti]`

### Phase E: 문서 교체

- [ ] `README.md`
- [ ] `CLAUDE.md` (전 계층)
- [ ] `docs/spec/PRD.md`, `TRD.md`, `UI-SPEC.md`
- [ ] `docs/wiki/*.md` (역사적 언급은 "formerly AIDE" 병기)

### Phase F: 배포 전환

- [ ] GitHub 리포 이름 변경 + redirect
- [ ] 기존 v0.0.5 이하 AIDE 릴리즈 유지, v0.1.0 부터 smalti
- [ ] 마이그레이션 가이드 문서
- [ ] 사용자 공지

## 8. Partide vs wnide vs smalti 비교

| 축 | Partide | wnide | smalti |
|---|---|---|---|
| 네이밍 유형 | 블렌드 조어 (particle+IDE) | 이니셜리즘 (Why Need IDE?) | **차용어** (이탈리아어 공예 용어) |
| 발음 명확성 | 높음 (PAR-tide) | 낮음 (wn- 클러스터) | 중간 (영/이 이중 경로, 한글 고정 가능) |
| 부정 연상 | "partido"(중립) | "whine"(부정) | **없음** (화장품 연상은 영어권에서 약함) |
| 의미 전달 속도 | 중간 (블렌드 해석) | 낮음 (백크로님 해석) | **낮음 (외래어 학습 필요)** |
| 철학 전달력 | 중간 (입자·조립) | 높음 (카테고리 도발) | **높음 (공예 3계층 메타포)** |
| 상표 리스크 | 낮음 (Particle 별개) | 낮음 (조어) | **중간 (Class 3 교차 조회 필요)** |
| 음성 마케팅 | 유리 | 불리 | 중립 (발음 가이드 있으면 유리) |
| 해커 톤 (jq/rg/nvim) | 중간 (7자·설명형) | 높음 (cryptic) | **높음 (cryptic + 외래어)** |
| 국제화 | 안정 | 한국어 표기 분열 | 원어/차용어 분열 가능, 한글 "스말티" 고정으로 해소 |
| 네임스페이스 청정 예측 | 실조회 완료 (청정) | 낙관적 예측 | **낙관적 예측** (Class 3 실조회 필수) |
| 서사 자원 | 중간 (화학·물리) | 얇음 (수사학) | **풍부 (공예·장인·비잔틴)** |
| 전체 권고 | 1순위 (안전) | 슬로건·CLI명 분리 | **병렬 1순위 (법률 검토 후 승격)** |
| 로고 구체화 | 미제작 | 미제작 | **✅ 확정 (4-컬러 glossy squircle, 2026-04-24)** |

## 9. 의사결정 권고

0. **[2026-04-24 갱신] 조건부 Go** — task_reb_a03 Class 3 clearance 게이트 통과 조건부. 현재 로고·팔레트·디자인 시스템·문서 전개는 선행 진행한다. 변리사 조회 결과 🔴 RED 판정 시 브랜드 자산(로고·팔레트·타이포·디자인 시스템)은 보존하되 **네임으로만 Partide 롤백**. 자산 재활용이 가능하도록 워드마크·네임 의존성을 디자인 시스템에서 분리 유지할 것.

1. **smalti 는 Partide 와 병렬로 검토** — §6.3 (Class 3 화장품 상표) 실조회 결과가 합격하면 **제1순위로 승격**.
2. **승격 논거**:
   - 해커 톤 축에서 Partide 대비 우월 (외래어 cryptic + 공예 장인 이미지).
   - 메타포 3계층(tessera·smalti·mosaico) 이 Create n Play 흐름에 정확히 정렬 — Partide 의 "입자→원자" 보다 정밀.
   - 네임스페이스 dev-tool 카테고리 청정 예측.
3. **승격 블로커**:
   - Class 3 상표 충돌 발견 시 — EUIPO 의 이탈리아 화장품 브랜드가 소프트웨어 카테고리까지 권리를 주장하면 기각 리스크.
   - `smalti.com` 가격 협상 실패 — `.dev` 로 감당 가능하지만 국제 신뢰도 측면에서 `.com` 확보가 이상적.
4. **Partide 의 역할 재정의**:
   - smalti 승격 시 Partide 는 **fallback 1순위** 로 강등.
   - smalti 가 법률 블록될 경우 즉시 Partide 로 복귀 가능한 상태 유지.
5. **wnide 의 역할 유지**:
   - 슬로건·매니페스토 레이어에서 "Why need an IDE?" 는 여전히 사용 가능.
   - smalti 의 서사가 "공예적 조립" 으로 잡히면, wnide 의 도발적 수사와 층위 충돌 가능 → 둘 중 하나만 철학 슬로건으로 채택.

## 10. 타임라인 제안

- **Week 1**: Class 3/9/42 상표 사전 조회 + 도메인/npm/GitHub 실조회 (§5 의 [조회 필요] 전수 해소).
- **Week 2**: 변리사 선임 및 §6.3 Class 3 리스크 공식 평가.
- **Week 3–4**: 법률 clearance 확정. clearance 통과 시 smalti 를 제1순위로 최종 결정.
- **Week 5–6**: 네임스페이스 선점 완료 + 로고·브랜드 에셋 제작 (모자이크 모티프).
- **Week 7–8**: 코드 마이그레이션.
- **릴리즈 시점**: v0.1.0 또는 v1.0.0 — 상표 출원 등록 이후 권장.
- smalti 블록 시: Week 3 시점에 Partide 로 롤백, Partide 타임라인(§9) 재개.

## 11. 결론

smalti 는 **Partide 의 안전성** 과 **wnide 의 컨셉 강도** 사이에서 "세 번째 길" 을 연다. Partide 가 과학(입자) 의 언어로 조립을 말하고 wnide 가 수사학(도발) 의 언어로 카테고리를 거부한다면, smalti 는 **공예(craft) 의 언어로 사용자를 장인의 위치에 놓는다**. 해커 CLI 전통의 cryptic 톤과 터미널 네이티브의 dotfiles 문화가 만나는 지점에 정확히 앉는다.

단, 이 모든 논거는 **Class 3 화장품 상표 실조회** 라는 단일 관문 뒤에 있다. 이 관문이 열리면 smalti 는 제1순위로 승격되고, 닫히면 Partide 가 그 자리를 지킨다. 현재로서는 **"조건부 제1순위 후보"** — 실조회 1주 투자 후 재판정이 최적 경로.

**2026-04-24 업데이트**: 로고 확정으로 브랜드 아이덴티티의 핵심 축(네이밍·팔레트·타이포·로고·톤)이 모두 정렬되었다. 비주얼-버벌 일관성은 완성 단계이며, 남은 관문은 **법률 clearance 단 하나**로 압축되었다. 게이트 통과 시 곧바로 v0.1.0 릴리즈로 직행 가능한 상태.

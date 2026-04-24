---
title: "AIDE → Partide 리브랜딩 아이데이션"
category: ideation
tags: [branding, naming, rebrand, partide, trademark, namespace]
created: 2026-04-16
updated: 2026-04-24
related: [[rebrand-smalti]], [[rebrand-wnide]], [[index]]
---

# AIDE → Partide 리브랜딩 아이데이션

> ⚠️ **SUPERSEDED by [[rebrand-smalti]] (2026-04-24)** — Partide was the frontrunner naming candidate from the particle/IDE blend exploration. It was deprioritized after the team selected `smalti` (Byzantine glass mosaic tiles), which better matched the "Create n Play" assembly metaphor while avoiding Particle Industries trademark proximity. This document is preserved as the Partide decision record; use `rebrand-smalti.md` for the active plan.

> 이 문서는 리브랜딩 아이데이션 기록이며, 실행 전 단계입니다.
> 당장의 실행 지시가 아닌 맥락·결정사항·리스크 보존을 목적으로 합니다.

## 1. 요약 (Executive Summary)

- 현재 브랜드 **"AIDE"** 가 Android IDE(안드로이드용 오픈소스 IDE)와 네이밍 충돌 → 리브랜딩 필요.
- 최종 결정안: **Partide** (product name) — "particle + IDE" 블렌드 조어.
- 서브 카피 옵션:
  - "Bare particles. Infinite possibilities."
  - "The minimalist IDE you assemble."
- **아직 실행 전** — 네임스페이스 선점·변리사 검토 후 착수 예정.

## 2. 리브랜딩 배경

- Android IDE(안드로이드용 오픈소스 IDE)와 네이밍이 겹침 → SEO·사용자 혼동 리스크.
- 커스텀 플러그인을 사용자가 직접 만든다는 "Create n Play" 컨셉을 브랜드가 반영해야 함.
- 형태가 고정되지 않고 사용자가 조립하는 **유동적 도구**라는 이미지를 담고 싶음.

## 3. 후보 탐색 여정 (Decision Log)

| 후보 | 컨셉 | 결론 | 이유 |
|------|------|------|------|
| Smith / Carpenter | industrious (장인) | 스킵 | 너무 평범·식상 |
| Forge | 대장간 | 스킵 | Laravel Forge 등 개발자 툴 카테고리에 crowded |
| Kiln | 가마 | 스킵 | 굽는 것이지 모양을 형성하는 행위가 아님 |
| Anvil | 모루 | 스킵 | Anvil Works와 직접 경쟁 |
| Lathe | 선반 | 보류 | 의미는 좋으나 한국어권 인지도 낮음 |
| Quark | 기본입자 | 스킵 | Quark Software Inc. Class 9 상표 활성 |
| Lepton | 점입자 | 스킵 | **NVIDIA DGX Cloud Lepton 과 정면 충돌** |
| Muon / Axion / Hadron / Phonon | 대안 입자 | 고려됨 | Partide 등장으로 보류 |
| Fettle / Cog / Loam / Husk / Dram | 힙스터 기피 카테고리 | 보관 | Partide 가 더 강력 |
| **Partide** | particle + IDE 블렌드 | **채택** | 독창 조어, 네임스페이스 청정, 2중 의미 레이어 |

## 4. Partide 브랜드 상세

### 4.1 네이밍 구조

- Product name: **Partide**
- Domain handle: **partide.dev** (primary), `partide.sh` / `partide.app` 예비.
- 스타일: 화학 접미사 "-ide" 패턴 (peptide, chloride) → 발음 **PAR-tide**.

### 4.2 의미 층위

1. **표면**: "particle + IDE" — 입자 같은 IDE.
2. **화학적**: "-ide" = 화합물 접미사 → `part` 의 화합물 → 플러그인 결합으로 완성되는 컴파운드.
3. **영문 직관**: "part + ide" → "IDE composed of parts".

### 4.3 서사 (narrative arc)

- Electron(전자)은 단독 존재 가능하지만, 원자핵과 결합해 원자를 형성 (렙톤 메타포에서 차용).
- **Partide 코어 = 전자**, **사용자 플러그인 = 핵** → **조립된 IDE = 원자**.
- 신조어이므로 우리 방식으로 의미를 자유롭게 부여 가능.

### 4.4 태그라인 후보

- A: "Bare particles. Infinite possibilities."
- B: "The minimalist IDE you assemble."
- C: "Assemble your own IDE, particle by particle."
- **권장**: **B** — Particle Industries 리스크 최소화 (§6 참조).

## 5. 네임스페이스 Audit 결과

### 5.1 전체 확보 가능

- **도메인**: `partide.dev`, `.sh`, `.app`, `.build`, `.tools`, `.io`, `.ai`, `.run`, `.codes` **전부 available**.
- `partide.com`: 브로커 보유 (topdomainer.com, 2003-02-09 등록) → 비용 이슈.
- **npm**: `partide`, `@partide/core`, `@partide/cli` 전부 404 (미선점).
- **GitHub**: `github.com/partide` 전부 available.
- **USPTO TESS**: `PARTIDE` 0건 (조어).
- **Google 검색**: "Partide" 상업적 사용 0건.

### 5.2 경미한 이슈

- 스페인어 **"partido"** (정당·경기)와 발음 유사 → SEO 희석 가능성 있으나 상표 무관.

## 6. ⚠️ 치명적 주의사항 — Particle Industries 리스크

**Particle Industries, Inc.** (구 Spark.io, 2015년 리브랜드):

- IoT 개발자 플랫폼, 활성 운영 중.
- 개발자 도구 카테고리(Class 9)에서 "Particle" 상표를 강하게 행사.
- 운영 제품:
  - **Particle Workbench** (VS Code 확장 IDE)
  - **Particle Web IDE**
  - **Particle Dev** (구 desktop IDE)

**결론**:

- ❌ "Particle IDE" 를 제품 이름·서브카피·`package.json` description·앱스토어 등록명에 **사용 금지**.
- ❌ 마케팅 페이지 hero 영역에 "Particle" 단독 사용 금지.
- ✅ 내부 문서·창업 썰에 "Partide = Particle + IDE" 블렌드 이야기 보존.
- ✅ 일반명사로서 "particles" (복수, 소문자, 일반적 물리 은유) 사용 가능.

## 7. 실행 체크리스트 (Not Yet)

### Phase A: 네임스페이스 선점

- [ ] `partide.dev` 등록
- [ ] `partide.sh` 등록
- [ ] `partide.app` 등록
- [ ] npm `partide` 예약 (스켈레톤 publish)
- [ ] npm `@partide` 스코프 점유
- [ ] `github.com/partide` org 생성
- [ ] `github.com/partide-ide` 대안 확보

### Phase B: 법률

- [ ] 변리사 선임
- [ ] USPTO TESS 전문 조회 — `PARTIDE` Class 9 / 42
- [ ] KIPO 상표 검색
- [ ] Particle Industries 상표 범위 정식 분석
- [ ] 위험 평가 보고서 수령

### Phase C: 브랜드 에셋

- [ ] 로고 디자인 (3종 시안)
- [ ] 컬러 팔레트 확정 (기존 emerald 계승 여부 결정)
- [ ] 타이포그래피 정의
- [ ] 아이콘 — macOS `.icns`, Windows `.ico`

### Phase D: 코드 마이그레이션

- [ ] `package.json`: `name`, `productName`, `description`
- [ ] `forge.config.ts`: `name`, `icon`
- [ ] `Info.plist` (`extendInfo`): `CFBundleName`, `CFBundleDisplayName`
- [ ] IPC 프로토콜: `aide://`, `aide-plugin://`, `aide-cdn://` → `partide` 계열
- [ ] 환경변수: `AIDE_*` → `PARTIDE_*`
- [ ] 앱 메뉴 문자열
- [ ] 에러·로그 프리픽스 `[AIDE]` → `[Partide]`

### Phase E: 문서 교체

- [ ] `README.md`
- [ ] `CLAUDE.md` (전 계층)
- [ ] `docs/spec/PRD.md`, `TRD.md`, `UI-SPEC.md`
- [ ] `docs/wiki/*.md` (역사적 언급은 "formerly AIDE" 병기)

### Phase F: 배포 전환

- [ ] GitHub 리포 이름 변경 + redirect
- [ ] 기존 v0.0.5 이하 AIDE 릴리즈 유지, v0.1.0 부터 Partide
- [ ] 마이그레이션 가이드 문서
- [ ] 사용자 공지

## 8. 보류 중인 대안 (If Partide fails)

Partide 가 법률 검토에서 문제 발견 시 fallback:

- **Muon** / **Axion** / **Hadron** / **Phonon** — 입자 계열 재탐색.
- **Fettle** / **Cog** / **Loam** — 힙스터 기피 카테고리.
- **Leptonlab**, **Quarkshell** — 조합어 (상표 리스크 잔존).

## 9. 타임라인 제안 (임시)

- **Week 1–2**: 네임스페이스 선점 + 변리사 초기 검토.
- **Week 3–4**: 법률 clearance 완료 여부 확인.
- **Week 5–6**: 로고·브랜드 에셋 제작.
- **Week 7–8**: 코드 마이그레이션.
- **릴리즈 시점**: v0.1.0 또는 v1.0.0 — 상표 출원 등록 이후 권장.

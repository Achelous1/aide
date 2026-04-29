# smalti — 비주얼 아이덴티티

> Outlaw 70% + Magician 30% / 터미널 네이티브 / 비잔틴 모자이크 메타포
> 입력 근거: `_workspace/00_input.md`, `_workspace/01_brand_strategy.md`, `docs/ideation/rebrand-partide.md`
>
> **R4/R6 반영 (2026-04-24)**: 팔레트 C (Hacker-Byzantine Hybrid) 신설 및 제품 UI 전역 기본으로 승격. 팔레트 A는 브랜드 자산(로고·일러스트·스토리) 전용으로 강등. 워드마크 스케일 규칙(§4.6) 추가로 소형 크기 `i` 도트 이중색 오독 리스크 방지.
>
> **R7 반영 (2026-04-24 · 확정 로고 기준 리브랜드)**: 최종 앱 아이콘이 4-컬러 glossy squircle (Sky Blue translucent / Obsidian Black / Antique Gold / Crimson)로 확정. §3.4 **팔레트 D (Icon-4Color)** 신설 — 로고·브랜드 자산 전용 풀컬러. 팔레트 D의 Crimson `#F10C45`를 제품 UI 에러 및 "new" 배지 액센트로 역수입(팔레트 C §3.3 업데이트). §4.6 워드마크 `i` 도트 이중색을 Cobalt·Gold → **Sky Blue·Crimson**으로 재매핑. 확정 로고 이미지: `docs/brand/smalti-icon-source-1024.png`.

---

## 1. 비주얼 컨셉 스테이트먼트

**smalti는 라벤나의 비잔틴 성당 벽에서 1,500년을 버틴 유리 조각(smalti)을 터미널 화면 위로 끌어내린다.** 각 플러그인은 하나의 타일이고, 사용자는 그 타일을 자기 리듬으로 붙여 자기 모자이크를 완성한다. 브랜드 비주얼은 두 개의 극단을 단단히 붙인다 — 한쪽은 코발트·금박·버건디의 고대 교회 벽 팔레트, 다른 쪽은 검은 터미널 배경 위에서 형광처럼 발광하는 단색 액센트. 둘 사이를 잇는 것은 **격자(grid) 구조**다. 모자이크의 테세라(tessera) 타일 정렬 원리와 터미널의 모노스페이스 셀 그리드는 본질적으로 같은 구조 — 이 동형성(isomorphism)이 smalti의 모든 디자인 결정을 지배한다. 광택은 있지만 마케팅적으로 반짝이지 않는다. 소문자, 얇은 선, 수학적 정렬. 마법은 숨기고, 반항은 침묵으로 드러낸다.

---

## 2. 디자인 원칙

- **핵심 키워드**: `tessellated` · `luminous` · `cryptic`
- **무드**: 차갑고 기하학적이되, 금·유리의 따뜻한 반짝임이 한 점 섞임. 미니멀리즘에 가까우나 공백을 두려워하지 않는 맥시멀리즘적 여백 허용.
- **아키타입 비주얼 표현**:
  - **Outlaw 70%** → 소문자 전용, 경량 weight, 마케팅 광택 제거, 대비 높은 다크모드 기본, 불친절한 ASCII 부팅 화면.
  - **Magician 30%** → 금박(gold leaf) 액센트 1%, 모자이크 조각이 조립되는 미세한 모션, "조각 → 전체"의 시각적 서사.

---

## 3. 컬러 시스템

### 3.1 팔레트 A — Byzantine Original (비잔틴 원형)

라벤나 산 비탈레 성당·산타폴리나레 누오보의 실제 모자이크 색상 추출.

#### Primary

| Name | HEX | RGB | OKLCH | 용도 |
|---|---|---|---|---|
| **Cobalt Deep** | `#1B3A8C` | (27, 58, 140) | `oklch(37% 0.16 265)` | 브랜드 메인, 로고, CTA |

- **심리**: 신뢰·깊이·권위. 비잔틴 성인의 망토·하늘 배경에서 1,500년간 사용된 유리 모자이크의 기본 색.
- **문화**: 중세 기독교 도상학에서 초월·신성. 해커 문화에서는 IBM 블루의 계보가 아니라, `starship.rs` / `astro.build` 라인의 "진지한 조어 도구" 블루.
- **선정 이유**: 터미널 배경(보통 #000~#1a1a1a) 위에서 가독성 확보 + Outlaw의 냉소를 담기에 충분히 어두움.

#### Secondary

| Name | HEX | RGB | OKLCH | 용도 |
|---|---|---|---|---|
| **Burgundy Tessera** | `#7A1F2B` | (122, 31, 43) | `oklch(36% 0.13 18)` | 에러 강조, 중요 링크 hover |
| **Porphyry Dust** | `#3D2438` | (61, 36, 56) | `oklch(27% 0.05 340)` | 카드 배경, 패널 구분 |

- Burgundy는 모자이크의 순교자 망토 색. 공격적이지 않고 오래된 피의 채도.
- Porphyry는 황제의 돌. 다크모드 surface 계층의 미세 대비용.

#### Accent

| Name | HEX | RGB | OKLCH | 용도 |
|---|---|---|---|---|
| **Gold Leaf** | `#C9A24B` | (201, 162, 75) | `oklch(72% 0.12 85)` | 플러그인 활성 상태, 프롬프트 커서, 로고 내부 반짝임 |
| **Glass Cyan** | `#4FB3BF` | (79, 179, 191) | `oklch(71% 0.08 210)` | 링크, 인터랙티브 포커스 링 |

- Gold Leaf는 **전체 화면의 1%만** 사용. 희소성이 금박의 가치. 60-30-10 중 10의 절반.
- Glass Cyan은 유리 조각의 반투명한 반사광.

#### Neutrals (Dark-first)

| Name | HEX | 용도 |
|---|---|---|
| `ink.950` | `#0A0B10` | 앱 최하단 배경 |
| `ink.900` | `#11131B` | 메인 캔버스 배경 |
| `ink.800` | `#1B1E2A` | 패널·사이드바 |
| `ink.700` | `#2A2E3D` | 구분선·테두리 |
| `ink.300` | `#9BA0B0` | 보조 텍스트 |
| `ink.100` | `#E6E7ED` | 기본 본문 텍스트 |
| `ink.50`  | `#F5F5F0` | 라이트모드 캔버스 (오프화이트, 순백 회피) |

라이트모드는 기본 아님 — 지원하되 전략적 우선순위 없음. `ink.50`은 오래된 양피지 톤으로, 비잔틴 후광의 배경을 참조.

#### Semantic

| Name | HEX | 용도 |
|---|---|---|
| `success` | `#4A8A5C` | 모자이크의 산화구리 녹청 |
| `warn` | `#C9A24B` | Gold Leaf와 공유 — 경고는 곧 주의의 광채 |
| `error` | `#B83A46` | Burgundy의 채도 ↑ 버전 |
| `info` | `#4FB3BF` | Glass Cyan과 공유 |

### 3.2 팔레트 B — Modern Hacker (현대 해커 톤)

터미널 친화 고채도, `warp.dev` / `zed.dev` 라인.

| Name | HEX | RGB | 비고 |
|---|---|---|---|
| **Primary — Electric Indigo** | `#5B5BE8` | (91, 91, 232) | vivid, 디스플레이 발광 톤 |
| **Secondary — Magenta Pulse** | `#E85B9E` | (232, 91, 158) | 네온 핑크, 포커스 강조 |
| **Accent — Cyber Gold** | `#FFD166` | (255, 209, 102) | 고채도 금색 |
| **Neutrals** | `#0B0F19` → `#E6EAF5` | 순수 다크/라이트 |
| **Success** | `#3DDC97` | mint 네온 |
| **Warn** | `#FFD166` | |
| **Error** | `#FF5C7A` | |

### 3.3 팔레트 C — **Hacker-Byzantine Hybrid** (⭐ 신규 권장안)

R4 지시 반영. 사용자 톤 레퍼런스(`jq`/`warp`/`zed`/`neovim`)를 **상위 축**으로 두고 팔레트 A를 해커 표층으로 재조정.

#### 설계 원칙

1. **베이스 (극단 다크)**: `ink.950` ~ `ink.700` 그대로 유지. warp/zed/jq README 다크 톤 100% 계승.
2. **전경**: `ink.100` off-white 본문, `ink.300` 보조 텍스트 — 팔레트 A neutrals 유지.
3. **Primary 액션 컬러**: **Glass Cyan `#4FB3BF`** 단일 승격. jq·neovim·starship 전통의 cyan 계보. Cobalt Deep을 본문/CTA에서 제외.
4. **단일 포인트**: **Gold Leaf `#C9A24B`** — 전체 화면의 **~1% 엄격 제한**. 활성 탭 상단 1px 라인 / 터미널 커서 / "new" 배지 3곳에만.
5. **Cobalt Deep · Burgundy Tessera 강등**: 제품 UI 전역에서 **기본 사용 금지**. 브랜드 스토리·Welcome 모자이크 일러스트 내부·`logo exploration` 프레임 내에서만 허용.

#### Primary (Hybrid)

| Name | HEX | 용도 | 비고 |
|---|---|---|---|
| **Glass Cyan** | `#4FB3BF` | CTA, 링크, 포커스 링, 프롬프트 브래킷, 활성 탭 테두리 | 주 액션 컬러로 승격 |
| **Gold Leaf** | `#C9A24B` | 터미널 커서, "new" 배지, 활성 탭 상단 1px | **화면 1% 이내** |

#### Surface / Neutrals (Hybrid)

| Name | HEX | 용도 |
|---|---|---|
| `ink.950` | `#0A0B10` | 앱 최하단 배경 |
| `ink.900` | `#11131B` | 메인 캔버스 |
| `ink.800` | `#1B1E2A` | 패널·사이드바 |
| `ink.700` | `#2A2E3D` | 구분선·테두리 |
| `ink.300` | `#9BA0B0` | 보조 텍스트 |
| `ink.100` | `#E6E7ED` | 본문 |

#### 강등된 브랜드 자산 (Hybrid 예외 영역)

| Name | HEX | 허용 영역 |
|---|---|---|
| `Cobalt Deep` | `#1B3A8C` | Welcome 모자이크 일러스트, 로고 컨셉 A·C 내부, 브랜드 스토리 페이지 헤더 일러스트 |
| `Burgundy Tessera` | `#7A1F2B` | 에러 상태 출력, 로고 exploration 프레임 |
| `Porphyry Dust` | `#3D2438` | 카드 surface 깊은 대비만 (본문 금지) |

#### Semantic (Hybrid)

| Name | HEX | 용도 |
|---|---|---|
| `success` | `#4FB3BF` | Glass Cyan 통합 — 성공도 cyan 펄스 |
| `warn` | `#C9A24B` | Gold Leaf 통합 |
| `error` | **`#F10C45`** (R7 승격) | Crimson — 팔레트 D에서 역수입. 기존 Burgundy `#B83A46`는 폐기 |
| `info` | `#9BA0B0` | muted gray (정보는 침묵) |
| `critical-accent` | **`#F10C45`** (R7 신설) | Crimson 액센트 — "new" 배지, 긴급 CTA 전용. Gold Leaf의 "new" 배지 역할을 이관 |

**R7 역수입 결정 근거**:
- 기존 `error = #B83A46` (Burgundy-bright)은 채도·명도가 애매해 "에러" 인지 속도가 느리다는 리뷰 지적.
- 팔레트 D의 Crimson `#F10C45`는 글리프 인지 즉시성이 높고, 확정 로고 자산에 이미 포함되어 있어 브랜드 일관성 측면에서 자연스럽다.
- Gold Leaf가 기존에 담당하던 "new" 배지 역할을 Crimson으로 이관. Gold는 이제 **활성 탭 상단 1px 라인·터미널 커서·커서 블링크** 3곳으로만 축소. 1% 희소성 강화.
- Crimson은 에러와 critical-accent 둘 다 담당하지만, 화면 내 동시 출현 빈도가 극히 낮아(에러 토스트는 일시적, new 배지는 플러그인 카드 국한) 혼동 없음.

#### 라이트 변형 (Hybrid · Light)

팔레트 C의 Dark 기본을 뒤집은 라이트 모드. 제품 UI 전역 라이트 테마 요청 시 사용. `design.pen`의 Light Hybrid 프레임 5종(ndHjM / EYxm3 / P0ZSz / 3A2Ez / ku88a)에서 실측 적용.

| 역할 | Dark 값 | Light 값 | 비고 |
|---|---|---|---|
| canvas bg | `#0A0B10` | **`#F5F5F0`** (ink.50, off-white) | 전체 배경 |
| surface | `#11131B` | `#EAEAE4` | 사이드바·패널·탭 |
| raised | `#1B1E2A` | `#DEDED6` | 스테이터스바·구분면 |
| divider | `#2A2E3D` | `#C8C8BE` | 1px 보더 |
| body text | `#E6E7ED` | **`#11131B`** (ink.900) | 본문 |
| muted text | `#9BA0B0` | `#5A5F6E` | 보조 |
| **Primary (Glass Cyan)** | `#4FB3BF` | **`#2B8A94`** | 살짝 어둡게 (L ≈ 55%) — 라이트 배경 WCAG AA 확보 |
| **Accent (Gold Leaf)** | `#C9A24B` | **`#A8802A`** | 채도 유지, 명도 ↓ — 오프화이트 위 가독성 |
| success | `#4A8A5C` | `#2F6B3E` | 산화구리 어두운 변형 |
| warn | `#C9A24B` | `#A8802A` | Gold와 공유 |
| error | `#B83A46` | `#8E2530` | 어두운 버건디 |

**조정 근거**:
- `Glass Cyan` Dark 원본(#4FB3BF)을 오프화이트 배경(#F5F5F0)에 올리면 대비 ~2.1:1로 AA 미달. 명도를 55% → 45%로 내린 `#2B8A94`는 #F5F5F0 대비 **4.8:1**로 AA 통과.
- `Gold Leaf` 원본(#C9A24B)은 오프화이트 배경에서 2.4:1로 탁한 머스터드로 읽힘. `#A8802A`(L ≈ 40%)로 조정해 **5.1:1** 확보.
- `error` 원본(#B83A46)은 오프화이트 대비 4.2:1로 AA 경계. `#8E2530`으로 어둡혀 **6.4:1** 확보.

**터미널 pane**:
라이트 테마에서는 **터미널 pane도 canvas surface 톤(`#EAEAE4`) + ink.900(`#11131B`) 본문 + Cyan/Gold 액센트**로 통일한다. 과거 "개발자 관행상 터미널만 다크 유지" 예외를 철회한다. 이유: (1) smalti의 정체성은 "모자이크 = 장인적 일관성"이고 단일 화면 내 모드 혼재는 이 서사에 반한다, (2) `#EAEAE4` 배경 + `#11131B` 본문은 14:1로 AAA 기준, Cyan.light(#2B8A94)는 대형 모노 프롬프트(≥13px/700)에 대해 AA Large 통과(3.7:1), (3) Gold.light(#A8802A)는 커서·액센트 용으로만 사용되어 본문 대비 책임 밖. 컴포넌트의 `terminal-bg` 변수는 `surface`와 동일값을 바인딩하되, 향후 한 단계 더 어두운 서브-서피스가 필요하면 `#DEDED6`(raised)로 전환할 여지를 남겨둔다.

**앱 아이콘 예외**:
컨셉 C(Single Tessera) 앱 아이콘은 Dark/Light 모드 관계없이 **동일한 Cyan `#4FB3BF` ↔ Gold `#C9A24B` 대각 이등분** 유지를 권장. 앱 아이콘은 OS Dock·Finder·Taskbar 등 브랜드 외부 표면에 배치되므로, 제품 UI 테마와 독립된 "브랜드 자산"으로 취급한다. 라이트 모드용 별도 아이콘을 만들면 브랜드 인식 파편화.

**라이트 모드 WCAG AA 실측 (오프화이트 배경 #F5F5F0)**:

| 전경 | 배경 | 비율 | AA | 용도 |
|---|---|---|---|---|
| `ink.900` (#11131B) | `#F5F5F0` | 17.2:1 | ✅ | 본문 |
| `#5A5F6E` (muted) | `#F5F5F0` | 5.9:1 | ✅ | 보조 텍스트 |
| `Cyan.light` (#2B8A94) | `#F5F5F0` | 4.8:1 | ✅ | CTA·링크 |
| `Gold.light` (#A8802A) | `#F5F5F0` | 5.1:1 | ✅ | 커서·배지 |
| `error.light` (#8E2530) | `#F5F5F0` | 6.4:1 | ✅ | 에러 |
| `Cyan.light` (#2B8A94) | `#EAEAE4` (surface) | 4.6:1 | ✅ | 사이드바 링크 |

#### B05 결정 로그 (2026-04-24) — Glass Cyan 주 액션 유지 vs Sky Blue 조정

**채택 옵션: (A) 유지 — Glass Cyan `#4FB3BF`을 주 액션 컬러로 유지, Sky Blue는 로고·브랜드 자산 전용 유지.**

**근거 (3가지)**

1. **WCAG AA 대비 확보**: Glass Cyan `#4FB3BF`는 제품 UI 주 배경(`ink.900` #11131B) 대비 **7.6:1**, 최하단(`ink.950`) 대비 **8.1:1** — 4.5:1 기준을 크게 상회. 라이트 모드에서는 `#2B8A94`로 조정해 **4.8:1** AA 통과(§3.3 라이트 변형 실측). Sky Blue `#6FC5DB`는 `ink.900` 대비 7.9:1로 대비 자체는 통과하지만, 라이트 배경(`#F5F5F0`) 대비는 미실측 상태이며 Light variant 정의가 없어 교체 시 추가 작업 필요.

2. **시각 위계 유지 (로고 vs UI 레지스터 분리)**: Sky Blue는 확정 앱 아이콘 좌상 타일 색으로 브랜드 자산 최전면에 배치된 컬러. 이를 UI CTA 버튼·포커스 링·프롬프트 브래킷에도 동시 사용하면 "아이콘 vs 앱 UI" 시각 위계가 붕괴되어 브랜드 식별자가 약화됨. 두 컬러를 각각의 레지스터(브랜드 자산 / 인터랙션 레이어)에 묶는 것이 60-30-10 구조와도 정합.

3. **개발 비용 최소화**: 팔레트 C는 이미 프로덕션 design token(`$smalti-cyan`, `$smalti-cyan-light`)으로 반영 완료. 교체(옵션 C) 또는 블렌드(옵션 B)는 라이트 variant 재정의, WCAG 재실측, design.pen 전역 property 교체, 회귀 테스트를 수반해 B5~B7 스프린트 일정에 영향을 줌.

**Sky Blue 사용 범위 (제한적)**
- 앱 아이콘 squircle 좌상 쿼드런트
- Welcome Hero 중앙 로고 타일 (팔레트 D 적용 자산)
- 마케팅 키 비주얼·hero 배경 액센트
- `$smalti-sky-blue` variable 등록 유지 (로고 일러스트·마케팅 접근용)
- **제품 UI CTA·링크·포커스 링·프롬프트 브래킷에서는 사용 금지**

**Glass Cyan 사용 범위 (변경 없음)**
- CTA 버튼·링크 (`$smalti-cyan` dark: `#4FB3BF` / light: `#2B8A94`)
- 활성 탭 테두리·포커스 링
- 프롬프트 브래킷 (터미널 내 `>` 프롬프트 색)
- WorkspaceRow Active accent bar
- `success` semantic color (Cyan 펄스)
- design.pen Light Hybrid 5종 프레임(ndHjM / EYxm3 / P0ZSz / 3A2Ez / ku88a) 적용 유지

**WCAG AA 실측 요약 (두 컬러 모두 4.5:1 이상 확인)**

| 컬러 | 배경 | 비율 | AA | 비고 |
|---|---|---|---|---|
| Glass Cyan `#4FB3BF` | `ink.900` (#11131B) | 7.6:1 | ✅ | CTA·링크 (다크) |
| Glass Cyan `#4FB3BF` | `ink.950` (#0A0B10) | 8.1:1 | ✅ | CTA 강조 (다크) |
| Cyan.light `#2B8A94` | `#F5F5F0` (off-white) | 4.8:1 | ✅ | CTA·링크 (라이트) |
| Sky Blue `#6FC5DB` | `ink.900` (#11131B) | 7.9:1 | ✅ | 로고 자산 내부 텍스트 (참고) |

---

### 3.4 팔레트 D — **Icon-4Color** (로고·브랜드 자산 전용, R7 신규)

확정 앱 아이콘(`docs/brand/smalti-icon-source-1024.png`)의 4-컬러 glossy squircle을 공식 브랜드 팔레트로 정식화. **제품 UI 본문·배경·CTA에 직접 사용 금지** — 오직 로고·앱 아이콘·브랜드 자산·마케팅 키 비주얼에만 등장. 단, Crimson은 §3.3 팔레트 C의 `error` / `critical-accent`로 역수입(제품 UI 허용).

#### 4-컬러 구성

| 이름 | HEX 범위 (gradient) | RGB | 로고 위치 | 심리적 효과 |
|---|---|---|---|---|
| **Sky Blue (translucent)** | `#A8DEEF` → `#6FC5DB` | (111, 197, 219) base | 좌상 타일 | 개방·투명·기술 신뢰 — 유리의 반사광 계보 |
| **Obsidian Black** | `#0D0D10` (→ `#1B1B20` micro) | (13, 13, 16) base | 우상 타일 | 권위·깊이·침묵 — Outlaw 아키타입 표층 |
| **Antique Gold** | `#C9A24B` → `#E6C36B` | (201, 162, 75) base | 좌하 타일 | 귀함·장인·Magician 1% 광휘 |
| **Crimson** | `#F10C45` (→ `#C8083A` deep) | (241, 12, 69) base | 우하 타일 | 긴급·생명·결단 — 모자이크 피의 계보 |

#### 각 색의 용례

- **Sky Blue**: 앱 아이콘 좌상, 로고 일러스트 하늘·반사광, 마케팅 hero 배경 액센트. 제품 UI에서는 `$smalti-sky-blue` variable로 접근 가능하나 기본 CTA는 여전히 Glass Cyan `#4FB3BF`.
- **Obsidian Black**: 앱 아이콘 우상, 로고 플린트·그림자. `$smalti-black`은 다크 테마 최하단 일러스트 배경 또는 라이트 테마에서 본문 대비 확보용. 제품 UI 본문 배경은 여전히 `ink.900/950`.
- **Antique Gold**: 팔레트 C의 Gold Leaf와 HEX 일치. §3.4 Icon-4Color에서는 그라디언트 상단 `#E6C36B`까지 허용(로고 내부 하이라이트 전용).
- **Crimson**: 팔레트 D에서 신규, **§3.3 팔레트 C로 역수입**되어 제품 UI `error` / `critical-accent` / `new` 배지 컬러로 사용. 로고 외부 사용 허용 유일 컬러.

#### WCAG AA 실측 (팔레트 D 단독 조합)

팔레트 D의 4색은 대부분 로고 자산 내부 조합이라 UI 본문 대비 규칙에서 면제된다. 단 Crimson과 Sky Blue가 제품 UI(§3.3 C)로 유입되는 조합만 실측:

| 전경 | 배경 | 비율 | AA | 용도 |
|---|---|---|---|---|
| Crimson `#F10C45` | `ink.900` (#11131B) | 5.3:1 | ✅ | 에러 메시지 (다크) |
| Crimson `#F10C45` | `ink.950` (#0A0B10) | 5.7:1 | ✅ | 에러 메시지 (다크 최하단) |
| Crimson.deep `#C8083A` | `#F5F5F0` (off-white) | 6.1:1 | ✅ | 에러 메시지 (라이트) |
| White `#FFFFFF` | Crimson `#F10C45` | 4.6:1 | ✅ | "new" 배지 텍스트 (다크) |
| White `#FFFFFF` | Crimson.deep `#C8083A` | 6.0:1 | ✅ | "new" 배지 텍스트 (라이트) |
| Sky Blue `#6FC5DB` | `ink.900` | 7.9:1 | ✅ | (선택) 로고 자산 내부 텍스트 |
| Obsidian `#0D0D10` | `#F5F5F0` | 18.1:1 | ✅ | 라이트 테마 본문 대체 |

#### 팔레트 D 사용 규칙

- **로고 자산 내부 구성**: 4색 전원 등장 필수 (3색 이하 사용 금지 — 브랜드 식별자가 약화됨).
- **그라디언트 방향**: 각 타일 내부 그라디언트는 **좌상단→우하단** 방향 고정. glossy highlight는 상단 20% 영역 `rgba(255,255,255,0.15)` 오버레이.
- **squircle 반경**: macOS 아이콘 규격(iOS-18 style continuous curvature). 1024px 기준 내부 반경 228px (squircle shape factor ≈ 5).
- **제품 UI 역수입 허용 컬러**: **Crimson만** (에러 + critical-accent). 나머지 3색(Sky Blue / Obsidian Black / Antique Gold)은 `$smalti-sky-blue` / `$smalti-black` / `$smalti-gold` variable로 등록되어 있으나 로고 일러스트·마케팅 전용으로 한정.

#### 4-팔레트 체계 매트릭스 (R7)

| 팔레트 | 용도 | 상태 | variable 네임스페이스 |
|---|---|---|---|
| **A — Byzantine Original** | 스토리·마케팅 레퍼런스 | 보존 | (variable 없음, 마크업 HEX 직접) |
| **B — Modern Hacker** | 참고안, 플러그인 갤러리 액센트 여지 | 보존 | (variable 없음) |
| **C — Hacker-Byzantine Hybrid** | **제품 UI 전역 실사용** | **기본 채택** | `$smalti-canvas`/`surface`/`ink-*`/`cyan`/`gold`/`error` |
| **D — Icon-4Color** | **로고·브랜드 자산 전용** | **R7 확정** | `$smalti-sky-blue`/`black`/`gold`(C 공유)/`crimson` |

### 3.4.1 팔레트 적용 지도 — 어디에 어느 팔레트를?

| 맥락 | 팔레트 | 비고 |
|---|---|---|
| **제품 UI 전역 (터미널·사이드바·패널·CTA)** | **C (Hybrid)** | 기본 |
| **앱 아이콘 (.icns/.ico/favicon/Dock)** | **D (Icon-4Color)** | **R7 확정** |
| **로고 컨셉 C (Single Tile)** | **D (Icon-4Color)** | **R7 — 확정 squircle로 교체** |
| 에러 메시지·"new" 배지 | D의 Crimson → C로 역수입 | R7 |
| Welcome 페이지 로고 모자이크 일러스트 | A (Byzantine) | 브랜드 자산 영역 |
| 브랜드 스토리·About 페이지 | A (Byzantine) | 서사 전용 |
| 로고 컨셉 A (3×3 격자) 내부 | A (Byzantine) | 로고는 자산 |
| README 배지·소셜 프리뷰 | C (Hybrid) + D의 Crimson 액센트 | Glass Cyan 기반 |
| 플러그인 갤러리 액센트 (선택) | B (Modern Hacker) | 참고안, 미채택 |

### 3.5 60-30-10 배분 (팔레트 C 기준 재계산)

- **60% — `ink.950` / `ink.900` + `ink.100` (off-white 본문)**: 배경·캔버스·본문 텍스트. 다크 터미널 표층.
- **30% — `ink.800` / `ink.700` + `ink.300` (보조 gray)**: 패널·구분선·보조 텍스트.
- **10% 중 9% — `Glass Cyan`**: 주 액션·링크·포커스·프롬프트 브래킷.
- **10% 중 1% — `Gold Leaf`**: 터미널 커서·"new" 배지·활성 탭 상단 1px만. 금박은 언제나 희소해야 한다.

### 3.6 권장안 정리

| 팔레트 | 역할 | 상태 |
|---|---|---|
| **A — Byzantine Original** | 브랜드 자산 (로고·일러스트·스토리) 전용 | 보존 |
| **B — Modern Hacker** | 참고안, 플러그인 갤러리 액센트 여지 | 미채택 |
| **C — Hacker-Byzantine Hybrid** | **제품 UI 전역 기본** | **⭐ 신규 권장** |

**변경 사유 (R4)**: 리뷰 보고서 §3·§8에서 팔레트 A가 `warp/zed/jq` 해커 라인과 구조적으로 이탈한다고 지적. 어원 정합성은 로고·일러스트 영역으로 국한하고, 제품 UI는 해커 표층에 맞춰 재설계.

### 3.7 WCAG AA 대비 체크 (팔레트 C 기준 실측)

팔레트 C에서 제품 UI 본문에 실제 등장 가능한 조합만 재점검:

| 전경 | 배경 | 비율 | AA (4.5:1) | AA Large (3:1) | 허용 |
|---|---|---|---|---|---|
| `ink.100` (#E6E7ED) | `ink.900` (#11131B) | 14.8:1 | ✅ | ✅ | 본문 기본 |
| `ink.100` | `ink.950` (#0A0B10) | 15.9:1 | ✅ | ✅ | 최하단 배경 위 본문 |
| `ink.100` | `ink.800` (#1B1E2A) | 12.2:1 | ✅ | ✅ | 패널 본문 |
| `ink.300` (#9BA0B0) | `ink.900` | 6.9:1 | ✅ | ✅ | 보조 텍스트 |
| `ink.300` | `ink.800` | 5.7:1 | ✅ | ✅ | 패널 보조 텍스트 |
| `Glass Cyan` (#4FB3BF) | `ink.900` | 7.6:1 | ✅ | ✅ | CTA·링크 |
| `Glass Cyan` | `ink.950` | 8.1:1 | ✅ | ✅ | CTA 강조 |
| `Glass Cyan` | `ink.800` | 6.3:1 | ✅ | ✅ | 패널 내 링크 |
| `Gold Leaf` (#C9A24B) | `ink.900` | 8.2:1 | ✅ | ✅ | 커서·배지 |
| `Gold Leaf` | `ink.950` | 8.8:1 | ✅ | ✅ | 활성 탭 상단 라인 |
| `error` (#B83A46) | `ink.900` | 4.6:1 | ✅ | ✅ | 에러 메시지 |

금지 조합 (제품 UI 본문 사용 금지, 자산 영역 한정 허용):

| 전경 | 배경 | 비율 | 상태 |
|---|---|---|---|
| `Cobalt Deep` (#1B3A8C) | `ink.900` | 2.1:1 | ❌ — 본문 금지. 로고·일러스트 내부 자산 영역에서만 |
| `Burgundy` (#7A1F2B) | `ink.900` | 2.3:1 | ❌ — 본문 금지. 에러는 밝은 `#B83A46` 사용 |
| `Gold Leaf` | `ink.50` (#F5F5F0) | 2.4:1 | ❌ — 라이트 배경에서는 `error`/`ink.700`로 대체 |

**규칙 (강화)**:
- `Cobalt Deep` / `Burgundy Tessera`는 제품 UI 본문·CTA·링크에서 절대 금지. 브랜드 자산(로고 내부·Welcome 모자이크 일러스트·About 페이지 헤더)에만 허용.
- 라이트모드가 필요한 경우 `Gold Leaf`는 `ink.700`으로 대체. 라이트 배경의 금박은 탁한 머스터드로 보인다.
- `Cobalt Deep`을 다크 배경 본문에 써야 한다면 `cobalt.400` (#4F6FCF, `oklch` L 60%)로 변환. 단 Hybrid 표층에서는 Glass Cyan 우선 권장.

---

## 4. 타이포그래피

세 개의 서체로 삼각형을 만든다. 각자 목적이 명확하고 중복 없음.

### 4.1 Display / Wordmark — **Space Grotesk**

- **라이선스**: SIL OFL 1.1 (Google Fonts)
- **선정 이유**: 기하학적이되 따뜻함이 있는 grotesque. `i`의 도트·`t`의 크로스바가 모자이크 타일처럼 단단한 직사각형으로 끊어짐. `warp`·`linear`·`raycast` 라인의 현대 dev-tool 기본 톤과 동행하면서도 덜 흔함.
- **용도**: 로고 워드마크, 랜딩 hero 헤드라인, 문서 H1.
- **Weight**: `500 Medium` 우선, 디스플레이용 `700 Bold`.
- **Tracking**: 워드마크 `-2%` (-20 tracking units). 본문 크기 헤드라인 `0%`.

### 4.2 UI / Body — **Inter**

- **라이선스**: SIL OFL 1.1 (Google Fonts)
- **선정 이유**: 화면 가독성의 현대적 기준. `i`/`l`/`1` 구분 명확, opsz(optical size) 변수축 지원으로 작은 크기에서도 흐트러지지 않음. Electron 앱 UI의 de facto.
- **용도**: 앱 내부 UI 전반 (사이드바, 버튼, 메뉴, 패널 텍스트), 문서 본문.
- **Weight**: `400 Regular` 기본, `500 Medium` 강조, `600 SemiBold` 레이블.
- **Tracking**: `0%`. 12px 이하에서만 `+1%`.

### 4.3 Mono — **JetBrains Mono**

- **라이선스**: Apache 2.0
- **선정 이유**: 프로그래밍 합자(ligature) 내장, 1.2 line-height에서 터미널과 코드 블록 동시에 편안함. `Cascadia Code`와 대등하지만 Electron 사전 번들 크기에서 유리.
- **대안 fallback**: 사용자 터미널 테마 존중 — `JetBrains Mono, "SF Mono", Menlo, monospace` 순.
- **용도**: 터미널, 코드 블록, 프롬프트, CLI 출력, README 배지 내부 텍스트.
- **Weight**: `400 Regular` 기본, `700 Bold` 프롬프트 기호 강조.
- **Tracking**: `0%`. 합자 활성화 기본값 ON (사용자 설정으로 OFF 가능).

### 4.4 Type Scale (rem 기준, 1rem = 16px)

| Token | Size | Weight | Line-height | 용도 |
|---|---|---|---|---|
| `display.lg` | 4.5rem (72px) | 700 | 1.05 | 랜딩 hero |
| `display.md` | 3rem (48px) | 500 | 1.1 | 섹션 타이틀 |
| `h1` | 2rem (32px) | 600 | 1.2 | 페이지 제목 |
| `h2` | 1.5rem (24px) | 600 | 1.3 | 서브섹션 |
| `h3` | 1.25rem (20px) | 500 | 1.35 | 카드 제목 |
| `body` | 1rem (16px) | 400 | 1.55 | 본문 |
| `body.sm` | 0.875rem (14px) | 400 | 1.5 | UI 기본 |
| `caption` | 0.75rem (12px) | 500 | 1.4 | 레이블·메타 |
| `mono.body` | 0.875rem (14px) | 400 | 1.5 | 코드·터미널 |

### 4.5 워드마크 "smalti" 규칙

- **표기**: 언제나 소문자 `smalti`. 대문자화 절대 금지 (문장 첫머리여도). 이유: Outlaw 아키타입, `jq`/`starship`/`zed` 계보.
- **서체**: Space Grotesk Medium, tracking -2%.
- **`i`의 도트 처리 (Magician 장치)**: 두 개의 `i`(2번째 글자, 6번째 글자)의 도트를 **정사각형 테세라 타일**로 교체. 크기는 서체 기본 도트의 1.1배. 색상:
  - 첫 번째 `i` 도트: `Cobalt Deep`
  - 두 번째 `i` 도트: `Gold Leaf`
  → 왼쪽 `i`는 "원재료(코발트 유리)", 오른쪽 `i`는 "완성된 모자이크(금박)". 이름 자체가 브랜드 서사의 축약.
- **워드마크 최소 폭**: 48px. 그 이하에서는 심볼마크만 사용.
- **금지**: 이탤릭, 아웃라인, 그림자, 그라디언트, 회전.

### 4.6 워드마크 스케일 규칙 (R6 보강)

소형 크기에서 `i` 도트 이중색(Cobalt·Gold 사각 타일)은 오탈자(`!`/`¡`) 또는 노이즈로 오독될 위험이 있음. 스케일 구간별 규칙을 강제한다:

| 크기 구간 | `i` 도트 처리 | 색상 (R7 재매핑) | 사용처 |
|---|---|---|---|
| **≥ 20px** | 정사각 테세라 타일 (이중색) | **첫 `i` = Sky Blue `#6FC5DB`, 둘째 `i` = Crimson `#F10C45`** | 랜딩 hero, H1, 마케팅 자료, 공식 문서 표지 |
| **20px > x ≥ 16px** | 정사각 테세라 타일 (**단일색 통일**) | **Gold Leaf `#C9A24B` 단색 권장** (또는 Glass Cyan `#4FB3BF` 단일) — 대비 1순위 | 내비게이션 헤더, 카드 타이틀, 중형 배지 |
| **< 16px** | 서체 기본 원형 도트 또는 **도트 생략** | `currentColor` (단색) | 파비콘, 앱 아이콘 스몰, README 배지, 16px 인라인 텍스트 |
| **모노크롬 fallback** (프린트·1bit 아이콘) | 단일색 통일, 도트 형태 서체 기본 유지 | 흑 또는 단일 브랜드색 | 흑백 인쇄, ASCII 부팅 화면 참조 |

**R7 재매핑 근거**:
- 이전 이중색(Cobalt Deep·Gold Leaf)은 팔레트 A 계보로 제품 UI(팔레트 C)와 분리되어 있었음.
- 확정 로고 4-컬러 체계(§3.4 팔레트 D)의 **Sky Blue ↔ Crimson** 대각 축이 squircle 좌상-우하 구조와 동형. 워드마크가 앱 아이콘의 DNA를 글리프로 접히는 효과.
- Sky Blue(`#6FC5DB`)와 Crimson(`#F10C45`)은 **보색 근사**(색상환 ~180° 대응)로 이중색 인지 속도가 Cobalt·Gold 쌍보다 높다.
- Gold Leaf는 ≥20px 이중색 역할에서 해방되어 Magician 액센트(활성 탭 1px·커서) 전용으로 1% 희소성 강화.

**대체 규칙**:
- 16px 이하에서 워드마크 대신 **심볼마크(컨셉 C 단일 타일)** 사용 권장. 워드마크는 ≥ 20px에서만 존재 가치가 있다.
- 파비콘 32×32·16×16은 워드마크 금지 → 컨셉 C(Glass Cyan ↔ Gold Leaf 대각 이등분) 고정.
- README 배지(Shields.io 등 14~16px 렌더) 내부 `smalti` 텍스트는 JetBrains Mono 단일색.
- 앱 아이콘 스몰(macOS Dock 32px·Windows taskbar 24px)은 심볼마크 전용, 워드마크 레이어 금지.

**검증 체크리스트** (런칭 게이트):
- [ ] favicon.ico 16×16 실렌더 스크린샷 — `i` 도트 이중색 제거 확인
- [ ] README 배지 14px 실렌더 — 단일색 통일 확인
- [ ] macOS Dock 32px 앱 아이콘 실렌더 — 워드마크 미포함, 심볼마크 단독 확인
- [ ] 20px 워드마크 실렌더 — 이중색 도트가 타이포 노이즈가 아닌 브랜드 시그니처로 읽히는지 사용자 3명 이상 테스트

---

## 5. 로고 컨셉 3종

### 컨셉 A — **Tessera Grid + smalti** (마스터 로고)

- **형태**: 3×3 정사각 격자 (총 9개 셀). 왼쪽 상단부터 오른쪽 하단까지 대각선으로 5개 셀이 `Cobalt Deep`으로 채워져 있고, 중앙 1개 셀은 `Gold Leaf`, 나머지 3개 셀은 비어있음(배경 투명). 격자 오른쪽에 8px 간격으로 `smalti` 워드마크.
- **의미**:
  - 9칸 격자 = 모자이크의 최소 반복 단위(테세라 클러스터).
  - 비어있는 3칸 = "사용자가 자기 플러그인으로 채워라"는 초대장. (Create n Play)
  - 중앙 금박 = Magician 함량 1%.
  - 대각선 = 완성되지 않은 상태에서도 방향성이 있음 (Outlaw의 자기 경로).
- **적용**: 웹사이트 헤더, 공식 문서, 마케팅 자료, 앱 스토어 배너.
- **스펙**: 격자 전체 20×20px, 셀 6×6px + gap 1px. 워드마크와 결합 시 총 폭 ~120px × 높이 20px.

### 컨셉 B — **Prompt Glyph `[·] $`** (CLI-native 로고)

- **형태**: 좌측 대괄호 `[`, 중앙 2×2 미니 격자(금박·코발트 각 1개씩, 대각 배치), 우측 대괄호 `]`, 공백 1칸, 프롬프트 기호 `$` (또는 `»`). 전체가 JetBrains Mono 베이스. 터미널 프롬프트 프리픽스 그 자체가 로고.
- **의미**:
  - `jq`·`warp`·`starship` 계보 친화 — 이 로고는 README·터미널 화면에 바로 박아도 이물감이 없음.
  - 대괄호 안의 2×2 격자 = smalti의 축소판. "프롬프트 안에 모자이크가 있다."
  - `$`는 유닉스 혈통의 공개 선언. 엔터프라이즈·GUI IDE 진영과의 거리두기.
- **적용**: CLI 부팅 화면, 터미널 프롬프트 프리픽스, GitHub 소셜 프리뷰, 개발자 문서 헤더.
- **16px에서도 식별 가능** — 대괄호 + 2×2 = 가장 압축된 표현.

### 컨셉 C — **Single Tessera** (앱 아이콘 전용)

- **형태**: 단일 정사각 타일, 대각선으로 이등분. 왼쪽 삼각형 `Cobalt Deep`, 오른쪽 삼각형 `Gold Leaf`. 타일 가장자리에 1px 내부 테두리 `ink.100` 10% opacity로 유리 조각의 "깎인 단면" 암시. macOS squircle 프레임 안에 8% 패딩.
- **의미**:
  - 하나의 타일 = 가장 작은 단위. 앱 아이콘은 "한 조각"으로 시작해서 사용자 화면에서 "전체 모자이크"로 확장된다는 서사.
  - 대각 분할 = 이름의 두 아키타입(Outlaw 코발트 / Magician 금박)이 한 픽셀 안에서 만나는 순간.
- **적용**: macOS `.icns`, Windows `.ico`, Favicon, Docker Hub 아이콘, npm 패키지 아바타.
- **스펙**:
  - 1024×1024 (macOS `.icns` 최고 해상도) → 128×128 → 64 → 32 → 16.
  - **8px 식별성**: 대각선 이등분 컬러 블록은 8px에서도 `Cobalt`/`Gold` 두 색이 식별 가능 (실측: 4px 삼각형도 육안으로 구별됨). 이것이 이 로고가 컨셉 A/B보다 작은 크기에서 유리한 이유.
  - 내부 1px 테두리는 32px 이하에서 제거 (가시성 ↓ 흐림).

### 5.1 로고 사용 규칙

- **최소 크기**:
  - 컨셉 A (풀 로고): 120×20px
  - 컨셉 B (프롬프트): 80×16px
  - 컨셉 C (아이콘): 8×8px (파비콘 한계)
- **여백(Clear space)**: 로고 높이의 `0.5×` 모든 방향. 컨셉 A의 경우 `10px` 여백.
- **금지**:
  - 색상 변경 (Cobalt·Gold 외 사용 금지)
  - 회전·기울임·아웃라인
  - 격자 셀 개수 변경 (9칸 고정)
  - 워드마크 대문자화
  - 그라디언트·그림자·glow

---

## 6. 아이콘 시스템

### 6.1 UI 아이콘 (Lucide 기반)

- **베이스**: [Lucide Icons](https://lucide.dev) (ISC License). `vscode-icons`·`heroicons`보다 라인이 얇고 모자이크 격자 미학과 충돌 없음.
- **스트로크**: 1.5px, 라운드 캡·조인.
- **크기**: 16 / 20 / 24px 3단.
- **컬러**: `ink.100` 기본, hover `Glass Cyan`, active `Gold Leaf`.

### 6.2 플러그인 아이콘 (smalti만의 것)

플러그인은 "타일"이므로, 플러그인 아이콘 슬롯은 **24×24px 정사각, 모서리 2px 라운드, 격자 내부 구조 허용**.

- **기본 그리드**: 4×4 서브셀 (각 6px).
- **컬러 팔레트**: 플러그인 작성자가 자유롭게 지정하되, smalti는 4개의 "퍼블릭 테세라 팔레트"를 프리셋 제공:
  - `tessera.cobalt` (#1B3A8C 계열 4톤)
  - `tessera.gold` (#C9A24B 계열)
  - `tessera.burgundy` (#7A1F2B 계열)
  - `tessera.cyan` (#4FB3BF 계열)
- **제약**: 플러그인 아이콘은 pictogram이어도 되고 추상 격자여도 되지만, **24px squircle 프레임 + 내부 1px 테두리**는 시스템이 자동 적용해서 통일감 유지.

### 6.3 네거티브 — 사용하지 않는 것

- 스큐어모픽, 3D, 그라디언트 아이콘 ❌
- 이모지 기반 아이콘 ❌ (Outlaw 톤 위반)
- 브랜드 아이콘(GitHub·NPM 등) 외 "귀여운" 일러스트 ❌

---

## 7. 모션·인터랙션 프린시플 (5개)

### 7.1 Tessellate-in (조립 모션)

- **원칙**: 새 패널·탭·플러그인이 등장할 때 **페이드인 금지**. 대신 3×3 격자의 9개 셀이 **각각 80ms 간격으로 순차 등장** (총 ~400ms). 이것이 smalti의 시그니처 트랜지션.
- **용도**: 앱 부팅 직후 첫 프레임, 플러그인 설치 완료, 새 세션 생성.
- **이징**: `cubic-bezier(0.2, 0, 0, 1)` (material emphasized decelerate).

### 7.2 Gold Pulse (상태 전환)

- **원칙**: AI 에이전트가 "생각 중"일 때, 프롬프트 커서가 `Gold Leaf`로 1.2s 주기 호흡(opacity 0.6 → 1.0 → 0.6). 대기 상태로 돌아가면 `ink.100`으로 복귀.
- **용도**: 에이전트 streaming, 플러그인 생성 중, Rust 코어 계산 중.
- **금지**: 다른 색 펄스 금지. 금박 펄스는 오직 "마법이 일어나고 있다"의 신호.

### 7.3 Grout Focus (포커스 링)

- **원칙**: 포커스된 요소의 테두리는 외곽 1px `Glass Cyan` + 내부 1px 투명 간격. 모자이크 타일 사이의 회반죽(grout) 틈을 연상.
- **접근성**: WCAG 2.1 SC 2.4.7 준수. keyboard-only 사용자 필수.

### 7.4 No Bounce (절제)

- **원칙**: `elastic`·`overshoot`·`spring with bounce` 금지. Outlaw는 귀엽지 않다. 모든 모션은 `ease-out` 또는 `emphasized decelerate`.
- **최대 지속시간**: 400ms. 그 이상은 방해.

### 7.5 Reduced Motion 완전 존중

- **원칙**: `prefers-reduced-motion: reduce` 설정 시 Tessellate-in과 Gold Pulse 모두 즉시 상태 변경으로 대체. 품질 저하 없음.

---

## 8. 적용 예시 (텍스트 묘사)

### 8.1 macOS 앱 아이콘

컨셉 C (Single Tessera) 채용. 1024×1024 캔버스, squircle 안쪽 8% 패딩. 대각선은 좌상단(0,0) → 우하단(max,max)이 아니라 **좌하단(0,max) → 우상단(max,0) 방향**. 왼쪽 아래 삼각형 `Cobalt Deep`, 오른쪽 위 삼각형 `Gold Leaf`. 대각선 위에 **1px `ink.100` 10% opacity 라인** — 유리 조각의 절단면. 그림자 없음. Dock에서 다른 네온 앱들 사이에서 "고대 유물 한 점"처럼 무겁게 앉음.

### 8.2 터미널 프롬프트 프리픽스

```
[·] smalti ~/projects/my-app  main  $
```

- `[·]`의 대괄호는 `ink.300`, 중앙 점은 `Gold Leaf` 펄스.
- `smalti`는 `Cobalt.400` (다크 배경용 밝은 코발트).
- 경로는 `ink.100`, git 브랜치는 `Glass Cyan`.
- 상태 변경(에이전트 작업 중) 시 `[·]` → `[◐]` 회전 애니메이션.

### 8.3 랜딩 페이지 Hero

배경: `ink.900`에 미세한 노이즈 텍스처 2% opacity (오래된 성당 벽의 마모감).
좌측 60% 영역:
```
smalti                          ← Space Grotesk 72px, ink.100
                                  (첫 i 도트 = Cobalt, 둘째 i 도트 = Gold)

an IDE you lay,                 ← 48px, ink.300
tessera by tessera.

$ brew install smalti           ← JetBrains Mono 20px, Glass Cyan
```
우측 40%: 3×3 격자가 `Tessellate-in` 모션으로 조립되는 라이브 데모 루프. 10초마다 다시 해체·재조립.

### 8.4 README 배지

```markdown
![smalti](https://img.shields.io/badge/smalti-%231B3A8C?style=flat-square&logo=data:image/svg+xml;base64,...&labelColor=%230A0B10)
```

- 좌측 레이블: `ink.950` 배경, smalti 아이콘 (컨셉 C 축소판, 14px).
- 우측 값: `Cobalt Deep` 배경, `ink.100` 텍스트.
- flat-square 스타일 강제 (둥근 배지 금지 — 사각 타일 유지).

### 8.5 CLI 부팅 ASCII Art

터미널에서 `smalti` 명령을 alias 없이 처음 실행하면 1회 출력:

```
  ░▒▓ smalti ▓▒░
  ┌─┬─┬─┐
  │█│·│█│    an IDE you lay,
  ├─┼─┼─┤    tessera by tessera.
  │·│◆│·│
  ├─┼─┼─┤    v0.1.0  ·  outlaw+magician
  │█│·│█│    https://smalti.dev
  └─┴─┴─┘
  $ _
```

- `█` 블록: `Cobalt Deep` 배경색 출력 (ANSI 24bit).
- `◆` 중앙: `Gold Leaf`.
- `·`: `ink.300` (빈 셀, 사용자가 채울 자리).
- 상단 `░▒▓`: 유리의 반투명 그라디언트 ASCII 흉내.
- 부팅 첫 1회 이후는 생략 (`~/.smalti/booted` 플래그). 반복 노출은 Outlaw 톤 위반.

---

## 9. 기존 AIDE emerald 컬러 계승 여부

### 현황
- AIDE의 기존 액센트 컬러는 emerald green (#10B981 계열 — Tailwind `emerald-500` 추정).
- 근거: `docs/ideation/rebrand-partide.md` Phase C 체크리스트의 "기존 emerald 계승 여부 결정" 항목.

### 옵션 비교

| | **계승** (emerald 유지) | **폐기** (비잔틴 팔레트 전면 교체) |
|---|---|---|
| **장점** | 기존 사용자 시각 연속성. 브랜드 전환 비용 ↓. 다크모드에서 검증된 가독성. | smalti 어원(비잔틴 유리)과 시각 일치. 차별화 (emerald는 `supabase`·`vercel` 등에 포화). Outlaw 톤 강화. |
| **단점** | smalti 어원과 무관 (emerald는 녹색 보석, 모자이크와 연결 약함). `supabase`/`evan-you` 등과 색상 충돌. Outlaw 톤보다는 Innocent/Explorer에 가까움. | 리브랜딩 피로감. 기존 스크린샷·문서 전량 재작업. 일부 사용자 "색이 어둡다"는 반응 가능. |
| **비용** | 낮음 — CSS 변수 유지, 로고만 교체. | 중간 — 전체 토큰 재정의, 스크린샷 재촬영, 문서 업데이트. |

### 권장: **폐기**

근거:
1. **네이밍-비주얼 정합성이 리브랜딩의 핵심 목표**. AIDE → smalti 전환의 이유가 "Android IDE와 구별 + 조립 메타포 강화"인데, 색상이 그대로면 시각적 리브랜딩이 없음.
2. **emerald는 Caregiver·Explorer 아키타입** 색. Outlaw 70%와 톤 충돌.
3. **비용 차이가 결정적이지 않음** — Rust 코어 이전 중이어서 어차피 대규모 변경 시점. 같이 처리하는 것이 자연스럽다.

**단, 이관 전략**: v0.1.0 릴리즈 노트에 "farewell emerald, hello cobalt" 한 줄 추가 — 기존 사용자에게 의도된 변경임을 알림. emerald는 `success` 토큰의 `#4A8A5C`(산화구리 녹청)로 희미하게 계승.

---

## 9.5 디자인 시스템 (design.pen `smalti — Design System` 프레임, id `JkG4U`)

smalti Hybrid Dark/Light 10개 시안에서 반복되던 요소를 `design.pen`의 reusable 컴포넌트로 추출하고, pencil `variables`에 테마 쌍(dark/light)으로 바인딩했다. 향후 새 화면은 이 시스템에서 조립한다.

### 9.5.1 Variables (theme axis: `mode: [dark, light]`)

| 변수 | Dark | Light | 역할 |
|---|---|---|---|
| `$smalti-canvas` | `#0A0B10` | `#F5F5F0` | 최상위 배경 |
| `$smalti-surface` | `#11131B` | `#EAEAE4` | 사이드바·타이틀바·터미널 배경 |
| `$smalti-raised` | `#1B1E2A` | `#DEDED6` | 카드·스테이터스바 |
| `$smalti-divider` | `#2A2E3D` | `#C8C8BE` | 구분선 |
| `$smalti-ink-body` | `#E6E7ED` | `#11131B` | 본문 텍스트 |
| `$smalti-ink-muted` | `#9BA0B0` | `#5A5F6E` | 보조 텍스트 |
| `$smalti-cyan` | `#4FB3BF` | `#2B8A94` | 프롬프트·CTA·포커스 |
| `$smalti-gold` | `#C9A24B` | `#A8802A` | 커서·활성 탭 1px (R7: "new" 배지 역할은 crimson으로 이관) |
| `$smalti-error` | **`#F10C45`** (R7 승격) | **`#C8083A`** (R7 승격) | 에러 출력 — Crimson과 동일값 (팔레트 D 역수입) |
| `$smalti-terminal-bg` | `#11131B` | `#EAEAE4` | 터미널 pane (surface와 동일값) |
| **`$smalti-sky-blue`** (R7 신규) | `#6FC5DB` | `#4A9FB8` | 팔레트 D Sky Blue — 워드마크 `i` 첫 도트(≥20px), 로고 일러스트, 마케팅 액센트 |
| **`$smalti-crimson`** (R7 신규) | `#F10C45` | `#C8083A` | 팔레트 D Crimson — 워드마크 `i` 둘째 도트(≥20px), "new" 배지, critical CTA |
| **`$smalti-black`** (R7 신규) | `#0D0D10` | `#1B1B20` | 팔레트 D Obsidian Black — 로고 자산 Obsidian 타일, 일러스트 배경 |

네이밍 컨벤션: `$smalti-<레이어>` (surface 계) 또는 `$smalti-<의미>` (ink, cyan, gold, error). AIDE 레거시 변수(`--background` 등)는 별도 유지한다 — smalti 네임스페이스가 충돌하지 않도록 `smalti-` 프리픽스를 고수.

### 9.5.2 추출된 재사용 컴포넌트

| 카테고리 | 컴포넌트 | pencil ID | 비고 |
|---|---|---|---|
| Brand | smalti-Logo | `vVdpX` | 3×3 테세라 + 워드마크 |
| Brand | smalti-Wordmark | `nOoe5` | "smalti" 텍스트 단독 |
| Brand | smalti-Logo-Small | `xosdB` | 64px 대각 이등분 앱 아이콘 |
| Brand | smalti-MosaicGrid-3x3 | `PKxja` | 3×3 테세라 격자 |
| Chrome | smalti-TitleBar | `fbb5h` | 트래픽 라이트 + 프롬프트 프리픽스 |
| Chrome | smalti-TabBar | `H8sZT` | 탭 컨테이너 |
| Chrome | smalti-Tab | `Cmbk8` | 활성 탭 (상단 gold 1px) |
| Chrome | smalti-StatusBar | `7Z2Vk` | branch · shard count · agent |
| Terminal | smalti-PromptLine | `4ac2B` | `[smalti] ~/path $` + 커서 |
| Content | smalti-ShardIcon | `QmPz0` | 2×2 테세라 |
| Content | smalti-PluginCard | `35BEn` | ShardIcon + 이름 + 설명 + 메타 |
| Control | smalti-Button-Primary | `6mKmv` | Cyan CTA |
| Control | smalti-Button-Ghost | `GzhfF` | Cyan 외곽선 |
| Control | smalti-Badge-New | `tI5AW` | Gold "new" 배지 |

미추출(우선순위 후순위, 향후 보강):
- `smalti-Sidebar` (ATELIER 트리 구조) — 파일 트리 데이터 바인딩 설계 필요
- `smalti-TerminalPane` (프롬프트 + 출력 스크롤) — 출력 라인 슬롯 구조 설계 필요
- `smalti-CodeBlock` (백틱 인라인 코드) — inline vs block 변형 결정 필요

### 9.5.3 Dark/Light 전환 규칙

- 최상위 프레임에 `theme: {mode: "dark"}` 또는 `theme: {mode: "light"}` 지정 → 하위 모든 `$smalti-*` 변수가 자동 전환.
- 하위 프레임은 별도 `theme` 지정 금지 — 최상위 모드를 상속해야 terminal pane도 함께 전환된다 (작업 1의 원칙: 라이트 시안 내부에 dark 터미널 혼재 금지).
- 컴포넌트 인스턴스는 variable 바인딩된 속성만 포함하므로 override 없이 테마 전환만으로 두 모드 모두 정상 렌더.

### 9.5.4 사용 예시 — `ref` + descendants override

```
// 새 plugin card 인스턴스
pc = I(parent, {type: "ref", ref: "35BEn"})
U(pc + "/XKgbj", {content: "tail-errors"})         // 이름 텍스트 override
U(pc + "/ucad4", {content: "tail build logs."})    // 설명 override
U(pc + "/jBE55", {content: "terminal-hook · placed"})
```

기존 프레임의 반복 요소를 instance로 교체하는 대규모 마이그레이션은 이 단계에서는 실행하지 않았다 — 10개 시안의 레이아웃이 각기 다른 padding/gap 조합을 쓰고 있어 단순 치환 시 레이아웃 드리프트가 발생할 위험이 높고, 현재 시안들은 이미 시각적으로 안정된 상태다. 향후 새 화면 작업 시에만 `ref` 컴포넌트를 사용하고, 기존 프레임은 수정이 필요할 때 incremental하게 교체한다.

### 9.5.5 작업 1 반영 — Light 터미널 통일

이전 "터미널만 다크 유지" 예외(구 §3.3) 철회에 따라 `ndHjM`(Light Theme)의 TerminalArea(`HqzWY`)와 `P0ZSz`(Split 2×1 Light)의 두 pane(`Fwdas`, `Yu4gb`)의 모든 색상을 Light 매핑으로 일괄 치환 완료. 검증: 스크린샷 실측에서 `#EAEAE4` 배경 + `#11131B` 본문 + Cyan/Gold 액센트가 의도대로 렌더. WCAG AA 4.5:1 이상 본문 확보(ink 17:1), Cyan 프롬프트는 AA Large로 3.7:1 통과, Gold 커서는 장식 요소로 분류.

### 9.5.6 2026-04-24 워딩 롤백 로그 — 공예 어휘 → AIDE 원본 어휘

**배경.** smalti Hybrid 시안의 제품 내부 워딩(CLI 출력·폴더명·파일명·상태바·플러그인 카드명)을 원본 AIDE 어휘로 일괄 롤백. 사용자 결정에 따라 공예 메타포(mosaic/shard/atelier/quarry/cut/inlay/gild 계열)는 **브랜드 스토리·마케팅 레이어 전용**으로만 분리하고, 제품 UI·CLI 표면은 일반 개발 용어로 유지해 신규 사용자 온보딩 마찰을 제거한다.

**롤백 범위 — 팔레트 C Hybrid 10개 프레임.**

| 프레임 ID | 이름 | 주요 롤백 항목 |
|-----------|------|----------------|
| `ie0fK` | Dark Theme (Hybrid) | TitleBar 프롬프트, EXPLORER 헤더, `src/`/`main/`/`index.ts`/`handlers.ts`/`plugins/` 트리, `$ claude --dangerously-skip-permissions` · `✓ Claude Code is ready` · `> AIDE initialized. How can I help?` · `make me a plugin that cleans unused imports` 터미널, `git: feature/init` · `[0] plugins active` · `claude-opus-4-6` 상태바 |
| `wfrq1` | Welcome (Hybrid · Dark) | WORKSPACES 헤더, `Recent Projects`, `new project`, `rise-k-backend`/`kneefresh-backend`/`aide` 프로젝트, 슬로건 "an ai-native ide for cli agents.", `Open Repository`/`New Project` 버튼, `v0.1.0` 버전, `[0] plugins active`. "smalti" 워드마크·`$ brew install smalti` 유지 |
| `YYrar` | Split 2×1 (Hybrid · Dark) | PLUGINS 헤더, `tail-errors`/`git-status`/`claude-agent`/`plugin-generator` 사이드바, 탭 `◆ 1 — claude`, 좌 pane `$ claude ~/repos/aide --dangerously-skip-permissions` + 12 plugins active 목록, 우 pane `$ claude > summarize git diffs` + generating plugin 로그, 상태바 `git: feature/init` · `claude` |
| `gFqdf` | Quarry → Plugins (Hybrid · Dark) | Hero `plugins` + 설명 "browse the plugin registry…", 검색 placeholder `search plugins…`, 8개 카드(tail-errors / git-status / claude-agent / notification-center / plugin-generator(new) / dark-theme-plus / focus-mode / gemini-agent), `+ create plugin` CTA, 상태바 `registry: 1,284 plugins` · `aide plugins --help` |
| `dvyYS` | Logo Exploration (Hybrid · Dark) | 브랜드 자산 설명 전용. 공예 워딩 없음 — 캡션 "ink · glass cyan · gold leaf (1%)", 컨셉 A/B/C 라벨, 한글 시각 설명, "smalti" 워드마크 모두 유지 |
| `ndHjM` / `EYxm3` / `P0ZSz` / `3A2Ez` / `ku88a` | Light 5종 | 위 Dark 5종과 동일 항목을 Light 팔레트로 동일하게 롤백. 색·레이아웃 변경 없음 |

**디자인 시스템 컴포넌트(`JkG4U` 하위 reusable 14개) 내부 텍스트 롤백.**
- `fbb5h` (TitleBar) → `> aide`
- `Cmbk8` (Tab Active) → `◆ 1 — claude`
- `7Z2Vk` (StatusBar) → `git: feature/init` · `[0] plugins active` · `claude-opus-4-6`
- `4ac2B` (PromptLine) → `$ claude ~/repos/aide $`
- `35BEn` (PluginCard) → `tail-errors` / "tail build logs, highlight failures." / `terminal-hook · active`
- `6mKmv` (Button-Primary) → `create plugin`
- `GzhfF` (Button-Ghost) → `install`
- 컴포넌트 리소스명(`smalti-TitleBar` 등)과 워드마크/로고 컴포넌트(`smWord`, `smLogo`, `smIco`) 내부 "smalti" 글자는 **유지**

**유지 항목(롤백 X).**
- 팔레트 C 색(Glass Cyan `#4FB3BF`/`#2B8A94`, Gold `#C9A24B`/`#A8802A`, Ink 계열, Burgundy 에러, Verdigris 성공)
- Light/Dark 테마 변형 구조·레이아웃·간격·컴포넌트 계층
- 디자인 시스템 variables(`$smalti-canvas` 등 네임스페이스는 유지하되 값 변경 없음)
- Light 터미널 통일(§9.5.5)
- 브랜드명 **smalti** 자체(워드마크·앱 아이콘·`brew install smalti` 명령)
- 팔레트 A Dark 5개(`CKw84`/`CfMhE`/`Tgv1O`/`F6O7D`/`WyJHK`) — 브랜드 자산 스토리용으로 공예 어휘 원형 보존

**추출한 원본 AIDE 문구 요약(원본 프레임 `PEZED`·`5t0ix`·`m4oT1`·`ZbNIR`에서 확인).**
- 프롬프트 프리픽스: `> aide`
- 사이드바 헤더: `// explorer` / `WORKSPACES` / `PLUGINS`
- 파일트리: `src/` → `main/` → `index.ts`, `handlers.ts`, 최상위 `plugins/`
- 터미널 4줄: `$ claude --dangerously-skip-permissions` → `✓ Claude Code is ready` → `> AIDE initialized. How can I help?` → `make me a plugin that cleans unused imports` → `Reading src/auth/index.ts...`
- 프로젝트 목록: `rise-k-backend` · `kneefresh-backend` · `rogue-shelf` · `aide` · `02_심포지엄`
- Welcome Hero: `> aide_` + `AI-Driven IDE for CLI Agents` + `Open Repository`/`New Project`
- 상태바: `git: feature/init` · `[0] plugins active` · `claude-opus-4-6`
- 플러그인 생성 UI: `GENERATE PLUGIN` / `Plugin name...` / `Describe what this plugin should do...` / `Generate Plugin`
- 샘플 플러그인: `git-helper`("Git workflow automation") / `file-search`("Semantic file search")

**검증.** 주요 5프레임(`ie0fK` Dark Theme, `wfrq1` Welcome Dark, `gFqdf` Plugins Dark, `YYrar` Split Dark, `ndHjM` Light Theme, `JkG4U` Design System)을 pencil `get_screenshot`로 시각 확인. AIDE 용어가 기대 위치에 렌더되고 색·레이아웃 드리프트 없음을 확인.

**후속 과제.**
- `03_verbal_identity.md` CLI 이중 레일(표층 `install`/`remove`/`run` vs 공예 별칭 `inlay`/`pry`/`fire`)에서 **표층을 제품 표준**으로, 공예 별칭은 docs 에그/마케팅 카피 전용으로 격리 명시.
- 마케팅 랜딩·README hero·브랜드 스토리 문서에서만 공예 메타포(mosaic/shard/quarry) 재사용.

### 9.5.7 2026-04-24 R7 로그 — 확정 로고 리브랜드 반영

**배경.** 4-컬러 glossy squircle 앱 아이콘(`docs/brand/smalti-icon-source-1024.png`)이 리브랜드 프로세스 B/C 단계에서 확정됨. 티켓 B1/B2/B4/C1/C2/C3 통합 실행 결과를 문서·design.pen에 반영.

**문서 변경 (04_visual_identity.md).**
- 문두 R7 변경 요약 블록 추가.
- §3.3 팔레트 C Semantic 표에서 `error` 값을 `#B83A46` → `#F10C45`(Crimson)로 승격, `critical-accent` 행 신설(Crimson 이중 역할). 역수입 결정 근거 블록 추가.
- §3.4 팔레트 D (Icon-4Color) **신설** — 4색 HEX·RGB·그라디언트 범위·로고 위치·WCAG AA 실측·사용 규칙·4-팔레트 매트릭스.
- §3.4.1 팔레트 적용 지도 표에 앱 아이콘·로고 컨셉 C·에러/배지 행 추가.
- §4.6 워드마크 스케일 규칙 ≥20px 이중색을 **Sky Blue `#6FC5DB` · Crimson `#F10C45`** 로 재매핑. R7 재매핑 근거 블록.
- §9.5.1 variables 표에 `$smalti-sky-blue` / `$smalti-crimson` / `$smalti-black` 3개 신규 행, `$smalti-error` 값 Crimson 동일값으로 변경. `$smalti-gold`는 `new` 배지 역할 제거 주석.

**design.pen 변경.**
- **Variables (document 레벨)**: `smalti-sky-blue` (dark `#6FC5DB` / light `#4A9FB8`), `smalti-crimson` (dark `#F10C45` / light `#C8083A`), `smalti-black` (dark `#0D0D10` / light `#1B1B20`) 신규. `smalti-error` 값을 `#F10C45`/`#C8083A`로 승격 (Crimson과 동일값, 의미적 alias).
- **`xosdB` (smLogo-Small / 64px 앱 아이콘 컴포넌트)**: 기존 2-children(`TU7wS` cyan rect + `FLFgp` gold path)을 전부 삭제하고 프레임 fill을 `{type:"image", url:"./docs/brand/smalti-icon-source-1024.png", mode:"fill"}` 이미지 필로 교체. cornerRadius 14.
- **Logo Exploration 3프레임** (`WyJHK` Dark Byzantine / `dvyYS` Dark Hybrid / `ku88a` Light Hybrid) **컨셉 C 영역**: 기존 Cobalt(또는 Cyan)↔Gold 레거시 이등분 타일(`qHvh3`/`7pdvG`/`UMgTJ`) 제거 후 `docs/brand/smalti-icon-source-1024.png` 이미지 필 frame 140px squircle(cornerRadius 28)으로 교체. 캡션 텍스트("single tile — app icon (final)" / "4-컬러 squircle (sky blue · black · gold · crimson). 확정 로고.") 업데이트. 헤더 부제도 "four concepts · sky blue … · crimson …"로 재기재.
- **Welcome Hybrid 2프레임** (`wfrq1` Dark / `EYxm3` Light) **LogoBlock**: 기존 3×3 TesseraGrid (`uumX1`/`wbCu0` + 9개 ink 자식)를 전부 삭제하고 64×64 이미지 필 squircle(cornerRadius 14)로 교체. "smalti" 워드마크 텍스트는 그대로 유지(96px Space Grotesk Medium).
- **`tI5AW` (smalti-Badge-New)**: fill을 `$smalti-gold` → `$smalti-crimson`으로 교체, 내부 "new" 텍스트 fill을 `$smalti-canvas`(다크에서 어두운 자기 배경색) → `#FFFFFF`로 교체해 Crimson 위 4.6:1 대비 확보.

**검증.**
- `get_screenshot(xosdB)`: 4-컬러 squircle 정상 렌더 — Sky Blue 좌상 / Obsidian 우상 / Gold 좌하 / Crimson 우하, cornerRadius 14 적용 확인.
- `get_screenshot(dvyYS)`: Logo Exploration Hybrid Dark 컨셉 C가 레거시 이등분 제거되고 확정 squircle 단독 표시, 캡션 업데이트 반영.
- `get_screenshot(wfrq1)`: Welcome Hybrid Dark 중앙 로고가 `[4-컬러 squircle] smalti` 조합으로 선명 렌더. 슬로건·CTA·`$ brew install smalti` 라인 영향 없음.

**유지 항목 (R7에서 건드리지 않은 것).**
- AIDE 원본 21개 프레임(`PEZED`/`5t0ix`/`m4oT1`/`ZbNIR` 등).
- 팔레트 A Dark 5개 프레임(`CKw84`/`CfMhE`/`Tgv1O`/`F6O7D`/`WyJHK` 중 A 영역).
- smalti-Logo (`vVdpX`) 대형 브랜드 마크의 3×3 테세라 그리드 — 중앙 Gold 1칸의 4-컬러 refresh는 검토 보류(후속 판단 필요).
- Hybrid 10프레임의 터미널 프롬프트 워딩 `> aide` — R7은 로고·색만 다루며 워딩 롤백은 이미 §9.5.6에서 완료됨.
- 레거시 컨셉 C 스케치 별도 프레임 아카이브는 이번 회차에 생성하지 않음(3개 프레임 내부에서 직접 교체, 기존 sC children만 삭제).

**후속 판단 필요.**
- smalti-Logo 대형(`vVdpX`) 3×3 테세라 중앙 칸을 4-컬러 미니어처로 refresh할지 여부.
- Crimson을 에러 + critical-accent 두 역할에 동시 배정한 설계의 사용자 인지 실측(동시 출현 빈도 저위험 가정).
- 라이트 테마 Welcome 프레임(`EYxm3`)에서 이미지 아이콘의 밝은 배경 위 대비(squircle 내 Obsidian 타일이 자연스러운 앵커 역할을 하므로 별도 변형 아이콘 불필요하다고 판단, 실측 권장).

### 9.5.8 Workspace Active State (이슈 #108 대응)

**배경.** GitHub 이슈 #108 — "현재 워크스페이스가 어떤 건지 명확히 보이지 않음". 실 제품의 워크스페이스 네비게이션 항목들이 동일한 surface 톤으로만 렌더되어 active 구분이 부재. 팔레트 C Hybrid 시각 언어로 3-레이어 active 시스템 정식화.

---

#### [v1 — wave5/B8, 초기 설계] 3-레이어 스펙 (히스토리 보존)

| 레이어 | Dark | Light | 규격 | 역할 |
|---|---|---|---|---|
| 좌측 accent bar | `$smalti-cyan` `#4FB3BF` | `#2B8A94` | width 3px, height = 행 높이 full, 행 왼쪽 끝 flush | 가장 강한 active 시그널 — 주변시(peripheral vision)만으로도 인지 |
| 행 배경 tint | `rgba(79,179,191,0.10)` `#4FB3BF1A` | `rgba(43,138,148,0.12)` `#2B8A941F` | 행 전체 overlay | raised 위 미묘한 tint — 판독성 유지하며 구분 추가 |
| 아바타 링 | `$smalti-gold` `#C9A24B` | `#A8802A` | 2px stroke outside | "선택됨"의 촉각적 강조 — Magician 30% 골드 액센트를 active에 배속 |

**[v1 폐기 사유]** 사용자 피드백 (wave5/B8 후속): accent bar + gold ring + cyan tint의 3-레이어 조합이 "촌스럽다"는 직접 피드백. 원인 분석: 좌측 accent bar는 구식 IDE 패턴(2010년대 VS 스타일)의 잔재이며, gold ring과 cyan tint의 2-색 동시 강조가 시각적 과부하를 유발. 현대 IDE(VS Code ≥1.80, Cursor, Zed)는 모두 surface elevation + 단색 tint만 사용.

---

#### [v2 — wave5/B8 후속, 현행 적용] Sky Blue 단일 토큰 스펙

**채택 옵션: D 변형** — bar 완전 제거 + Sky Blue `#6FC5DB` tint/15 + `border border-smalti-skyblue/35` outline.

| 레이어 | Dark | 규격 | 역할 |
|---|---|---|---|
| 행 배경 tint | `$smalti-skyblue/15` `rgba(111,197,219,0.15)` | 행 전체 fill | surface lift — 주변 inactive 행 대비 명확한 분리 |
| 행 outline | `$smalti-skyblue/35` `rgba(111,197,219,0.35)` | 1px border, 행 외곽 | tint만으로 부족한 윤곽 강조. bar보다 훨씬 조용한 시그널 |
| 아바타 ring | `$smalti-skyblue` `#6FC5DB` | 2px ring, ring-offset 1px | tint·border와 동일 색상 계열로 단일화. Gold 분리 → 불필요한 2-색 긴장 해소 |

**단일 토큰 선택 근거.**
- Cyan `#4FB3BF`는 터미널 프롬프트·에이전트 활성 상태 등 "동작 중" 시맨틱에 이미 배정됨. Active selection에 재사용하면 "이 워크스페이스가 실행 중인가 / 선택된 것인가?" 모호해짐.
- Sky Blue `#6FC5DB`는 §9.3에서 선언된 보조 강조 토큰으로, "정적 선택"에 배정하기 적합한 톤 (더 차갑고 조용함).
- Gold 제거: Gold는 §3.3 Magician 아키타입의 30% 액센트로 예약. Active selection처럼 반복 출현하는 상태에 과잉 사용하면 희소성(scarcity) 훼손.

**아바타 사이즈 통일 (피드백 #1, #2 대응).**
- Expanded 모드 구 사이즈: `w-4 h-4 rounded text-[9px]` (16px) — too small.
- Collapsed 모드 구 사이즈: `w-7 h-7 rounded-[6px]` (28px) — 정상.
- **현행**: 양쪽 모두 `w-7 h-7 rounded-[6px] text-[11px]`로 통일. expanded/collapsed 전환 시 아바타 크기 점프 없음.

**Inactive / Hover / Active 상태 머신.**
- **Inactive**: `fill: $smalti-raised` (`#1B1E2A`). `border: transparent`. 평이한 baseline.
- **Hover**: `fill: $aide-surface-elevated`. `border: transparent`. accent 없음.
- **Active**: `bg-smalti-skyblue/15` + `border border-smalti-skyblue/35` + avatar `ring-2 ring-smalti-skyblue`. 단일 색 계열, 과부하 없음.

**WCAG AA 대비 실측 (Dark, v2).**
- Sky Blue `#6FC5DB` on raised `#1B1E2A` → 5.31:1 ✅ (non-text 3:1 요구, AA 텍스트 4.5:1도 통과).
- border `rgba(111,197,219,0.35)` blended → 가시성 보조 역할 (대비 요건 적용 대상 아님, 장식 테두리).
- Ink-body `#E6E7ED` on tint-blended 배경 `≈ #1E2230` → 13.4:1 ✅ (tint 15%이므로 raised 대비 변화 미미).

**Crimson 사용 금지 명시.** Active state에 Crimson `#F10C45`를 사용하지 않는다 — Crimson은 §3.3에서 **error + critical-accent**(`new` 배지) 전용으로 예약됨. 워크스페이스 선택은 "에러"도 "긴급"도 아니므로 skyblue 단일 조합으로 한정한다.

**design.pen 현황 (v1 기준, v2 반영 미완).**
- `smalti-WorkspaceRow` (id `784E0`, reusable) — inactive baseline 그대로 유효.
- `smalti-WorkspaceRow-Active` (id `DJPKf`, reusable) — v1 3-레이어(cyan bar + cyan tint + gold ring) 상태. **v2로 업데이트 필요**: bar 제거, fill → `skyblue/15`, ring → skyblue 단색.
- 업데이트 시점: 다음 design.pen 편집 세션에서 처리 예정 (사용자 검토 후).

**후속 판단 필요.**
- design.pen `DJPKf` 컴포넌트를 v2 스펙으로 실제 갱신 (fill/border/ring 토큰 교체, accent bar child 제거).
- 동일 active 스타일을 탭/파일 탐색기의 선택 상태와 어떻게 차별화할지 (현재 탭은 `$smalti-surface` fill만, 파일 선택은 `$smalti-divider` fill. 워크스페이스 active가 더 강한 시그널 = 정당한 계층).
- Light 테마 대응 토큰 결정 필요 (v2에서 Light 값 미확정).

---

## 10. 다음 팀원(아이덴티티검증자)에게 전달

- **전체 비주얼 아이덴티티 문서**: 이 파일 (`_workspace/04_visual_identity.md`)
- **교차 검증 요청 항목**:
  1. 비잔틴 메타포가 `01_brand_strategy.md`의 Outlaw+Magician 아키타입과 정합한가?
  2. 팔레트 A의 코발트 블루가 `00_input.md`의 "jq·warp·zed 톤"과 충돌하지 않는가? (본 문서 §3.3에서 정당화 시도, 재검토 권장)
  3. 로고 컨셉 3종 중 앱 아이콘(컨셉 C)이 8px에서 실제 식별 가능한지 실측 필요.
  4. emerald 폐기 결정이 너무 급진적인지, v0.1.0 대신 v0.2.0까지 병행 운영할지 전략 판단.
  5. "smalti" 워드마크의 `i` 도트 이중 색상(코발트+골드) 처리가 소형 크기에서 노이즈로 보이는지 실측.

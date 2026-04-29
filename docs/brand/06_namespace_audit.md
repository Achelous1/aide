# smalti 네임스페이스·상표 실조회 보고

조회일: 2026-04-24
조회 방법: WebSearch + `whois` (네트워크 DNS 확인) + WebFetch
조회 한계: 샌드박스에서 npmjs.com / pypi.org / crates.io / tsdr.uspto.gov / tmdn.org / 개별 smalti.* 사이트는 직접 HTTP fetch 차단(403·ECONNREFUSED·DNS unresolved). 해당 소스는 검색엔진 인덱스 결과로 대체 판단.

---

## 1. 요약 판정

**🔴 RED — 단독 채택 비권장**

한 줄 근거: `smalti`는 이탈리아어로 "에나멜/네일폴리시/모자이크용 유리 큐브"를 뜻하는 **일반명사**로 이탈리아·EU 화장품·공예 업계에서 광범위하게 상업적으로 사용 중이고, `smalti.com`(모자이크 용품 업체) + GitHub `smalti` 핸들(Tymofii Smirnov)이 이미 선점되어 있으며, 주요 개발자 gTLD(.dev .io .app .ai .sh .codes .tools .build .run .net .org) **전부 등록 완료** 상태입니다. 소프트웨어 카테고리 미사용 확증이 부족하고 유럽 Class 3 상표 리스크(사전 조사)가 해소되지 않아 법률 자문 없이 단독 채택은 위험합니다.

---

## 2. 패키지 호스팅

| 플랫폼 | URL | 상태 | 소유자 | 비고 |
|---|---|---|---|---|
| npm | npmjs.com/package/smalti | **추정 미점유** | — | WebFetch 403, 검색 결과에 `smalti` 패키지 없음 (smelte·smolai·smali 등만 노출). 직접 확인 권장. |
| npm scope | npmjs.com/~smalti, @smalti | **미확인** | — | WebFetch 403. 직접 확인 필요. |
| PyPI | pypi.org/project/smalti | **추정 미점유** | — | 검색 결과에 smalti 없음 (smali, pysmt 등만). WebFetch 대상 오류 반환. |
| crates.io | crates.io/crates/smalti | **추정 미점유** | — | 검색 결과 무. Rust 이전 고려시 선점 유효. |
| GitHub user | github.com/smalti | **점유 🔴** | **Tymofii (Timothy) Smirnov** | 7 repo, 대표 repo `gmock-win32` (C++). 동일 org 이름 생성 불가. |
| GitHub org 검색 | github.com/smalti-* | 다수 존재 | — | 사용자 확인됨; org `smalti` 신규 생성은 개인 계정과 충돌로 불가. |

**주의**: npm/PyPI/crates 직접 확인 실패는 조회 실패이지 부재 증명이 아닙니다. 최종 결정 전 로컬에서 `npm view smalti` / `pip index versions smalti` / `cargo search smalti` 수행 필수.

---

## 3. 도메인

whois 원격 질의 기준 전수 **ACTIVE** (미등록 0개).

| 도메인 | 상태 | 생성일 | 등록업체 | 추정 용도 |
|---|---|---|---|---|
| smalti.com | 🔴 점유 | 1999-12-26 | Network Solutions (CF nameserver) | **WitsEnd Mosaic**(미국 위스콘신 Pulaski 소재 모자이크 유리 판매점), 활발 운영 |
| smalti.net | 🟡 점유 | 2017-10-12 | Tucows (parkingcrew NS) | **주차 도메인** |
| smalti.org | 🟡 점유 | 2021-01-07 | Gransy s.r.o. (.si NS) | 슬로베니아 NS, 용도 불명 |
| smalti.io | 🟡 점유 | whois에 한해 ACTIVE | — | 직접 접속 차단, 추정 주차·개인 보유 |
| smalti.dev | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |
| smalti.app | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |
| smalti.ai | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |
| smalti.sh | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |
| smalti.run | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |
| smalti.tools | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |
| smalti.build | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |
| smalti.codes | 🟡 점유 | ACTIVE | — | 직접 접속 실패 |

> 주의: 위 생성일 일부는 whois 서버가 반환한 레지스트리 공통 기준일(1985-01-01·1997-09-16 등 TLD 개설일)로 추정되는 값이 섞여 있습니다. 개별 확인은 whois detail로 재조회 필요. 단 **ACTIVE 여부 자체는 일관되게 확인**되었습니다.

**개발자 공감대 높은 gTLD 전부가 등록됨** — 2순위 도메인(예: `getsmalti.com`, `smalti-dev.com`, `smaltihq.com`, `usesmalti.com`, `trysmalti.com`)을 검토해야 하는 상황.

---

## 4. 상표

### 4.1 USPTO (미국)

- **단독 "SMALTI" 등록 확증 없음** — 검색 인덱스에 유효 매칭 없음.
- 관련 발견: **LA COMPAGNIA DELL'ORO SMALTI E RIFLESSI DI MURANO** (Reg 2405658, Serial 75739767) — Justia 아카이브에 존재하는 **복합 마크**. 단어 `SMALTI`가 포함되지만 식별력은 "La Compagnia dell'Oro"에 있음.
- 직접 `tmsearch.uspto.gov` 쿼리는 샌드박스에서 차단됨. **변리사 통한 정식 USPTO word-search 필수**.
- 🔴 주의: 검색 결과 미노출 ≠ 부재. 인덱싱 지연·생성된 기록 다수 존재 가능. 법률 자문 없이는 미국 Class 9/42 출원 가능 여부 단정 불가.

### 4.2 KIPO (대한민국)

- `스말티` / `SMALTI` KIPRIS 직접 조회 **접근 불가** (사이트 차단). 검색엔진 무결과.
- 추정: 한국 시장에서 이탈리아어 네일 에나멜 의미 인지도는 낮아 **한국 상표 리스크는 상대적으로 낮음**. 단 확증 아님.

### 4.3 EUIPO / 이탈리아 UIBM (EU·이탈리아 — **최대 리스크 구간**)

- TMview / EUIPO eSearch plus 직접 조회 불가.
- **정성 리스크 🔴 HIGH**: 이탈리아어 `smalti`는 "네일 에나멜"의 일반 상거래 용어. Rybella, LCN, Narika, WYCON, MakeUp Supply, Melissa, Diego Dalla Palma, MI-NY, OPI Italy 등 다수 이탈리아 화장품사가 카탈로그 네비게이션 용어("Smalti Nail Polish", "Smalti per unghie")로 사용 중. 제품 라인명·상품설명에 편재.
- 결론: **EU/IT Class 3에서는 기술적(descriptive) 표시로 식별력 결여 가능성**이 크고, 동시에 이미 등록된 복합 상표 다수 존재 가능성이 큽니다. EU 단일 상표 출원은 거절 혹은 이의제기 가능성 높음.
- 소프트웨어(Class 9/42)로 한정 출원해도 이탈리아 소비자·EU 심사관의 혼동가능성 판단이 변수.

---

## 5. 유명 제품·비상표 충돌

| 영역 | 충돌도 | 근거 |
|---|---|---|
| **모자이크·미술 재료** | 🟡 카테고리 상이 | smalti.com (WitsEnd Mosaic), MosaicSmalti.com (Orsoni), Perdomo Smalti, mosaicartsupply.com 등. "Material of the Masters" 슬로건 자체 사용 중. SEO 경쟁 불리. |
| **이탈리아·EU 네일 에나멜** | 🔴 일반명사 | 복수 화장품사의 카탈로그 분류 용어. Brand Italia 검색 시 smalti = 네일 제품. |
| **개발자 도구/CLI/IDE/플러그인** | 🟢 무확인 | 검색어 `"smalti" software cli ide plugin developer` 관련 매칭 **0건**. 인접 결과는 전부 `smali`(안드로이드 DEX 어셈블리 언어) 혼동 — 발음 유사 ∴ **smali와의 혼동 리스크 🟡**. |
| **smali (Android 리버싱)** | 🟡 이름 유사 | smalidea, java2smali, smali-ide 등. 개발자 검색 노이즈 다수. SEO 분리 어려움. |

---

## 6. 소셜 핸들

| 플랫폼 | 핸들 | 상태 | 비고 |
|---|---|---|---|
| X (Twitter) | @SmaltiC | 🟡 유사 점유 | "Smalti wa co", 2014 가입, 3 팔로워, 활동 0 — 사실상 dormant. `@smalti` 자체 상태 미확인. |
| GitHub | smalti | 🔴 점유 | Tymofii Smirnov 개인 계정 |
| Reddit r/smalti | — | 미확인 | 무결과 |
| npm org @smalti | — | 미확인 | 직접 확인 실패 |

---

## 7. 🔴 블로커

1. **GitHub `smalti` 핸들 선점** — org 생성 불가. 현실적으로 `smalti-dev`, `smaltihq`, `smalti-io` 등 차선 org 명으로 진행해야 함.
2. **smalti.com + 주요 개발자 gTLD 전량 선점** — `.dev .io .app .ai .sh` 포함 **0개 available**. 기본 도메인 확보 전략 전면 재수립 필요.
3. **EU/IT Class 3 식별력 결여 추정** — 이탈리아어 일반명사 이슈. EU 진출 또는 EUIPO 출원 시 거절·이의제기 확률 유의미.
4. **모자이크/네일 카테고리 SEO 블랙홀** — Google/EU 검색 결과 상위가 공예·화장품으로 포화. "smalti ide"·"smalti cli" 검색 시 smali·smalidea로 유도되는 혼동 트래픽까지 겹침.

---

## 8. 🟡 주의 항목

- npm/PyPI/crates 직접 확인 실패. 현 데이터만으론 **미점유라고 단정 불가**. 최종 결정 직전 로컬에서 재확인 필수.
- USPTO 단독 `SMALTI` 레코드 존재 가능성 배제 못 함 (검색 인덱싱 한계). 변리사 통한 공식 조회 필요.
- `smalti.com`이 Cloudflare 사용 + WitsEnd Mosaic 유지 중이라 매입 협상 여지는 있으나 비용·시간 불확실.
- X 핸들 `@smalti` 본체 상태는 미확인 (`@SmaltiC`만 확인됨).

---

## 9. 권장 액션

### 선점 우선순위 (채택 강행 시)
1. **변리사 공식 조회 선행** — USPTO·EUIPO·UIBM·KIPO의 `SMALTI` 단독어 + Class 9/42 검증 의뢰. **법률 자문 없이 진행 금지**.
2. npm/PyPI/crates 로컬 CLI 재확인:
   ```
   npm view smalti
   pip index versions smalti
   cargo search smalti --limit 5
   ```
3. 차선 GitHub org: `smalti-dev`, `smaltihq`, `smalti-ai`, `getsmalti` 가용성 동시 확인.
4. 차선 도메인 전략:
   - `getsmalti.com`, `trysmalti.com`, `usesmalti.com`, `smaltihq.com`, `smalti-dev.com`, `smaltiapp.com`
   - 또는 **대체 표기 검토 (권장)**: `smaltid`, `smaltsh`, `oh-my-smalti`, `smalti-cli`, `smaltide`
5. X·Reddit·Discord 핸들은 상표·도메인 확정 이후 진행.

### 법률 자문 필요 항목
- EU/이탈리아 Class 3 네일 에나멜 일반명사성 때문에 EUIPO 출원 식별력 판정을 **반드시 사전 자문**.
- USPTO Class 9/42 출원 시 혼동 가능성(likelihood of confusion) 검토.
- 한국 Class 9/42 KIPRIS 단독 조회 의뢰.

### 대체 표기 예비안 (블로커 해소 대안)
| 후보 | 이점 | 리스크 |
|---|---|---|
| **smaltid** | 도메인·GitHub 신규 가능성 높음, 발음 보존 | 무의미 접미사 |
| **smaltsh** | `.sh` 도메인 뉘앙스와 정합 | 발음 어색 |
| **oh-my-smalti** | npm 관용 접두 | GitHub org `smalti` 여전히 미확보 |
| **smaltide** | IDE 의미 내포, 창작어 | 재독음 확인 필요 |
| **smalti-cli** / **smalti-code** | 하이픈 기반 netnew | 브랜드 순도 약화 |

---

## 10. 최종 권고

**조건부 GO (법률 자문 선행 필수) 또는 재검토 권장**.

- 근거: 개발자 인프라(npm·PyPI·crates) 선점 가능성은 존재하나, **GitHub `smalti` 핸들·주요 도메인 전량 선점 + EU/IT 일반명사 충돌 + 상표 영역 확증 불가**가 동시에 걸려 있습니다. 소프트웨어 카테고리 내에서의 혼동 리스크는 낮아 보이지만, EU 진출·상표 출원·도메인 확보의 세 축이 전부 마찰을 유발합니다.
- 추천 경로: (a) 변리사 통한 USPTO·EUIPO 단독 `SMALTI` 조회 후 정식 판정 + (b) `smalti` 단독어 대신 **접미·접두 파생형**(smaltid / smaltide / oh-my-smalti 등) 채택으로 도메인·GitHub 제약을 우회. 순수 `smalti`를 고수한다면 도메인은 `getsmalti.com` 계열 + GitHub은 `smaltihq` 등 차선책 필수.
- **Rust 이전 맥락 고려** — AIDE의 Rust 코어 이행 중 crates.io `smalti` 선점 타이밍은 유효. 단 이 선점만으로 브랜드 리스크가 해소되지는 않습니다.

---

## 조회 소스 (주요)

- [npmjs.com/package/smalti (403·직접접근불가, 검색 인덱스 무결과)](https://www.npmjs.com/package/smalti)
- [github.com/smalti — Tymofii Smirnov](https://github.com/smalti)
- [smalti.com — WitsEnd Mosaic](https://smalti.com/)
- [mosaicsmalti.com — Orsoni Italian Smalti](https://mosaicsmalti.com/)
- [WYCON Cosmetics — "Smalti" nail lacquer](https://www.wyconcosmetics.com/it/catalogo-make-up-mani-smalti/194/wycon-cosmetics-nail-lacquer)
- [MakeUp Supply — Smalti Nail Polish](https://makeupsupply.it/208-smalti-nail-polish)
- [Rybella — Smalti per unghie](https://www.rybella.com/prodotto/smalti-per-unghie/)
- [Justia — LA COMPAGNIA DELL'ORO SMALTI Reg 2405658](https://trademarks.justia.com/757/39/la-compagnia-dell-oro-smalti-e-riflessi-di-murano-75739767.html)
- [USPTO trademark search (차단, 변리사 의뢰 대상)](https://tmsearch.uspto.gov/)
- [EUIPO TMview (차단, 변리사 의뢰 대상)](https://www.tmdn.org/tmview/)
- [x.com/SmaltiC (dormant)](https://x.com/SmaltiC)
- whois 로컬 확인: smalti.com/.net/.org/.io/.dev/.app/.ai/.sh/.run/.tools/.build/.codes 전부 ACTIVE

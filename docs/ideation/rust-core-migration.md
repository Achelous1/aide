> **Status**: Phase 0 + Phase 1 실행 완료. 실행 기록은 [[docs/wiki/rust-core-migration.md]] 참조.

---
title: "Electron 셸 + Rust 코어 하이브리드 마이그레이션 아이데이션"
category: ideation
tags: [architecture, rust, napi-rs, performance, migration, electron, hybrid]
created: 2026-04-22
updated: 2026-04-22
related: [[index]], [[rebrand-partide]], [[watcher-performance]], [[main-process-cpu-home-watcher-bugfix]]
---

# Electron 셸 + Rust 코어 하이브리드 마이그레이션 아이데이션

> 이 문서는 AIDE 백엔드를 Rust로 점진 이전하는 하이브리드 아키텍처 아이데이션 기록입니다.
> 실행 착수 전 단계이며, 설계 의사결정·경계선·리스크 보존을 목적으로 합니다.

---

## 1. 요약 (Executive Summary)

- **결정 방향**: Electron(렌더러·플러그인 iframe·앱 셸)은 유지, **Main 프로세스의 백엔드 기능을 Rust 코어로 이전**.
- **통합 방식**: **napi-rs 네이티브 모듈** (`.node` 바이너리)을 주 경계로, **사이드카 프로세스**는 격리 필요 영역(MCP 서버 등)에서 보조 채택.
- **플러그인 런타임은 Node.js에 유지**: Create n Play의 생성 속도·호환성·AI 프롬프팅 편의를 위해 JS 환경 보존.
- **추정 소요**: 실측 10~14주 × 1.5 보정 = **약 4~5개월** (솔로 + Claude 코드 작성 기준).
- **현시점 판단**: 코드베이스 약 9,030 라인 (실질 이전 대상 ~4K 라인) → **지금이 이전 비용 최저점**.

---

## 2. 왜 지금 Rust인가

### 2.1 JS 기반의 누적 부채
Node.js 기반 Main 프로세스는 코드베이스가 커질수록 다음 문제를 구조적으로 누적:

- **CPU 소모**: chokidar 기반 파일 watcher는 구조상 CPU 비용이 높음 → [[main-process-cpu-home-watcher-bugfix]] 에서 DMG idle 127% CPU 경험. [[watcher-performance]] 단계별 roadmap도 결국 "JS 내에서의 최적화 한계" 인정.
- **터미널 출력 스트리밍**: 초당 100KB+ PTY 출력이 Node 이벤트 루프에서 버퍼링·파싱되면서 렌더링 지연 유발 가능성.
- **Git 작업**: `simple-git`은 `git` CLI를 프로세스 스폰 — 각 호출마다 fork/exec 오버헤드.
- **플러그인 다수 로드 시**: vm 컨텍스트 생성, 핫 리로드, MCP dispatch가 JS 이벤트 루프 하나에 몰림.

### 2.2 "지금"이어야 하는 이유
- 코드베이스가 작을수록 이전 비용 최저. 현재 **9,030 라인** 중 실질 이전 대상은 **3,135 라인 (Main) + ~1,000 (preload)**.
- 아직 대외 사용자 수가 적어 **기능 동결 기간이 경쟁 타격으로 덜 이어짐**.
- Tauri 2.x / napi-rs / portable-pty / notify / gitoxide 생태계가 **2024~2025에 성숙**. 도구 선택 리스크 최저점.

### 2.3 "지금은 아니다"의 반론
- PMF(제품-시장 적합성) 미검증 상태에서 플랫폼 재작성은 "침몰하는 배의 데크 재배치"
- 재작성 기간 = 신규 기능 0 → 6개월치 경쟁자 리드 허용
- Second-system effect: 재작성은 통상 초기 추정의 1.5~3배 소요
- → **본 이전은 "제품 유지보수 투자"로 프레이밍**, 신규 기능 릴리즈와 병행할 수 있는 최소 경로만 선택

---

## 3. 아키텍처 경계선

### 3.1 전체 레이어 다이어그램

```
┌──────────────────────────────────────────────────┐
│  Renderer (React)                    [유지]      │
│  └─ window.aide → ipcMain                         │
├──────────────────────────────────────────────────┤
│  Preload (contextBridge)             [유지]      │
├──────────────────────────────────────────────────┤
│  Electron Main (JS) — 얇은 오케스트레이터         │
│  ├─ BrowserWindow / Window lifecycle             │
│  ├─ protocol.handle('aide-plugin://')            │
│  │    └─ Rust에서 바이트 수신 후 응답            │
│  ├─ protocol.handle('aide-cdn://')               │
│  ├─ ipcMain 얇은 래퍼 (Rust 호출)                │
│  └─ 시스템 다이얼로그 / 자동 업데이트            │
├──────────────────────────────────────────────────┤
│  ★ Rust Core (napi-rs .node)          [신규]     │
│  ├─ PTY 매니저 (portable-pty)                    │
│  ├─ 파일 시스템 + watcher (notify)               │
│  ├─ Git (gitoxide)                               │
│  ├─ 커스텀 프로토콜 asset 파이프라인              │
│  ├─ 플러그인 레지스트리 + 핫 리로드              │
│  ├─ 세션 영속화 (sled 또는 sqlite)               │
│  ├─ Agent 세션 파서 (Claude ULID / Gemini UUID)  │
│  └─ MCP 핵심 핸들러                              │
├──────────────────────────────────────────────────┤
│  MCP Server                          [사이드카]  │
│  └─ Rust 바이너리, NDJSON over stdio             │
├──────────────────────────────────────────────────┤
│  Plugin Runtime                      [Node 유지] │
│  └─ node:vm + worker_threads (보안 강화)         │
└──────────────────────────────────────────────────┘
```

### 3.2 통합 방식 비교

| 방식 | 장점 | 단점 | 채택 |
|---|---|---|---|
| **napi-rs 네이티브 모듈** | 제로 직렬화, async→Promise 매핑, TS 바인딩 자동 | 빌드 파이프라인 복잡, ABI 재컴파일 필요 | **주 경계** |
| **사이드카 프로세스** | 크래시 격리, 디버깅 분리 | 직렬화 오버헤드, 바이너리 데이터 비효율 | 보조 (MCP) |
| **로컬 HTTP/gRPC** | 언어 독립, 표준 툴링 | 오버헤드 최대, 보안 표면 확대 | 미채택 |

### 3.3 경계선 원칙

1. **단일 경계**: JS ↔ Rust 호출은 `#[napi]` 표시 API 1개로 통일. 타입 계약서 역할.
2. **상태는 Rust가 소유**: PTY 세션·watcher·플러그인 레지스트리 등 stateful 객체는 Rust 쪽에 머무름.
3. **Renderer는 Rust에 직접 접근 불가**: 반드시 Main 경유 (contextIsolation 보존).
4. **Async 필수**: FFI 경계 blocking 호출 금지.
5. **데이터 배치**: PTY 출력·파일 이벤트는 Rust에서 16ms 단위 coalesce 후 전달.
6. **에러 변환**: 모든 `Result<T, E>` → 타입드 TS 에러 + 스택 보존.

---

## 4. 검증된 선례

이 조합은 **실험적이 아니며 고성능 Electron 앱의 표준 패턴**:

| 제품 | 구조 | Rust/네이티브 담당 |
|---|---|---|
| **1Password** | Electron UI + Rust 코어 | 암호화, 동기화, 저장소 |
| **Signal Desktop** | Electron + libsignal (Rust) | 암호화 프로토콜 |
| **Discord** | Electron + Rust | 음성 처리, 일부 네트워크 |
| **VSCode** | Electron + C++/Rust 모듈 | ripgrep, watcher, tree-sitter |
| **Parcel / Rspack / Turbopack** | Node + Rust (napi-rs) | 번들링 전체 |
| **Next.js (SWC)** | Node + Rust (napi-rs) | 컴파일러 |

→ napi-rs는 프로덕션 검증된 경계 (Vercel, Cloudflare, 1Password 등이 주력 사용).

---

## 5. 모듈별 이전 계획

| 모듈 | 현재 (JS) | 이전 대상 (Rust) | 기간 | 리스크 |
|---|---|---|---|---|
| 파일 시스템 | `fs`, chokidar | `std::fs`, `notify` | 1~1.5주 | 낮음 |
| Git | `simple-git` (프로세스 spawn) | `gitoxide` (순수 Rust) | 1주 | 낮음 |
| PTY | `node-pty` | `portable-pty` | **2~3주** | **높음** |
| MCP 서버 | Node.js 스크립트 | Rust 사이드카 | 1주 | 중간 |
| 커스텀 프로토콜 | Electron 핸들러 | 핸들러 JS 유지, 데이터 Rust | 3~5일 | 중간 |
| 세션 영속화 | `electron-store` | `sled` 또는 `sqlite` | 1주 | 낮음 |
| Agent 파서 | pty 출력 regex | Rust regex + stream 파서 | 3~5일 | 낮음 |
| 플러그인 레지스트리 | Node 인메모리 맵 | Rust `HashMap` + notify 훅 | 1주 | 중간 |
| **플러그인 런타임** | **node:vm** | **유지 (Node)** | 0 | — |

### 5.1 기대 효과 예측 (정량)

- **Idle CPU**: DMG 패키지 기준 현재 idle 상태에서도 watcher CPU 소모 → `notify` 전환 후 **80%+ 감소 추정** ([[main-process-cpu-home-watcher-bugfix]] 맥락).
- **Git 작업 latency**: 프로세스 spawn 제거로 `git status` 호출당 **30~80ms → <5ms**.
- **PTY 출력 지연**: Rust 측 배치·zero-copy Buffer 전달로 대량 출력 시 **프레임 드롭 제거**.
- **앱 콜드 스타트**: Rust 바이너리 로드 오버헤드 vs. Node 초기화 제거 — **순효과는 벤치 필요** (예상: 동일 또는 약간 개선).
- **메모리**: Electron 셸 자체 메모리는 불변, Rust 코어는 Node 백엔드 대비 **30~50% 감소 추정**.

---

## 6. 플러그인 런타임 — Node 유지 결정

### 6.1 대안 비교

| 옵션 | 장점 | 단점 | 판정 |
|---|---|---|---|
| **A. Node.js 유지 (node:vm + worker_threads)** | 기존 플러그인 무변경, AI 생성 플러그인(JS)과 100% 호환, 제품 철학 "Create n Play" 보존 | 격리 수준 vm 한계, Rust 일체화 실패 | **채택** |
| B. deno_core 임베딩 | 통합 런타임, 격리 우수 | 바이너리 +10MB, 빌드 지옥, Claude가 생성한 JS와 미세 불일치 가능 | 보류 |
| C. rusty_v8 직접 임베딩 | 최대 성능 | 빌드/유지보수 난이도 최상 | 미채택 |
| D. WASM 런타임 (wasmtime) | 보안 최상 | 플러그인을 JS로 작성 불가 (AssemblyScript/Rust) → **Create n Play UX 파괴** | 미채택 |

### 6.2 근거
- AIDE 제품 철학: **"자연어 → 즉시 동작하는 플러그인"**. AI가 가장 잘 생성하는 언어는 JS.
- 보안은 **worker_threads + Permissions API** 조합으로 단계적 강화 가능 (vm 단독보다 훨씬 견고).
- 플러그인 런타임 이전은 **코어 이전 완료 후의 별도 의사결정**으로 분리.

---

## 7. 타임라인

### 7.1 단계별 일정

| 단계 | 내용 | 소요 |
|---|---|---|
| **0. 스파이크** | napi-rs 헬로월드 + `readTree` 포팅 + 패키징 검증 | **3~5일** |
| **1. 파일 시스템** | notify 전환, fs IPC Rust화 | 1~1.5주 |
| **2. Git** | gitoxide, status/log/branch/commit | 1주 |
| **3. PTY (리스크 구간)** | portable-pty, 출력 배치, fix-env Rust 이식 | **2~3주** |
| **4. MCP 사이드카** | NDJSON, 플러그인 dispatch | 1주 |
| **5. 커스텀 프로토콜** | Rust asset 제공, Electron 핸들러 연결 | 3~5일 |
| **6. 세션 + Agent 파서** | electron-store → sled/sqlite, 세션 ID 파서 | 1주 |
| **7. 크로스 플랫폼 검증** | macOS/Windows/Linux matrix CI | 2주 |
| **8. 코드사인 재조정** | Rust 바이너리 서명, asar unpack 설정 | 3~5일 |

**소계**: 10~14주 (실측 추정)
**Second-system effect 보정 (×1.5)**: **15~21주 = 약 4~5개월**

### 7.2 전제 조건
- 사용자 (1인) 주 20~30시간 감독·테스트 투자 가능
- Claude 코드 작성 70%+, 리뷰·빌드·테스트는 사용자
- 스파이크 1주차 완료가 전체 일정의 go/no-go 시그널

---

## 8. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|---|---|---|
| napi-rs 초기 셋업 마찰 | 1~3일 지연 | 스파이크 단계에서 선제 검증, 실패 시 즉시 사이드카 전환 |
| macOS universal 바이너리 (arm64+x64) | lipo 설정 누락 가능 | CI에서 matrix 빌드 후 lipo 자동화 |
| Windows MSVC vs GNU ABI | 사용자 설치 실패 | MSVC 고정 (Electron Windows 빌드 호환) |
| Electron 업그레이드 시 ABI 재컴파일 | 한 번은 깨짐 | `electron-rebuild` hook, CI에 Electron 버전 고정 |
| PTY 대량 출력 시 FFI 오버헤드 | 프레임 드롭 | Rust 측 16ms 배치, `Buffer.from(zero_copy)` |
| Rust 패닉이 JS로 전파 불명확 | 디버깅 난이도 | `panic::set_hook`으로 Rust 패닉 → JS Error 어댑터 |
| Rust 인크리멘탈 빌드 지연 | 10~30초 | `mold`/`lld` 링커, `codegen-units` 튜닝 |
| 현재 CLAUDE.md 함정 재발견 | 2~4주 추가 | 포팅 중 CLAUDE.md 항목별 대응 체크리스트 운영 |
| 기능 동결 중 경쟁자 리드 | 시장 포지션 약화 | 이전 중에도 Renderer 단독 개선은 계속 (UI/UX 개선) |
| 사용자 번아웃 | 프로젝트 정지 | 스파이크 → Phase별 릴리즈 전략 (한 번에 전부 이전 X) |

---

## 9. Go / No-Go 기준

### 9.1 스파이크 통과 조건 (5일 내)
- [ ] napi-rs .node 바이너리가 Electron asar 환경에서 정상 로드
- [ ] 한 개 기능(`readTree` 제안) Rust 포팅 완료 + 기존 JS 버전과 동일 결과
- [ ] macOS + Linux 최소 2개 OS에서 빌드 성공
- [ ] 코드사인 파이프라인에서 Rust 바이너리가 거부되지 않음

**위 4항목 중 1개라도 실패 시 → 사이드카 단독 전략으로 전환**

### 9.2 Phase별 중단 조건
- 각 단계 종료 후 기존 JS 버전과 **벤치마크 비교**, 성능 개선이 10% 미만이면 해당 모듈 이전 보류
- 버그가 이전 전보다 많아지면 해당 단계 롤백

### 9.3 전체 중단 조건
- 이전 4주차까지 스파이크 + 파일 시스템 완료 안 됨 → **프로젝트 전면 중단**, Electron JS 그대로 유지
- 사용자 번아웃 신호 (주간 커밋 50% 감소 2주 연속) → 일정 2배 연장 + 스트레치

---

## 10. 열린 질문

1. **플러그인 런타임 향후 경로**: worker_threads 보안 강화 이후, 멀티테넌트 환경 요구 시 deno_core 임베딩 재검토할 것인가?
2. **MCP 서버**: 사이드카 (별도 프로세스) vs napi-rs 인프로세스 중 어느 것을 기본으로 할 것인가? 현재 기울기는 사이드카 (크래시 격리).
3. **renderer 성능**: 재작성 범위에 React 최적화를 포함시킬 것인가, 별도 라인으로 분리할 것인가?
4. **배포 아티팩트 크기**: Rust 바이너리 추가로 DMG 크기 +5~15MB 예상. 이것이 배포 체감에 유의미한가?
5. **번들 구조 변화**: `electron-forge` Vite 플러그인과 `@napi-rs/cli` 빌드 훅의 실행 순서 정리 필요.
6. **Rust 크레이트 이름/네임스페이스**: 리브랜드([[rebrand-partide]]) 확정 후 `partide-core` 같은 이름으로 시작할지, `aide-core`로 먼저 시작 후 리네임할지.

---

## 11. 관련 문서

- [[index]] — Wiki 전체 인덱스
- [[rebrand-partide]] — 리브랜딩 아이데이션 (크레이트 이름 결정에 영향)
- [[watcher-performance]] — 현재 JS watcher 최적화 로드맵 (Rust 이전 시 해당 roadmap 자연 종료)
- [[main-process-cpu-home-watcher-bugfix]] — Rust 이전의 정량적 동기 중 하나

---

## 12. 실행 의사결정 상태

- **현시점**: Phase 0 + Phase 1 실행 완료.
- **즉시 가능한 행동**: 스파이크(5일)만 선행 수행 → 결과 기반 전체 착수 여부 판단.
- **당분간 금지**: 본 이전과 무관한 신규 백엔드 기능 추가 (이전 대상 면적 증가 방지).

---

## 13. Phase 1 실행 결과

### 13.1 완료된 PR

| PR | 내용 |
|---|---|
| #90 | Phase 0 스파이크 — napi-rs .node asar 로드 검증, readTree 포팅 |
| #91 | Phase 1 킥오프 DA 리뷰 — fixup 목록 확정 |
| #92 | PR-A: readTree → Rust 스왑, JS 원본 삭제 |
| #93 | PR-B: readFile/writeFile/deletePath → Rust 스왑, JS 원본 삭제 |
| #94 | PR-C: chokidar → Rust notify watcher (fs-handlers + plugin-handlers 3개) |

### 13.2 Watcher Idle CPU 벤치마크

**측정일**: 2026-04-22  
**하드웨어**: Apple M1, macOS 26.4.1 (Build 25E253)  
**방법**: `scripts/bench-watcher.js` — Node.js에서 napi-rs 모듈 직접 로드, ~500파일 워크스페이스, 60초 샘플링

| 지표 | 값 |
|---|---|
| Min | 0.0% |
| **Avg** | **0.0%** |
| Max | 0.6% |

> before 측정은 chokidar 제거 후라 직접 A/B 불가.
> 참조: [[main-process-cpu-home-watcher-bugfix]] chokidar DMG idle ~127% → Rust notify ~0% (idle)

### 13.3 이연 항목

- **Round-2** (`subtask_aztf5jd6`): DA 리뷰 fixup 항목
- **Round-3** (`subtask_rbt4hjxm`): 위생 항목 (커밋된 .node 바이너리 제거 등)
- **TRD 업데이트**: napi-rs 아키텍처 반영 이연


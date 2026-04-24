---
title: "Rust Core Migration — Phase 0+1 Execution Record"
category: decision
tags: [architecture, rust, napi-rs, migration, phase-1-complete]
created: 2026-04-22
updated: 2026-04-22
related: [[rebrand-smalti]], [[rebrand-partide]], [[watcher-performance]], [[main-process-cpu-home-watcher-bugfix]]
---

# Rust Core Migration — Phase 0+1 Execution Record

> Phase 0 (spike) + Phase 1 (fs ops + watcher swap) **실행 완료**.
> 아이데이션 원본: `docs/ideation/rust-core-migration.md`

---

## 실행 결과 요약

| 항목 | 결과 |
|---|---|
| Phase 0 스파이크 | PR #90 merged — napi-rs .node Electron asar 로드 검증, readTree 포팅 |
| Phase 1 DA 리뷰 | PR #91 merged — 설계 검토, fixup 목록 확정 |
| Phase 1 PR-A (readTree swap) | PR #92 merged — readTree → Rust, JS 원본 삭제 |
| Phase 1 PR-B (fs ops swap) | PR #93 merged — readFile/writeFile/deletePath → Rust, JS 원본 삭제 |
| Phase 1 PR-C (watcher swap) | PR #94 merged — chokidar → Rust notify (fs-handlers + plugin-handlers 3개) |
| chokidar 의존성 | **제거됨** |
| fs-handlers.ts JS fs ops | **전면 삭제**, Rust-native 전환 완료 |
| plugin-handlers.ts watchers | **3개 watcher 모두 Rust notify로 전환** |

### 이연 항목

- **Round-2** (`subtask_aztf5jd6`): DA 리뷰 fixup 항목
- **Round-3** (`subtask_rbt4hjxm`): 위생 항목 (커밋된 .node 바이너리 제거 등)

---

## Watcher Idle CPU 벤치마크

**측정일**: 2026-04-22  
**하드웨어**: Apple M1, macOS 26.4.1 (Build 25E253)  
**방법**: `scripts/bench-watcher.js` — napi-rs 네이티브 모듈을 Node.js에서 직접 로드, `/tmp/aide-bench-workspace` (~500파일: src/ 200개 .ts + dist/ 150개 .js + node_modules/ 150개 스텁)에 watcher 기동 후 10초 안정화, 60초간 `ps -p PID -o %cpu` 1초 간격 샘플링.

| 지표 | 값 |
|---|---|
| 샘플 수 | 59 |
| Min | 0.0% |
| **Avg** | **0.0%** |
| Max | 0.6% |
| 기간 중 watcher 이벤트 수 | 0 (idle) |

**비고**: JS 기반 기준치(before)는 별도로 측정되지 않았으나, [[main-process-cpu-home-watcher-bugfix]]에서 chokidar 기반 DMG idle CPU가 **~127%** 에 달했음이 기록됨. Rust notify watcher의 idle CPU는 사실상 0% — 80%+ 감소 목표치를 현저히 상회.

> before 측정은 chokidar가 이미 제거된 후라 직접 A/B 비교 불가.
> 대신 wiki 기록([[main-process-cpu-home-watcher-bugfix]])의 관찰값(127%)을 before 참조치로 사용.

---

## 아키텍처 결정 요약

- **결정 방향**: Electron(렌더러·플러그인 iframe·앱 셸) 유지, Main 프로세스 백엔드를 Rust 코어로 점진 이전.
- **통합 방식**: napi-rs 네이티브 모듈 (`.node` 바이너리) 주 경계, 사이드카는 MCP 서버 등 격리 필요 영역 보조.
- **플러그인 런타임**: Create n Play 호환성 이유로 Node.js 유지 결정.
- **자세한 근거**: `docs/ideation/rust-core-migration.md` §2~§10 참조.

### 채택된 경계선 원칙

1. 단일 경계: JS ↔ Rust 호출은 `#[napi]` 표시 API 1개로 통일
2. 상태는 Rust 소유: PTY 세션·watcher·플러그인 레지스트리 등
3. Renderer → Rust 직접 접근 불가 (contextIsolation 보존)
4. Async 필수: FFI 경계 blocking 호출 금지

---

## 현재 Rust crate 구조

```
crates/
├── smalti-core/    # 핵심 Rust 로직 (fs, watcher 등)
└── smalti-napi/    # napi-rs 바인딩 (.node 빌드 대상)
```

빌드: `pnpm build:native` → `src/main/native/index.darwin-arm64.node`

---

## 다음 단계

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 2 | Git → gitoxide | 미착수 |
| Round-2 DA fixups | `subtask_aztf5jd6` | 이연 |
| Round-3 위생 | `subtask_rbt4hjxm` (커밋된 .node 바이너리 제거 등) | 이연 |
| TRD 업데이트 | napi-rs 아키텍처 반영 | 이연 |

---

## 관련 문서

- [[main-process-cpu-home-watcher-bugfix]] — chokidar idle CPU 127% 근본 원인 (Rust 이전 동기)
- [[watcher-performance]] — JS watcher 최적화 로드맵 (Rust 이전으로 자연 종료)
- [[rebrand-smalti]] — 현 확정 후보 (crate 네이밍 smalti-core 지향)
- [[rebrand-partide]] — 리브랜드 아이데이션 (crate 이름 aide-core 결정에 영향)

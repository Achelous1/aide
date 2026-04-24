---
title: "파일 Watcher 성능 최적화"
category: performance
tags: [performance, watcher, main-process, chokidar]
created: 2026-04-15
updated: 2026-04-15
related: [[eperm-uv-cwd-bugfix]], [[main-process-cpu-home-watcher-bugfix]]
---

# 파일 Watcher 성능 최적화

## 요약

workspace 전체를 감시하면서 발생하던 메인 프로세스 CPU 과사용(~133%) 이슈를 VS Code 방식의 exclusion 패턴으로 완화한다. Stage 1(하드코딩 exclusion)은 적용 진행 중이며, Stage 2·3 및 Phase 2(Rust 네이티브)는 향후 작업으로 남긴다.

## 문제

- smalti 메인 프로세스가 idle 상태에서도 CPU 100%+ 를 소비
- 원인: `src/main/ipc/fs-handlers.ts`의 `chokidar.watch(cwd, { depth: 3 })`가 workspace 루트 전체를 감시
- `node_modules`, `.git`, `dist` 등 대형 디렉토리의 수십만 파일 이벤트를 전부 수신
- `broadcastChanged()` 디바운스는 존재하지만 이벤트 발생량 자체가 과도하여 완화 효과 제한적

## 해결 (Stage 1)

VS Code `files.watcherExclude` 기본값을 벤치마크하여 고정 exclusion 리스트를 적용한다. 공용 상수 `WATCHER_EXCLUSIONS`를 `src/main/ipc/watcher-exclusions.ts`에 두고, `fs-handlers.ts`와 `plugin-handlers.ts`가 공유한다.

### 제외 패턴

| 범주 | 패턴 |
|------|------|
| VCS | `.git`, `.hg`, `.svn` |
| 의존성 | `node_modules` |
| 빌드 산출물 | `dist`, `build`, `out`, `coverage`, `target` |
| 프레임워크 캐시 | `.next`, `.nuxt`, `.turbo`, `.cache`, `.parcel-cache`, `.vite`, `.swc` |
| 로그/락 파일 | `.log`, `.pid`, `.lock` |

### 주의사항

**파일트리 표시와는 무관하다.** `readTree` IPC 핸들러는 여전히 모든 디렉토리 엔트리를 반환하므로 FileExplorer에서는 `node_modules` 등이 정상적으로 보인다. chokidar watcher 대상에서만 제외되는 것이다.

## Update (2026-04-15): HOME 감시 제거

Stage 1 exclusion만으로는 DMG 빌드의 메인 프로세스 CPU 127% 이슈가 해소되지 않았다. 원인은 필터링이 아니라 **감시 범위** 문제였다. 부팅 시 `registerFsHandlers(ipcMain, getHome())`가 호출되면서 chokidar가 사용자 HOME 디렉토리 전체를 감시 대상으로 잡고 있었고, `WATCHER_EXCLUSIONS`에 포함된 패턴(`node_modules`, `.git`, `dist` 등)은 프로젝트 빌드 산출물 위주라 HOME 하위의 `Library`, `Documents`, `Downloads`, `Desktop` 같은 디렉토리에는 적용되지 않았다.

근본 해결책으로 watcher 생성 시점을 부팅 → workspace 활성화로 옮기고, `setWorkspaceWatcher(path | null)` API로 watcher 교체·해제 라이프사이클을 명시화했다. 자세한 진단 과정 및 코드 변경은 [[main-process-cpu-home-watcher-bugfix]] 참조.

| Stage | 상태 | 비고 |
|-------|------|------|
| Stage 1 — 하드코딩 exclusion | 완료 | 프로젝트 산출물 노이즈 제거 |
| **Workspace-scoped watcher** | **완료 (2026-04-15)** | HOME 감시 차단, watcher 라이프사이클 명시화 |
| Stage 2 — `.gitignore` 머지 | 예정 | |
| Stage 3 — Lazy per-directory | 예정 | |
| Phase 2 — Rust 네이티브 | 장기 | |

## 향후 작업 (Roadmap)

### Stage 2 — `.gitignore` 머지

프로젝트별 `.gitignore`를 파싱하여 exclusion에 자동 머지한다. `ignore` npm 패키지를 활용해 gitignore glob을 chokidar ignore 함수로 변환할 예정. 서브 디렉토리의 `.gitignore`도 재귀적으로 적용한다.

### Stage 3 — Lazy per-directory Watcher

루트는 `depth: 1`만 감시하고, 사용자가 FileExplorer에서 expand한 폴더에 대해서만 추가 watcher를 등록한다. FileExplorer의 lazy-load 구조(`ebbeede`)와 짝을 이루어 대규모 monorepo에서도 일정한 watcher 비용을 유지한다.

### Phase 2 (장기) — Rust 네이티브 Watcher

`@parcel/watcher` 수준의 성능을 목표로 `napi-rs` + `notify` crate를 사용해 자체 네이티브 watcher를 구현하는 안을 검토한다. Electron 패키징과 napi-rs prebuild 파이프라인(멀티 플랫폼) 통합이 선결 과제이다.

## 참고

- [VS Code: files.watcherExclude](https://code.visualstudio.com/docs/editor/codebasics#_advanced-search-options)
- [chokidar 문서](https://github.com/paulmillr/chokidar#api)
- [notify crate (Rust)](https://github.com/notify-rs/notify)
- [napi-rs](https://napi.rs/)

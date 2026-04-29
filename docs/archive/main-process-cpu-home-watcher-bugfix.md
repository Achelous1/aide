---
title: "메인 프로세스 CPU 127% 버그픽스 (HOME watcher)"
category: debugging
tags: [main-process, performance, chokidar, watcher, dmg-only, packaging]
created: 2026-04-15
updated: 2026-04-15
related: [[watcher-performance]], [[eperm-uv-cwd-bugfix]], [[macos-tcc-file-permissions]]
---

# 메인 프로세스 CPU 127% 버그픽스 (HOME watcher)

## 요약

DMG 빌드 idle 상태에서 메인 프로세스 CPU가 127%까지 치솟던 이슈. 부팅 시 `registerFsHandlers`가 fallback cwd(=HOME)로 chokidar watcher를 생성해 사용자 홈 디렉토리 전체를 감시하던 것이 근본 원인. watcher 생성 시점을 workspace 활성화로 옮겨 해결.

## 증상

- DMG 빌드 앱 idle 상태에서 메인 프로세스 CPU **127%** (42 threads)
- `pnpm start` (dev): 안정 (CPU 낮음)
- 로그에 EBADF / fsevents 에러 없음
- CodeMirror 플러그인 에러는 1회만 발생 (loop 아님 — 무관)

## 진단 과정

1. **Stage 1 exclusion 시도** — `WATCHER_EXCLUSIONS` 적용했으나 DMG CPU 변화 미미
2. **프로세스 분리 확인** — Activity Monitor에서 renderer/GPU는 정상, **메인 프로세스만** 127%
3. **dev/DMG 차이 확인** — 동일 코드인데 dev에서는 재현 안 됨 → 환경 변수 또는 cwd 차이 의심
4. **cwd 추적** — `registerFsHandlers(ipcMain, getHome())` 호출 발견. fallback cwd로 HOME이 들어감
5. **chokidar target 확인** — `fs-handlers.ts`의 `chokidar.watch(cwd, { depth: 3 })`가 부팅 직후 HOME 전체를 감시 시작
6. **근본 원인 확정** — workspace 미선택 상태에서도 HOME watcher가 살아 있고, workspace 전환 시 교체 로직 부재

## 근본 원인

`src/main/index.ts:91-92`:

```ts
const fallbackCwd = getHome();
registerFsHandlers(ipcMain, fallbackCwd);
```

`fs-handlers.ts`가 부팅 시점에 받은 cwd로 즉시 watcher를 생성:

```ts
chokidar.watch(cwd, { depth: 3, ignored: WATCHER_EXCLUSIONS });
```

→ 사용자 HOME 디렉토리 전체(`Documents`, `Library`, `Downloads`, `Desktop` …)가 감시 대상이 됨. workspace를 새로 열어도 watcher 교체 로직이 없어 HOME watcher가 영구 유지.

## 왜 dev에서 안 터졌는가

- **dev**: 터미널에서 `pnpm start` 실행 → cwd가 프로젝트 루트, HOME 활동 적음
- **DMG**: Finder 런칭 → `getHome()` 로 HOME이 cwd가 됨. 동시에 macOS 시스템(Spotlight 인덱싱, TCC mediator, Time Machine 백업, iCloud sync 등)이 HOME 하위에서 끊임없이 파일 이벤트 생성
- chokidar가 그 이벤트를 모두 처리하려다 CPU 폭주

## 왜 Stage 1 exclusion이 부족했는가

`WATCHER_EXCLUSIONS`는 **프로젝트 빌드 산출물 패턴**(`node_modules`, `.git`, `dist`, `.next` 등)으로 설계됨. HOME 하위의:

- `Library/` (수만 개 캐시 파일)
- `Documents/`, `Downloads/`, `Desktop/`
- `.Trash`, iCloud Drive 동기화 디렉토리

는 제외 패턴에 없음. 결국 exclusion이 적용되어도 HOME 자체를 감시하는 한 무력함. **감시 범위(scope)가 잘못된 문제이지 필터링(filter) 문제가 아니었다.**

## 해결

### 1. `setWorkspaceWatcher(workspacePath | null)` 신설

`src/main/ipc/fs-handlers.ts`에 watcher 라이프사이클 함수 추가. 기존 watcher를 close한 뒤 새 path로 재생성. `null` 전달 시 watcher 완전 해제.

### 2. `registerFsHandlers` 시그니처에서 `cwd` 파라미터 제거

부팅 시점에 watcher를 만들지 않도록 변경. IPC 핸들러만 등록.

### 3. `WORKSPACE_OPEN` 핸들러에서 `setWorkspaceWatcher(path)` 호출

workspace 활성화 시점에만 watcher 생성. workspace 전환 시 자동 교체.

### 4. `before-quit`에서 `setWorkspaceWatcher(null)` cleanup

앱 종료 시 watcher 정상 해제.

## 영향 범위

- workspace 미선택 상태에서는 watcher 자체가 존재하지 않음 (CPU·메모리 0)
- workspace 전환 시 이전 watcher close → 새 watcher 생성 (자원 누수 없음)
- HOME은 절대 감시 대상에 포함되지 않음
- 사용자 테스트 결과 DMG idle CPU 확연히 감소 (체감 명확, 정확 수치 미측정)

## 후속 작업

- `WORKSPACE_REMOVE` 핸들러에서도 현재 active workspace가 제거되는 경우 cleanup 호출 검토
- Multi-workspace 동시 활성화 지원 시 watcher 다중 관리 구조 필요
- Phase 2: Rust 네이티브 watcher (`napi-rs` + `notify`)로 macOS 시스템 활동에도 견디는 성능 확보 ([[watcher-performance]] 참조)

## 관련 파일

- `src/main/ipc/fs-handlers.ts` — `setWorkspaceWatcher` 신설, `registerFsHandlers` 시그니처 변경
- `src/main/index.ts` — `registerFsHandlers` 호출에서 cwd 인자 제거, `before-quit` cleanup 추가
- `src/main/ipc/workspace-handlers.ts` (또는 동등 위치) — `WORKSPACE_OPEN`에서 `setWorkspaceWatcher(path)` 호출

## 관련 위키

- [[watcher-performance]] — Stage 1 exclusion이 왜 불충분했는지의 컨텍스트
- [[eperm-uv-cwd-bugfix]] — 같은 fallback cwd(`getHome()`) 패턴이 일으킨 다른 이슈
- [[macos-tcc-file-permissions]] — DMG 전용 재현, dev/DMG 환경 차이 원칙

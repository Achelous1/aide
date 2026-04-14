---
title: "EPERM uv_cwd / scandir 버그 수정 — 에이전트 스폰 및 플러그인 cwd 검증"
tags: ["bugfix", "pty", "cwd", "agent", "terminal", "eperm", "plugin"]
category: debugging
created: 2026-04-14
---

# EPERM uv_cwd / scandir 버그 수정

## 증상 1 — 터미널 에이전트 EPERM uv_cwd

AIDE에서 클로드코드(또는 다른 CLI 에이전트)를 실행할 때:

```
Error: EPERM: process.cwd failed with error operation not permitted, uv_cwd
    at wrappedCwd (node:internal/bootstrap/switches/does_own_process_state:142:28)
  errno: -1,
  code: 'EPERM',
  syscall: 'uv_cwd'
```

## 증상 2 — plugin:list scandir EPERM

플러그인 패널에서:

```
Error invoking remote method 'plugin:list': Error: EPERM: operation not permitted, scandir '/...'
```

---

## 공통 근본 원인

**패키징된 앱(Finder에서 실행)에서 `process.cwd()`가 앱 번들 경로나 `/`를 반환**한다.

### 증상 1 원인
`src/main/ipc/terminal-handlers.ts`에서 렌더러가 전달한 `options.cwd`를 검증 없이 `pty.spawn()`의 `cwd`로 사용.

```ts
// 수정 전 (문제 코드)
const cwd = options?.cwd || os.homedir();
```

존재하지 않는 경로를 cwd로 pty 프로세스를 시작하면, CLI가 `process.cwd()`를 호출하는 순간 `EPERM: uv_cwd` 크래시.

**트리거 조건**: 워크스페이스 디렉토리가 삭제됐거나, 마운트 해제됐거나, 아직 생성되지 않은 경우.

### 증상 2 원인
`src/main/index.ts`에서 `process.cwd()`를 핸들러들의 fallback cwd로 전달.

```ts
// 수정 전 (문제 코드)
registerPluginHandlers(ipcMain, process.cwd());
```

Finder로 실행된 패키징 앱에서 `process.cwd()`가 `/` 또는 앱 번들 경로를 반환 → `getLocalPluginsDir('/')` → `/.aide/plugins` 스캔 시도 → EPERM.

---

## 수정

### 수정 1 — `src/main/ipc/terminal-handlers.ts:130–131`

```ts
const rawCwd = options?.cwd || os.homedir();
const cwd = fs.existsSync(rawCwd) ? rawCwd : os.homedir();
```

### 수정 2 — `src/main/index.ts:91–99`

```ts
const fallbackCwd = getHome();  // process.cwd() → getHome()
registerFsHandlers(ipcMain, fallbackCwd);
registerPluginHandlers(ipcMain, fallbackCwd);
registerSettingsHandlers(ipcMain, fallbackCwd);
registerPluginProtocol(fallbackCwd);
```

`getHome()`은 `HOME=/` 환경을 감지하고 `os.userInfo().homedir`(getpwuid)로 폴백하는 안전한 헬퍼.

---

## 관련 패턴

CLAUDE.md "Known Pitfalls":
- `Packaging: Finder sets HOME=/ — guard all home directory access` — 동일 패턴, `process.cwd()`에도 적용됨
- `Packaging: Packaged apps don't inherit shell PATH` — 패키징 환경 신뢰 금지 원칙

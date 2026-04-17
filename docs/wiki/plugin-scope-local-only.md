---
title: "Plugin Scope Local-Only"
category: decision
tags: [plugin, mcp, migration, workspace]
created: 2026-04-17
updated: 2026-04-17
related: [[watcher-performance]]
---

# Plugin Scope Local-Only

## Context

AIDE가 프로젝트 루트에 `.mcp.json`을 자동 생성하여 사용자 코드베이스를 오염시키는 문제가 있었다. 목표는 **AIDE 생성 파일은 `.aide/` 디렉토리 외에 코드베이스에 영향을 주지 않아야 한다**는 것.

AUDIT 결과 `.mcp.json`이 workspace root에 AIDE가 생성하는 유일한 파일이었다. 제거 가능성을 검토한 결과:
- `AIDE_PLUGINS_DIR`과 `AIDE_WORKSPACE`는 `process.cwd()`에서 유도 가능
- MCP 서버(server.js)의 `safeCwd()` 폴백이 이미 이를 처리

따라서 `.mcp.json`은 **불필요**했다.

## 결정

**글로벌 플러그인 스코프를 완전히 제거**하고, 모든 플러그인을 workspace-local (`{workspace}/.aide/plugins`)로 고정한다.

### 왜 글로벌 스코프를 제거했나

1. **하나의 깔끔한 모델** — 글로벌/로컬 이중 경로는 복잡도만 증가시키고 실제 가치 없음
2. **`.mcp.json` 제거 가능** — 글로벌 경로(`AIDE_GLOBAL_PLUGINS_DIR`) 전달이 불필요해지면서 `.mcp.json`도 제거 가능
3. **사용자 코드베이스 불간섭** — 프로젝트 루트에 AIDE 생성물이 없음
4. **MCP 서버 자립** — server.js가 cwd에서 경로 유도, 환경 변수 의존성 제거

### 거부된 대안

- **Soft deprecation with warning**: 롤백 경로를 남겨두는 대신, 하드 삭제 + 마이그레이션으로 깨끗하게 정리
- **`.mcp.json` 유지하되 AIDE 서버만 별도 config**: 결국 사용자 루트에 파일이 남으므로 목표 위배

## 구현

### 제거된 코드 (13파일)

- `src/main/mcp/server.js`: `GLOBAL_PLUGINS_DIR`, `scope` 파라미터, `AIDE_PLUGINS_DIR` env read
- `src/main/mcp/config-writer.ts`: `.mcp.json` 쓰기 블록, `AIDE_GLOBAL_PLUGINS_DIR` env
- `src/main/ipc/plugin-handlers.ts`: `getGlobalPluginsDir()`, 글로벌 watcher 2개, scope 파라미터
- `src/main/plugin/registry.ts`: `scope` 필드, `clearLocalPlugins` → `clearPlugins`
- `src/main/plugin/protocol.ts`: `findPluginHtml()` 글로벌 경로
- `src/main/index.ts`: 앱 시작 시 globalPluginsDir 생성 블록
- `src/types/ipc.ts`: `PluginInfo.scope` 필드
- `src/renderer/components/plugin/PluginPanel.tsx`: Local/Global 섹션 UI → 단일 리스트

### 마이그레이션 (`workspace-handlers.ts`)

`WORKSPACE_OPEN` 시점에 기존 `.mcp.json`을 자동 정리:

```ts
export function migrateProjectMcpJson(workspacePath: string): void {
  const mcpPath = nodePath.join(workspacePath, '.mcp.json');
  if (!fs.existsSync(mcpPath)) return;
  try {
    const config = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    if (!config.mcpServers || !('aide' in config.mcpServers)) return;

    delete config.mcpServers.aide;

    if (Object.keys(config.mcpServers).length === 0) {
      const topKeys = Object.keys(config).filter((k) => k !== 'mcpServers');
      if (topKeys.length === 0) {
        fs.unlinkSync(mcpPath); // AIDE-only → 파일 삭제
      } else {
        delete config.mcpServers;
        fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2));
      }
    } else {
      fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2));
    }
  } catch {
    /* 손상된 파일 — 건들지 않음 */
  }
}
```

**엣지 케이스 처리:**
- `.mcp.json` 없음 → no-op
- aide만 있음 → 파일 삭제
- aide + 다른 서버 → aide 키만 제거
- mcpServers 없음 → no-op
- 손상된 JSON → no-op (사용자 파일 보존)

유닛 테스트 7개로 모든 케이스 검증 (`tests/unit/migrate-mcp-json.test.ts`).

## 아키텍처 영향

### Before
```
workspace/
├── .aide/plugins/       ← 로컬 플러그인
├── .mcp.json            ← AIDE 생성 (제거 대상)
└── ...

~/.aide/plugins/         ← 글로벌 플러그인 (제거 대상)
~/.claude.json           ← env: AIDE_GLOBAL_PLUGINS_DIR (제거)
~/.gemini/settings.json  ← env: AIDE_GLOBAL_PLUGINS_DIR (제거)
~/.codex/config.toml     ← env: AIDE_GLOBAL_PLUGINS_DIR (제거)
```

### After
```
workspace/
├── .aide/plugins/       ← 유일한 플러그인 경로
└── ...

~/.claude.json           ← command + args (env 없음)
~/.gemini/settings.json  ← command + args (env 없음)
~/.codex/config.toml     ← command + args (env 없음)
```

MCP 서버는 spawn 시점의 cwd에서 `{cwd}/.aide/plugins`를 유도한다.

## 팀 실행 패턴

이 작업은 **5 Worker 병렬 + Devil's Advocate 리뷰** 패턴으로 수행되었다:

- **Layer 1 (병렬)**: server.js, config-writer.ts, protocol+index, 상태바 제거 — 파일 충돌 없음
- **Layer 2 (순차)**: ipc.ts → registry.ts → plugin-handlers.ts → PluginPanel.tsx — import 체인 의존
- **Layer 3 (Lead)**: 마이그레이션 + lint/test 검증
- **Layer 4 (DA 리뷰)**: 각 Worker 변경을 read-only Opus 에이전트가 P0-P3 심각도로 검증

DA 리뷰가 발견한 P1: `terminal-handlers.ts`의 `AIDE_PLUGINS_DIR` env allowlist 잔여 — 즉시 수정.

## 검증

- `pnpm lint`: 0 new errors
- `pnpm test`: 119/119 통과 (scope 제거로 6 테스트 감소, 마이그레이션 7 테스트 추가)
- 수동: DMG 빌드 → workspace 열기 → `.mcp.json` 생성되지 않음 확인 + 기존 파일 자동 정리 확인

## PR

- #53 `feat(plugin): remove global scope, eliminate .mcp.json from project root` (develop)

## 관련 문서

- [[watcher-performance]] — workspace-scoped watcher로의 전환 배경

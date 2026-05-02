# Migration PRD: aide → smalti (v0.2.x → v0.3.x)

> **문서 버전**: 1.0  
> **작성일**: 2026-05-02  
> **대상 릴리즈**: v0.3.1  
> **상태**: 초안(Draft)

---

## 1. 문제 정의

### 1.1 배경

smalti(구 aide)는 v0.2.0에서 브랜드 리네이밍을 수행했습니다. 사용자 데이터 디렉토리(`~/.aide/` → `~/.smalti/`), 워크스페이스 디렉토리(`<ws>/.aide/` → `<ws>/.smalti/`), Electron userData, 환경변수(`AIDE_*` → `SMALTI_*`), MCP 서버 엔트리, 커스텀 프로토콜 스킴 등 다수의 식별자가 변경되었습니다.

v0.2.2 핫픽스(commit af12c95)에서 home, userData, workspace 디렉토리 마이그레이션 스크립트가 추가되었으나, 일부 영역에서 누락이 존재합니다.

### 1.2 현재 발견된 버그: server.js sandbox alias 누락

**증상**: MCP 서버를 통해 호출된 v0.1.x plugin이 `.aide/` 경로로 데이터를 읽으려 할 때, 빈 데이터를 반환하거나 `<ws>/.aide/` 아래에 새로운 빈 파일을 생성합니다. 사용자의 칸반 보드(86개 task)가 보이지 않는 실제 사례가 보고되었습니다.

**근본 원인**: 두 개의 sandbox 구현이 존재합니다.

| 구현 | 파일 | alias rewrite | 비고 |
|------|------|---------------|------|
| Electron 앱 내 sandbox | `src/main/plugin/sandbox.ts` | **있음** (`resolveWorkspaceRel()`) | v0.2.2에서 추가됨 |
| MCP server standalone sandbox | `src/main/mcp/server.js` | **없음** | DRY 위반 — 동일 로직을 중복 구현했으나 alias를 누락 |

`sandbox.ts:25`의 `resolveWorkspaceRel()` 함수는 `filePath.replace(/^(\.\/?)?\.aide(\/|$)/, '$1.smalti$2')`로 `.aide/` 접두사를 `.smalti/`로 rewrite합니다. 그러나 `server.js:78`의 `scopedFs.read()`는 `path.resolve(ws, fp)`만 수행하므로, `.aide/data.json`이라는 경로가 그대로 `<ws>/.aide/data.json`으로 resolve됩니다.

**영향 범위**: MCP를 통해 plugin을 호출하는 모든 외부 에이전트(Claude, Gemini, Codex)가 영향을 받습니다. Electron 앱 내부의 iframe 기반 plugin 호출은 `sandbox.ts`를 거치므로 정상 동작합니다.

### 1.3 마이그레이션 누락 영역 식별

전체 코드베이스 감사 결과, 아래 누락/위험 영역이 식별되었습니다:

1. **server.js sandbox alias** (P0 — 실제 데이터 유실 버그) — 본 작업의 T2에서 패치 완료
2. **Migration 테스트 0건** — 단위 테스트가 전혀 없어 회귀 방지가 불가능
3. **server.js 문서 문자열 내 `.aide/` 참조** — 에이전트에게 잘못된 경로를 안내
4. **home migration marker 재실행 정책 불명확** — marker 존재 시 `.aide` 재출현에 대한 처리가 문서화되지 않음
5. **Back-compat drop 일정 미정의** — 6개 이상의 legacy alias에 구체적 만료 버전 없음

---

## 2. 마이그레이션 영역 매트릭스

| # | 영역 | 옛 위치/식별자 | 새 위치/식별자 | 현재 상태 | 이슈 |
|---|------|---------------|---------------|-----------|------|
| M1 | Home 데이터 디렉토리 | `~/.aide/` | `~/.smalti/` | **완료** | `migrate-aide-data.ts` — rename-first, merge fallback, marker 기록. 단, marker 존재 시 재실행 정책이 코드에만 존재하고 문서화 안 됨 |
| M2 | Electron userData | `~/Library/Application Support/aide/` (macOS) | `.../Smalti/` | **완료** | `migrate-aide-userdata.ts` — `aide`, `AIDE` 두 후보 검색. `migrateAideUserData(app.getPath('userData'))` |
| M3 | Workspace 데이터 디렉토리 | `<ws>/.aide/` | `<ws>/.smalti/` | **완료** | `migrate-aide-workspace.ts` — WORKSPACE_OPEN 시점 호출 |
| M4 | MCP global config (Claude) | `~/.claude.json` → `mcpServers.aide` | `mcpServers.smalti` | **완료** | `config-writer.ts:77-81` — `aide` 키 삭제 + `smalti` 등록. `~/.claude.json`과 `~/.mcp.json`에서 legacy 엔트리 unregister |
| M5 | MCP global config (Gemini) | `~/.gemini/settings.json` → `mcpServers.aide` | `mcpServers.smalti` | **완료** | `config-writer.ts:162` — `registerJsonMcpConfig()` 내부에서 aide→smalti 마이그레이션 |
| M6 | MCP global config (Codex) | `~/.codex/config.toml` → `[mcp_servers.aide]` | `[mcp_servers.smalti]` | **완료** | `config-writer.ts:173` — TOML section 교체 |
| M7 | Workspace `.mcp.json` | `<ws>/.mcp.json` → `mcpServers.aide` | 삭제 | **완료** | `migrateProjectMcpJson()` — aide 엔트리만 삭제. `smalti`는 `--mcp-config`로 별도 전달하므로 workspace-level 등록 불필요 |
| M8 | 환경변수 | `AIDE_WORKSPACE` | `SMALTI_WORKSPACE` | **완료 (back-compat 유지)** | `env-compat.ts` — `SMALTI_*` 우선, `AIDE_*` fallback. `terminal-handlers.ts:148` — allowlist에 양쪽 포함. `server.js:19` — 양쪽 fallback |
| M9 | 커스텀 프로토콜 스킴 | `aide-plugin://`, `aide-cdn://` | `smalti-plugin://`, `smalti-cdn://` | **완료 (back-compat 유지)** | `protocol.ts`, `cdn-protocol.ts` — 양쪽 스킴 모두 등록 |
| M10 | MCP tool 이름 | `aide_create_plugin` 등 | `smalti_create_plugin` 등 | **완료 (back-compat 유지)** | `server.js:388-393` — deprecated alias 매핑 + 경고 |
| M11 | MCP server script 위치 | `~/.aide/aide-mcp-server.js` | `~/.smalti/smalti-mcp-server.js` | **완료** | `config-writer.ts:56`. `index.ts:132-146` — dead-path 정리 |
| M12 | **Sandbox alias (Electron)** | plugin이 `.aide/` 경로 사용 | `.smalti/`로 rewrite | **완료** | `sandbox.ts:21-27` — `resolveWorkspaceRel()` |
| M13 | **Sandbox alias (MCP server)** | plugin이 `.aide/` 경로 사용 | `.smalti/`로 rewrite | **완료(T2 패치)** | `server.js`에 동등 함수 inline 추가 |
| M14 | Plugin 전역 객체 | `aide.fs`, `aide.plugin` 등 | 유지 (`window.aide`) | **의도적 유지** | `sandbox.ts:145`, `server.js:101` — plugin API 식별자. breaking change 방지를 위해 유지 |
| M15 | PostMessage 프로토콜 | `aide:file-event`, `aide:invoke` 등 | 유지 | **의도적 유지** | `protocol.ts:104`, `PluginView.tsx:19-43` — iframe 통신 프로토콜. 변경 시 모든 기존 plugin HTML이 깨짐 |
| M16 | Preload API | `window.aide` (contextBridge) | 유지 | **의도적 유지** | `preload/index.ts:212` — renderer 전역 API. 내부 코드 전체가 의존 |
| M17 | server.js 문서 문자열 | `.aide/settings.json`, `AIDE` 등 참조 | `.smalti/settings.json` 등 | **미완료 — P2** | L241, L319 등 에이전트에게 노출되는 설명 텍스트에 구버전 경로/브랜드명 잔존 |
| M18 | CDN 캐시 디렉토리 | `~/.aide/cdn-cache/` | `~/.smalti/cdn-cache/` | **완료 (M1에 포함)** | home directory 전체 마이그레이션에 포함. `cdn-protocol.ts:52` — `~/.smalti/cdn-cache/` 하드코딩 |
| M19 | 단위 테스트 | N/A | 없음 | **누락 — P0** | migration 관련 `*.test.ts` 파일 0개 (T4에서 추가) |

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-1: MCP sandbox alias (P0) — T2 완료

**조건**: v0.1.x에서 생성된 plugin이 `require('fs').readFileSync('.aide/data.json', 'utf-8')` 형태로 데이터에 접근할 때  
**결과**: MCP server의 `scopedFs`가 경로를 `.smalti/data.json`으로 rewrite하여 마이그레이션된 데이터를 정상 반환합니다.  
**검증 방법**:
- 단위 테스트: `scopedFs.read('.aide/foo.json')` 호출 시 `path.resolve(ws, '.smalti/foo.json')`으로 resolve되는지 assert
- 단위 테스트: `scopedFs.write('.aide/bar.json', data)` 호출 시 동일하게 rewrite 확인
- 단위 테스트: `scopedFs.existsSync('.aide/dir')` — rewrite 확인
- 통합 테스트: MCP 프로토콜로 `smalti_invoke_tool` 호출 시 legacy path plugin이 정상 데이터 반환

### AC-2: Sandbox alias 동등성 (P0)

**조건**: `sandbox.ts`의 `resolveWorkspaceRel()`과 `server.js`의 path resolution이 동일한 입력에 대해  
**결과**: 동일한 출력 경로를 생성합니다.  
**검증 방법**:
- 속성 기반 테스트: 랜덤 경로 패턴(`'.aide/x'`, `'./.aide/y'`, `'a/.aide/z'`, `'normal/path'`)에 대해 양쪽 구현의 결과가 동일한지 비교
- 비rewrite 대상 경로(`.aide/`가 첫 번째 세그먼트가 아닌 경우)도 동일하게 통과하는지 확인

### AC-3: Migration 멱등성 (P1)

**조건**: `migrateAideToSmalti()`를 N회(N >= 2) 연속 호출할 때  
**결과**: 1회 호출과 동일한 파일 시스템 상태를 생성하며, 에러 없이 완료됩니다.  
**검증 방법**:
- `migrate-aide-data.ts`: (a) `~/.aide` 존재 → 1회 호출 → 성공 → 2회 호출 → `skipped: 'no-aide-dir'`
- `migrate-aide-workspace.ts`: 동일 패턴
- `migrate-aide-userdata.ts`: 동일 패턴

### AC-4: 부분 실패 복구 (P1)

**조건**: merge 도중 일부 파일만 이동된 상태에서 프로세스가 재시작될 때  
**결과**: 재실행 시 나머지 파일이 정상적으로 머지되며, 이미 이동된 파일은 dest-wins 정책에 따라 유지됩니다.

### AC-5: MCP global config 마이그레이션 (P1)

**조건**: `~/.claude.json`, `~/.gemini/settings.json`, `~/.codex/config.toml`에 `aide` 엔트리가 존재할 때  
**결과**: `smalti` 엔트리로 교체되며, 다른 MCP 서버 설정은 보존됩니다.

### AC-6: CDN 캐시 연속성 (P2)

**조건**: `~/.aide/cdn-cache/` 캐시 파일이 마이그레이션 후  
**결과**: `smalti-cdn://` 요청 시 캐시 히트로 서빙됩니다.

### AC-7: server.js 문서 정확성 (P2)

**조건**: `tools/list` description이  
**결과**: `.smalti/settings.json`, `Smalti` 브랜드를 표시합니다.

### AC-8: 회귀 방지 테스트 존재 (P0)

**결과**: `pnpm test`에 migration 관련 테스트 스위트가 포함되며 모든 AC의 핵심 시나리오를 커버합니다.

---

## 4. 설계 원칙

### 4.1 멱등성

모든 마이그레이션 함수는 N회 호출 시 1회 호출과 동일한 결과를 보장합니다.

- **marker 파일** (`<target>/.migrated-from-aide`): migration 완료 기록. marker가 존재하더라도 source(`.aide`)가 재출현한 경우 방어적으로 재머지를 시도합니다.
- **skipped 반환**: source 부재 시 즉시 `{ migrated: false, skipped: 'no-aide-dir' }` 반환.
- **중복 marker 방지**: marker 존재 시 다시 쓰지 않습니다.

### 4.2 부분 실패 복구

`mergeDirectory()`는 파일 단위 이동이며, 개별 파일 실패는 `warnings`로 기록하고 나머지 처리를 계속합니다.

### 4.3 Rename-first / Merge-fallback 정책

1. **Rename-first**: dest 부재 시 `fs.rename()` 단일 syscall (same-fs O(1))
2. **EXDEV fallback**: cross-filesystem이면 `fs.cp()` + `fs.rm()`
3. **Merge-fallback**: dest 존재 시 파일 단위 머지

### 4.4 Marker 파일

| marker 위치 | 의미 |
|-------------|------|
| `~/.smalti/.migrated-from-aide` | Home 마이그레이션 완료 |
| `<ws>/.smalti/.migrated-from-aide` | 워크스페이스 마이그레이션 완료 |
| `<userData>/.migrated-from-aide` | userData (aide 출처) |
| `<userData>/.migrated-from-AIDE` | userData (AIDE 출처) |

### 4.5 Back-compat 정책 (의도적 유지)

| 식별자 | 유형 | drop 대상 버전 | 사유 |
|--------|------|---------------|------|
| `AIDE_WORKSPACE` env var | 환경변수 | v0.4.0 | server.js, terminal-handlers fallback |
| `aide_create_plugin` 등 5개 tool alias | MCP tool 이름 | v0.4.0 | agent의 캐시된 구 이름 |
| `aide-plugin://` 프로토콜 | Electron 커스텀 스킴 | v0.4.0 | 기존 plugin HTML 하드코딩 |
| `aide-cdn://` 프로토콜 | Electron 커스텀 스킴 | v0.4.0 | 기존 plugin HTML 하드코딩 |
| `window.aide` (preload API) | 전역 객체 | **무기한 유지** | 내부 + 모든 plugin 의존 |
| `aide:file-event` 등 postMessage | iframe 프로토콜 | **무기한 유지** | plugin iframe 통신 핵심 |
| `aide.fs`, `aide.plugin` (sandbox 전역) | Plugin sandbox API | **무기한 유지** | 모든 생성된 plugin code 의존 |
| `.aide/` sandbox alias rewrite | Sandbox path 변환 | **무기한 유지** | 사용자 워크스페이스 구 plugin이 존재하는 한 필요 |

---

## 5. 구현 계획 (High-Level)

### 5.1 Sandbox alias DRY refactor (선택지 D 권고)

**제약**: server.js는 `?raw` import로 Vite에서 문자열로 읽혀 main process 번들에 포함되므로 TS module 직접 import 불가.

**선택지 D (권고)**: server.js에 alias 로직 inline + sandbox.ts 동등성 검증 속성 테스트.

### 5.2 server.js 누락 alias 즉시 패치 — **T2 완료**

`scopedFs` 9개 메서드(`read`, `write`, `existsSync`, `readFileSync`, `writeFileSync`, `mkdirSync`, `readdirSync`, `statSync`, `unlinkSync`)에 alias rewrite 적용.

### 5.3 마이그레이션 스크립트 보강

1. home migration marker 재실행 동작 JSDoc 명시
2. `migrateProjectMcpJson()`에서 `smalti` 키도 정리

### 5.4 통합 테스트 (T4)

| 테스트 파일 | 커버리지 |
|------------|----------|
| `src/main/__tests__/migrate-aide-data.test.ts` | AC-3, AC-4 |
| `src/main/__tests__/migrate-aide-workspace.test.ts` | AC-3 |
| `src/main/__tests__/migrate-aide-userdata.test.ts` | AC-3 |
| `src/main/mcp/__tests__/server-sandbox-alias.test.ts` | AC-1, AC-2 (T2에서 일부 추가) |
| `src/main/mcp/__tests__/config-writer-migration.test.ts` | AC-5 |

### 5.5 server.js 문서 문자열 업데이트

| 현재 | 수정 후 |
|------|---------|
| `aide_create_plugin` (CREATE_PLUGIN_DESC 내) | `smalti_create_plugin` |
| `.aide/settings.json` | `.smalti/settings.json` |
| `AIDE into all iframes` | `Smalti into all iframes` |

`window.aide` 관련 참조는 실제 API 이름이므로 변경하지 않습니다.

---

## 6. 회귀 방지

### 6.1 Sandbox 동등성 테스트

```typescript
const testCases = [
  '.aide/data.json',
  './.aide/plugins/todo/data.json',
  'normal/path.txt',
  '.aide',
  '.aide/',
  'a/.aide/nested',
  '../.aide/escape',
];

for (const input of testCases) {
  const tsResult = resolveWorkspaceRel('/ws', input);
  const jsResult = serverResolveWorkspaceRel('/ws', input);
  expect(tsResult).toBe(jsResult);
}
```

### 6.2 CLAUDE.md Known Pitfalls 추가

> **MCP server.js: sandbox alias는 sandbox.ts와 동기화 필수**  
> `server.js`는 `?raw` import되는 standalone JS로, `sandbox.ts`의 `resolveWorkspaceRel()`을 import할 수 없습니다. server.js 내부에 동등 로직을 inline으로 유지하며, `server-sandbox-alias.test.ts`가 양쪽의 동등성을 검증합니다. `sandbox.ts`의 alias 로직을 변경할 때는 반드시 server.js의 inline 로직도 함께 업데이트하십시오.

---

## 7. 비범위 (Out of Scope)

### 7.1 기존 plugin source code의 `.aide/` hardcode 일괄 rewrite

사용자 워크스페이스 plugin의 JS 소스 직접 수정은 제외. sandbox alias가 런타임에 처리하므로 불필요.

### 7.2 `window.aide` → `window.smalti` rename

renderer 전체, plugin iframe, global.d.ts 등 60+ 변경 발생. 별도 프로젝트.

### 7.3 Legacy productName 복원

Electron `productName` 변경은 `migrateAideUserData()`로 이미 처리.

### 7.4 CI/CD 파이프라인의 aide 참조 정리

별도 진행.

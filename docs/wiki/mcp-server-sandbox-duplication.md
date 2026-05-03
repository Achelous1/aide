---
title: "MCP server.js sandbox duplicates plugin/sandbox.ts"
category: debugging
tags: [mcp, sandbox, plugin, migration, ?raw-import, dry]
created: 2026-05-02
updated: 2026-05-02
related: [[plugin-scope-local-only]], [[rust-core-migration]]
---

# MCP server.js sandbox duplicates plugin/sandbox.ts

Plugin sandbox 로직이 두 곳에 중복 구현되어 있고, 둘 사이의 동기화가 깨졌을 때 사용자 데이터가 사라진 것처럼 보이는 P0 버그가 발생했다. v0.3.1에서 alias를 양쪽에 정렬하고 동등성 속성 테스트로 회귀를 차단했다.

## 증상

v0.1.x 시절 만들어진 plugin이 hardcode한 `<workspace>/.aide/...` 경로를 MCP를 거쳐 호출하면 빈 데이터가 반환되거나 빈 파일이 새로 생성되었다. 같은 plugin을 Electron 앱 내부 iframe에서 호출하면 정상 동작했다. 본 사용자는 agent-todo-board 칸반에 86개 task가 저장되어 있었지만 Claude/Gemini/Codex agent가 호출할 때마다 0건 또는 새로 생성된 빈 보드를 봤다.

## 재현 경로

1. v0.1.x 워크스페이스에서 만든 plugin이 `const DEFAULT_FILE = '.aide/<name>.json';` 류로 데이터 파일 경로를 hardcode (예: `.smalti/plugins/agent-todo-board/src/index.js`)
2. v0.2.0 리브랜드 후 워크스페이스 데이터가 `<ws>/.smalti/`로 이동(`migrate-aide-workspace.ts`로 자동 마이그레이션)
3. Plugin은 여전히 코드 안에서 `.aide/`를 들고 있음 — plugin source는 사용자 워크스페이스 산물이라 일괄 rewrite 불가
4. Electron 앱 내부의 iframe→`src/main/plugin/sandbox.ts` 경로는 v0.2.2 핫픽스(commit `af12c95`)가 추가한 `resolveWorkspaceRel()`이 `.aide/` → `.smalti/` 자동 alias rewrite ✅
5. MCP를 거치는 외부 agent 호출(Claude/Gemini/Codex)은 `src/main/mcp/server.js`의 별도 sandbox 구현을 거치는데, 이 쪽엔 alias가 없음 ❌
6. 결과적으로 `.aide/...` 경로가 `path.resolve(ws, fp)`로 그대로 풀려 존재하지 않는 디렉토리를 시도, 또는 새 빈 파일을 생성함

## 근본 원인

**Plugin sandbox 로직이 두 파일에 독립적으로 구현되어 있다.**

| 구현 위치 | 사용 경로 | v0.2.2 alias 적용 |
|----------|----------|-------------------|
| `src/main/plugin/sandbox.ts` | Electron renderer → main → vm context (앱 내부 plugin invoke) | ✅ `resolveWorkspaceRel()` |
| `src/main/mcp/server.js` | MCP stdio JSON-RPC → 자체 vm context (Claude/Gemini/Codex MCP plugin invoke) | ❌ 누락 |

중복이 발생한 구조적 이유는 빌드 시스템 제약이다. `server.js`는 `src/main/mcp/config-writer.ts`가 `?raw` import로 읽어 standalone JS로 `~/.smalti/smalti-mcp-server.js`에 dump한다. 따라서 TypeScript module(`sandbox.ts`)을 import할 수 없다. v0.2.2 핫픽스가 sandbox.ts에만 alias를 추가하고 server.js의 동일 로직을 빠뜨려도 빌드/타입 시스템이 이를 잡지 못한다.

## 수정 (v0.3.1, PR #143)

1. **Inline 복제**: `server.js`에 동일 의미의 `resolveWorkspaceRel(ws, fp)`를 inline으로 추가하고, `scopedFs`의 모든 9개 fs 메서드(`read`, `write`, `existsSync`, `readFileSync`, `writeFileSync`, `mkdirSync`, `readdirSync`, `statSync`, `unlinkSync`)에서 `path.resolve(ws, fp)` 직전에 호출.

2. **동등성 속성 테스트**: `tests/unit/server-sandbox-alias.test.ts`에 양쪽 sandbox의 regex 리터럴을 소스에서 직접 추출해 문자열 비교하는 테스트, 그리고 8개 입력 케이스(`.aide/x`, `./.aide/y`, `a/.aide/z`, 절대 경로, mid-segment 등)에 대해 양쪽 함수 결과가 동일한지 검증하는 테스트 추가. 한쪽 regex가 변경되면 CI에서 즉시 실패.

3. **Workspace boundary 안전성**: alias rewrite는 `assertInWs()` 이전에 적용. `.aide/../../escape` 같은 탈출 시도가 alias 후에도 boundary check에 걸리는지 별도 테스트로 검증.

4. **CLAUDE.md "Known Pitfalls"** 항목 추가:

   > **MCP server.js: sandbox alias는 sandbox.ts와 동기화 필수**
   > server.js는 `?raw` import되는 standalone JS로, sandbox.ts의 `resolveWorkspaceRel()`을 import할 수 없다. server.js 내부에 동등 로직을 inline으로 유지하며 `tests/unit/server-sandbox-alias.test.ts`가 양쪽의 동등성을 검증한다. sandbox.ts의 alias 로직을 변경할 때는 반드시 server.js의 inline 로직도 함께 업데이트할 것.

## 재발 방지

- **테스트 회귀 가드**: `pnpm test`가 동등성을 매번 검증. 한쪽 regex 변경 시 즉시 실패.
- **CLAUDE.md 명시화**: 향후 sandbox 변경 작업자가 두 파일을 함께 봐야 한다는 규약을 텍스트로 박음.
- **새 plugin generator 가이드**: `server.js`의 `CREATE_PLUGIN_DESC`에 워크스페이스 데이터 경로 컨벤션(`<workspace>/.smalti/...`) 명시. 새 plugin은 `.aide/` hardcode를 시작부터 안 하도록 LLM 가이드.

## 비범위 (PRD §7.1)

- **Plugin source의 `.aide/` hardcode 일괄 rewrite는 수행하지 않음.** Plugin 소스는 사용자 워크스페이스 산물이며, 자동 수정은 의도하지 않은 부작용(주석 내 참조, 문자열 리터럴 등)을 일으킬 수 있다. Sandbox alias가 런타임에 투명하게 처리하므로 소스 수정은 불필요.
- **`window.aide`, `aide:file-event`, `aide.fs` 등 API 식별자는 무기한 유지.** 이들은 plugin iframe 통신 프로토콜 + preload contextBridge API + sandbox 전역의 일부이며, rename은 모든 기존 plugin HTML을 깨뜨린다. PRD §4.5에 명시.

## 장기 정리 (선택)

DRY 위반은 동등성 테스트가 가드하지만 코드 자체는 여전히 두 곳에 있다. 더 깔끔한 해소 방법은:

- **Vite plugin으로 빌드 시 alias 코드를 server.js에 주입**: `?raw` import 결과 문자열을 후처리해 sandbox.ts의 함수를 prepend. 빌드 파이프라인 복잡도 증가 — 현재는 비범위(PRD §5.1 선택지 D 채택).

## 관련 파일

- `src/main/plugin/sandbox.ts` — Electron 앱 내부 plugin sandbox + `resolveWorkspaceRel()` 원본
- `src/main/mcp/server.js` — MCP standalone sandbox + alias inline 복제본 (v0.3.1)
- `tests/unit/server-sandbox-alias.test.ts` — 23개 테스트, 동등성 속성 테스트 포함
- `docs/spec/migration-prd.md` — Migration PRD (19 surface areas, 8 ACs, back-compat 정책)
- PR [#143](https://github.com/Achelous1/smalti/pull/143) (fix), v0.3.1 release commit `44bfb83`

**한국어** · [English](./README.md)

# AIDE — AI 기반 IDE

> CLI 코드 에이전트(Claude Code, Gemini CLI, Codex CLI)를 통합한 터미널 중심 IDE. **Create n Play** 시스템으로 자연어를 통해 플러그인을 즉시 생성합니다.

---

## Overview

AIDE는 단 하나의 핵심 아이디어를 중심으로 만들어진 Electron 기반 IDE입니다: **IDE가 사용자에게 맞춰져야지, 그 반대가 되어서는 안 된다**. 마켓플레이스에서 미리 만들어진 플러그인 수십 개를 설치하는 대신, 원하는 기능을 자연어로 설명하면 AI 에이전트가 즉시 동작하는 플러그인을 생성합니다. 생성된 플러그인은 샌드박스 환경에서 실행되며, AI 도구로 자동 등록되어 사용자와 AI 어시스턴트 모두가 즉시 사용할 수 있습니다.

AIDE는 LLM API를 직접 호출하지 않습니다. `node-pty`를 통해 CLI 에이전트(`claude`, `gemini`, `codex`)를 PTY 프로세스로 spawn하므로, 각 에이전트가 자체 인증을 관리하고 사용자가 자신의 LLM 제공자 관계를 완전히 통제할 수 있습니다.

---

## Why need it

기존 IDE(IntelliJ, VSCode)에는 거대한 플러그인 생태계가 있지만:

- 대부분의 플러그인이 실제 필요보다 과도하게 설계되어 있음
- 정확히 원하는 한 가지만 하는 플러그인을 찾기 어려움
- 직접 플러그인을 만들려면 무거운 SDK와 빌드 파이프라인을 학습해야 함
- IDE, 터미널, AI 채팅 사이를 오가는 컨텍스트 전환 비용이 작업 속도를 떨어뜨림

AIDE는 이 스택을 압축합니다:

- **하나의 워크스페이스**에서 터미널, AI 에이전트, 파일 트리, Git, 플러그인 UI를 모두 처리
- **자연어 플러그인** 덕분에 "내 IDE가 X를 할 수 있으면 좋겠다"의 한계 비용이 한 문장으로 떨어짐
- **CLI 우선** 구조로 사용자가 원하는 에이전트와 인증을 직접 가져옴 — 벤더 락인 없음

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **멀티 에이전트 터미널** | Claude Code, Gemini CLI, Codex CLI, 일반 셸을 동시에 실행. 각 탭은 독립된 PTY 세션이며 256색 ANSI, 상태 감지, 세션 저장/복원 지원 |
| **분할 화면 레이아웃** | 최대 3×2 그리드 분할 가능. 탭을 다른 pane으로 드래그하거나 pane 가장자리에 드롭해 새 분할 생성. 워크스페이스별 레이아웃 영속화 |
| **워크스페이스 관리** | 멀티 프로젝트 네비게이션, 최근 프로젝트 히스토리, 워크스페이스별 탭/레이아웃/플러그인 상태, 앱 시작 시 자동 복원 |
| **플러그인 시스템 (Create n Play)** | MCP를 통한 자연어 플러그인 생성. VM 샌드박스 + 권한 기반 파일시스템 접근 + iframe 탭 UI 렌더링 |
| **핫 리로드** | 플러그인 코드, HTML, 디스크 추가가 AIDE 재시작 없이 즉시 반영. AI가 새로 생성한 플러그인이 패널에 곧바로 표시됨 |
| **오프라인 CDN** | 플러그인이 `aide-cdn://` 프로토콜로 외부 라이브러리를 로드하면 로컬 캐시에 저장되어 오프라인에서도 동작 |
| **에이전트 상태 인디케이터** | 모든 에이전트 세션의 실시간 상태(idle / processing / awaiting input)를 워크스페이스 nav에 시각화 |
| **테마 시스템** | 다크/라이트 테마, 부드러운 전환 애니메이션, JetBrains Mono 타이포그래피, 에이전트별 액센트 컬러 |

---

## 주요 기능 — 플러그인 생성 방법

AIDE 플러그인은 AI 에이전트와의 자연어 대화로 완전히 생성됩니다. 별도의 SDK도, 보일러플레이트 생성기도, 빌드 단계도 필요 없습니다.

### Create n Play 흐름

```
사용자: "사용하지 않는 TypeScript import를 하이라이트하고
         원클릭으로 삭제할 수 있는 플러그인 만들어줘"

에이전트: (MCP aide_create_plugin 도구 호출)
         → plugin.spec.json 생성 (id, name, permissions, tools)
         → 플러그인 소스 코드 생성 (CommonJS 모듈)
         → AIDE 디자인 토큰을 사용한 index.html UI 생성
         → 에이전트가 이후 호출할 수 있도록 MCP 도구로 등록

AIDE:    플러그인이 Plugins 패널에 즉시 표시됨. ON 토글로 활성화.
         "Open as tab" 클릭 시 pane 안에서 UI 렌더링
```

### 플러그인 구조

```
.aide/plugins/my-plugin/
├── plugin.spec.json   # id, name, 권한, 도구 정의
├── tool.json          # MCP에 노출되는 도구 매니페스트
├── src/index.js       # CommonJS 모듈: invoke(toolName, args)
├── index.html         # iframe UI (window.aide shim 자동 주입)
├── mcp/               # MCP 전용 자산
└── skill/             # skill 자산
```

### 샌드박스 보안 보장

- 플러그인은 `node:vm` 컨텍스트에서 실행 — `child_process`, `net`, 무제한 `fs` 접근 불가
- `require('fs')`는 플러그인이 선언한 권한(`fs:read`, `fs:write`) 기반으로 게이팅되며 워크스페이스 범위로 제한
- iframe UI는 커스텀 `aide-plugin://` origin 위에서 `sandbox="allow-scripts"`로 실행 (호스트 앱과 격리된 자체 opaque origin)
- 외부 라이브러리는 허용된 CDN 호스트로부터 `aide-cdn://`을 통해서만 로드 가능

### 플러그인 스코프

| 스코프 | 위치 | 용도 |
|---|---|---|
| **Local** | `<workspace>/.aide/plugins/` | 프로젝트별 도구 (한 레포에 특화된 린터, 포매터, 코드 생성기 등) |
| **Global** | `~/.aide/plugins/` | 모든 워크스페이스에서 재사용 가능한 도구 |

런타임에 추가된 플러그인(MCP, 파일 매니저, 수동 복사 등 어떤 경로든)은 앱 재시작 없이 자동으로 발견됩니다.

---

## 설치 방법

### 요구사항

- **macOS** (Apple Silicon 또는 Intel) — Windows / Linux 빌드는 예정
- **Node.js** ≥ 18
- **pnpm** (프로젝트가 `node-linker=hoisted`를 사용하므로 npm/yarn은 그대로는 동작하지 않음)

### CLI 에이전트 (선택)

AIDE는 설치된 에이전트를 자동으로 감지합니다. 사용하는 것만 설치하면 됩니다:

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Gemini CLI
npm install -g @google/gemini-cli

# Codex CLI
npm install -g @openai/codex
```

각 CLI는 자체 인증을 관리합니다 (`claude login`, `gemini auth` 등).

### 소스에서 실행

```bash
git clone https://github.com/Achelous1/aide.git
cd aide
pnpm install
pnpm start    # HMR 개발 서버
```

### 배포본 빌드

```bash
sh build.sh   # macOS — out/AIDE.dmg 생성
```

빌드 스크립트는 의존성 설치, lint, 패키징, 드래그-드롭 인스톨러 레이아웃 DMG 생성을 모두 처리합니다.

---

## 아키텍처

AIDE는 엄격한 보안 경계를 갖는 Electron 3-프로세스 모델을 따릅니다.

```
┌──────────────────────────────────────────────────────────┐
│                      Renderer Process                      │
│  React + TypeScript + Tailwind + Zustand                   │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │ Workspace   │ │ Pane Tree  │ │ Plugin iframes        │ │
│  │ Nav         │ │ (split)    │ │ (aide-plugin://)      │ │
│  └─────────────┘ └────────────┘ └──────────────────────┘ │
│           ↑                   ↓                            │
│           └─── window.aide ───┘  (contextBridge)           │
└──────────────────────────────────────────────────────────┘
                            ↕  IPC
┌──────────────────────────────────────────────────────────┐
│                       Preload Script                      │
│  렌더러에 타입 안전 API 표면 노출                            │
└──────────────────────────────────────────────────────────┘
                            ↕  IPC
┌──────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                 │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │ Terminal    │ │ Plugin     │ │ MCP Server           │ │
│  │ (node-pty)  │ │ Registry   │ │ (NDJSON over stdio)  │ │
│  └─────────────┘ └────────────┘ └──────────────────────┘ │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │ FS / Git    │ │ VM Sandbox │ │ Custom Protocols     │ │
│  │ Watchers    │ │            │ │ (aide-plugin/cdn)    │ │
│  └─────────────┘ └────────────┘ └──────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 보안 경계

- 모든 렌더러 윈도우에서 `contextIsolation: true`, `nodeIntegration: false`
- Node.js 접근은 모두 preload 스크립트의 `contextBridge`를 통해서만 가능
- 플러그인 iframe은 커스텀 `aide-plugin://` 프로토콜로 서빙되어 자체 opaque origin을 가짐
- CDN 자산은 호스트 허용 목록과 디스크 캐시를 갖는 `aide-cdn://`을 통해 프록시
- 플러그인 VM 샌드박스의 `require()`는 명시적 shim으로 `path`와 권한 기반 `fs`만 허용

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| **Shell** | Electron + electron-forge (Vite 플러그인) |
| **UI** | React 19, TypeScript 5, Tailwind CSS 3 |
| **상태 관리** | Zustand 5 |
| **터미널** | xterm.js + node-pty |
| **영속화** | electron-store (워크스페이스별 세션) |
| **플러그인 샌드박스** | Node.js `vm` 모듈 + 스코프 `require` |
| **커스텀 프로토콜** | `aide-plugin://`, `aide-cdn://` |
| **테스트** | Vitest (단위), Playwright (E2E) |
| **패키지 매니저** | pnpm (`node-linker=hoisted`) |
| **타이포그래피** | JetBrains Mono (주), IBM Plex Mono (보조) |

---

## MCP 연동

AIDE는 **Model Context Protocol** 서버를 내장하여 모든 MCP 호환 에이전트에게 플러그인 도구를 노출합니다.

### MCP 서버의 역할

AIDE 시작 시 자체 완결형 MCP 서버 스크립트를 `~/.aide/aide-mcp-server.js`에 작성하고 각 에이전트의 글로벌 설정에 등록합니다:

| 에이전트 | 설정 파일 | 형식 |
|---|---|---|
| Claude Code | `~/.claude.json` | JSON (`mcpServers` 키) |
| Gemini CLI | `~/.gemini/settings.json` | JSON (`mcpServers` 키) |
| Codex CLI | `~/.codex/config.toml` | TOML (`[mcp_servers.aide]`) |

서버는 에이전트 호출마다 독립된 Node 프로세스로 실행되며 stdio 위의 NDJSON으로 통신합니다.

### 빌트인 도구

| 도구 | 목적 |
|---|---|
| `aide_create_plugin` | 자연어 설명으로부터 새 플러그인 생성 (spec, 코드, HTML 생성 + 도구 등록) |
| `aide_edit_plugin` | 기존 플러그인의 코드, HTML, spec을 in-place로 패치 |
| `aide_delete_plugin` | 플러그인 제거 및 파일 정리 |
| `aide_list_plugins` | 설치된 모든 플러그인과 도구 목록 조회 |
| `aide_invoke_tool` | 에이전트가 임의의 플러그인 도구 호출 |

### 동적 도구 등록

플러그인이 선언한 모든 `tools`는 `plugin_<plugin-name>_<tool-name>` 네임스페이스로 자동 노출됩니다. `format` 도구를 가진 `json-formatter` 플러그인을 만들면, 에이전트는 즉시 `plugin_json-formatter_format`이라는 호출 가능한 도구를 갖게 됩니다 — 재시작 불필요.

### Plugin → AIDE → Plugin 호출 체인

```
사용자 → 에이전트: "이 JSON 파일 포맷팅해줘"
에이전트 → MCP: plugin_json-formatter_format({path: "data.json"})
MCP → 플러그인 샌드박스: invoke("format", {path: "data.json"})
플러그인 → fs (스코프): readFileSync, JSON.parse, JSON.stringify, writeFileSync
플러그인 → 반환: {success: true, lines: 42}
MCP → 에이전트: 도구 결과
에이전트 → 사용자: "42줄 포맷팅 완료."
```

같은 플러그인의 iframe UI도 브라우저 측에서 `window.aide.invoke('json-formatter', 'format', {...})`로 동일한 도구를 호출할 수 있으며, 플러그인끼리도 같은 채널로 서로의 도구를 호출할 수 있습니다.

---

## 라이선스

[LICENSE](./LICENSE) 참조.

## 기여

이슈와 PR은 [github.com/Achelous1/aide](https://github.com/Achelous1/aide)에서 환영합니다.

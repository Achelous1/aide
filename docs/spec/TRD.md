# smalti - Technical Requirements Document (MVP)

## Overview

smalti는 CLI 기반 AI 코드 에이전트(Claude Code, Gemini CLI, Codex CLI)를 통합하는 Electron 앱이다. 직접 LLM API를 호출하지 않고, 각 에이전트의 네이티브 프로토콜(MCP, function calling 등)을 활용한다.

---

## Tech Stack

| 항목 | 선택 | 근거 |
|------|------|------|
| Framework | Electron + electron-forge | 가장 큰 커뮤니티, 공식 문서 풍부, 플러그인 생태계 |
| Frontend | React 19 + TypeScript | 컴포넌트 기반, 타입 안전성, Electron과 검증된 조합 |
| Bundler | Vite (via @electron-forge/plugin-vite) | 빠른 HMR, 모던 빌드 |
| Terminal | xterm.js + portable-pty (Rust) | 멀티플랫폼 터미널 에뮬레이션 (macOS, Windows) |
| Rust Core | napi-rs (.node native module) | fs ops, PTY, file watcher — `crates/smalti-core` + `crates/smalti-napi` |
| State | Zustand | 경량, 보일러플레이트 최소 |
| Styling | Tailwind CSS | 유틸리티 기반, 빠른 UI 구성 |
| Data Storage | JSON (electron-store) | 워크스페이스 목록(`aide-workspaces`), 세션 레이아웃(`aide-sessions`), 앱 전역 설정(`aide-app-settings`: 테마·윈도우 bounds), 플러그인 스펙 저장 |
| Test | Vitest + Playwright | Vitest(유닛), Playwright(E2E) - Electron 커뮤니티 주류 |
| CI/CD | GitHub Actions | 표준 CI/CD, 멀티플랫폼 빌드 |
| Package Manager | pnpm (`node-linker=hoisted`) | electron-forge 호환 필수, `.npmrc` 설정 |
| Platform | macOS, Windows | 크로스 플랫폼 |

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    Electron (Main Process)                  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ Agent       │  │ Plugin      │  │ File System       │  │
│  │ Manager     │  │ Manager     │  │ Service           │  │
│  │             │  │             │  │                   │  │
│  │ - spawn/    │  │ - generate  │  │ - file tree       │  │
│  │   kill pty  │  │ - install   │  │ - CRUD            │  │
│  │ - agent     │  │ - sandbox   │  │ - watch           │  │
│  │   registry  │  │ - registry  │  │                   │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬──────────┘  │
│         │                │                   │              │
│  ┌──────┴────────────────┴───────────────────┴──────────┐  │
│  │                    IPC Bridge                         │  │
│  └──────┬────────────────┬───────────────────┬──────────┘  │
├─────────┼────────────────┼───────────────────┼──────────────┤
│         │       Electron (Renderer Process)  │              │
│  ┌──────┴──────┐  ┌─────┴───────┐  ┌────────┴──────────┐  │
│  │ Terminal    │  │ Plugin      │  │ File Explorer     │  │
│  │ Panel      │  │ Panel       │  │ Panel             │  │
│  │ (xterm.js) │  │             │  │                   │  │
│  │            │  │ - list      │  │ - tree view       │  │
│  │ - agent    │  │ - status    │  │ - git status      │  │
│  │   tabs     │  │ - manage    │  │ - search          │  │
│  │ - shell    │  │             │  │                   │  │
│  │   tab      │  │             │  │                   │  │
│  └────────────┘  └─────────────┘  └───────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Agent Selector Bar                      │   │
│  │  [Claude Code] [Gemini CLI] [Codex CLI] [+ Shell]   │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Agent Manager (Main Process)

CLI 에이전트 프로세스의 라이프사이클 관리.

```typescript
interface AgentConfig {
  id: string;                    // "claude" | "gemini" | "codex"
  name: string;                  // 표시명
  command: string;               // 실행 커맨드 (e.g., "claude")
  args: string[];                // 기본 인자
  authType: "oauth" | "api-key"; // 인증 방식
  healthCheck: () => Promise<boolean>; // 설치 여부 확인
}

interface AgentProcess {
  id: string;
  agent: AgentConfig;
  pty: PtyHandle;                // Rust PtyHandle (portable-pty via napi-rs)
  status: "idle" | "running" | "error";
  cwd: string;
}
```

**핵심 동작**:
- `spawn(agentId, cwd)`: Rust PtyHandle로 에이전트 CLI 프로세스 생성 (portable-pty via napi-rs)
- `kill(processId)`: 프로세스 종료
- `send(processId, input)`: 에이전트에 입력 전달 (사용자 프롬프트)
- `onData(processId, callback)`: 에이전트 출력 스트림 수신
- `detectInstalled()`: 시스템에 설치된 에이전트 탐지
- Shell 탭: 일반 bash/zsh/powershell 프로세스도 동일한 인터페이스로 관리

**에이전트별 특이사항**:

| Agent | Command | Auth | Tool Protocol |
|-------|---------|------|---------------|
| Claude Code | `claude` | OAuth (GitHub) | MCP (Model Context Protocol) |
| Gemini CLI | `gemini` | OAuth (Google) | Gemini function calling |
| Codex CLI | `codex` | OAuth / API key | OpenAI function calling |

### 2. Plugin System

#### 2.1 Plugin Generation Pipeline

에이전트에게 플러그인 생성을 위임하는 구조. smalti가 직접 코드를 생성하지 않고, 에이전트의 코드 생성 능력을 활용한다.

```
사용자: "미사용 import 정리 플러그인 만들어줘"
    │
    ▼
smalti: 플러그인 생성 프롬프트 조립
    │  - 플러그인 스펙 스키마 제공
    │  - 샌드박스 API 명세 제공
    │  - tool/skill 등록 포맷 제공
    │
    ▼
에이전트: 코드 생성 (에이전트의 네이티브 능력)
    │  - plugin.spec.json
    │  - 플러그인 소스 코드
    │  - tool/skill manifest
    │
    ▼
smalti: 검증 → 샌드박스 로드 → 레지스트리 등록
```

#### 2.2 Plugin Spec Schema

```json
{
  "name": "ts-import-cleaner",
  "version": "1.0.0",
  "description": "TypeScript 미사용 import 감지 및 제거",
  "entry": "index.js",
  "triggers": {
    "onSave": { "filePattern": "*.ts" },
    "onCommand": { "command": "clean-imports" }
  },
  "permissions": {
    "fileSystem": ["read", "write"],
    "network": false,
    "process": false
  },
  "tools": [
    {
      "name": "remove_unused_imports",
      "description": "지정된 파일에서 미사용 import를 제거합니다",
      "parameters": {
        "file_path": { "type": "string", "required": true }
      }
    }
  ]
}
```

#### 2.3 Plugin Sandbox Runtime

플러그인은 격리된 환경에서 실행된다.

```typescript
interface PluginSandbox {
  // 플러그인에 노출되는 API
  api: {
    fs: ScopedFileSystem;       // cwd 범위 제한 파일 접근
    terminal: TerminalAccess;   // 터미널 출력
    ui: NotificationAPI;        // 알림, 상태바
    log: Logger;                // 로깅
  };
  // 격리 메커니즘
  runtime: "node:vm" | "worker_threads";
  timeout: number;              // 실행 시간 제한
  memoryLimit: number;          // 메모리 제한
}
```

**격리 방식**: Node.js `vm` 모듈 기본, 고비용 작업은 Worker Threads로 분리.

#### 2.4 Tool/Skill Registry

생성된 플러그인의 tool/skill을 에이전트가 사용할 수 있도록 등록.

```typescript
interface ToolRegistry {
  tools: Map<string, ToolDefinition>;

  register(plugin: Plugin): void;     // 플러그인 tool 등록
  unregister(pluginName: string): void;
  list(): ToolDefinition[];
  invoke(toolName: string, params: Record<string, unknown>): Promise<unknown>;

  // 에이전트별 tool 포맷 변환
  toMCP(): MCPToolDefinition[];       // Claude Code용
  toGemini(): GeminiFunctionDef[];    // Gemini CLI용
  toOpenAI(): OpenAIFunctionDef[];    // Codex CLI용
}
```

에이전트가 tool을 호출하면 smalti가 중간에서 해당 플러그인의 샌드박스 함수를 실행하고 결과를 반환한다.

#### 2.5 Plugin Workspace Isolation

플러그인은 **워크스페이스 단위로만** 관리된다. 글로벌 플러그인 개념은 없으며, 모든 플러그인은 `{workspace}/.aide/plugins/`에 저장된다. smalti는 프로젝트 루트에 어떠한 파일도 생성하지 않는다 (예: `.mcp.json` 미생성 — MCP 서버는 spawn 시점의 cwd에서 플러그인 경로를 유도).

**워크스페이스 전환 시 플러그인 갱신 흐름**:

```
사용자: 사이드바에서 워크스페이스 B 클릭
    │
    ▼
WorkspaceNav → setActive(ws-b)
    │
    ▼
window.aide.workspace.open(ws-b.path)   ← Main: activeWorkspacePath = ws-b
    │ (await)
    ▼
usePluginStore.loadPlugins()            ← IPC: PLUGIN_LIST
    │
    ▼
Main: refreshPlugins(ws-b)
    │  if (lastLocalDir !== ws-b local dir)
    │    registry.clearPlugins()        ← 이전 워크스페이스 플러그인 제거
    │    loadDirIntoRegistry(ws-b)
    ▼
렌더러: 플러그인 목록 갱신 (ws-b 플러그인)
```

**구현 규칙**:
- `window.aide.workspace.open()` IPC가 완료된 후에 `loadPlugins()`를 호출해야 한다 — 순서가 바뀌면 메인 프로세스가 구 경로를 기준으로 플러그인을 반환한다.
- `PluginRegistry.clearPlugins()`는 레지스트리의 모든 플러그인을 제거하고 활성 sandbox를 stop한다.
- 동일 워크스페이스로 재전환 시 (`lastLocalDir` 동일) 불필요한 스캔을 생략한다.
- 기존 워크스페이스에 `.mcp.json`이 남아있으면 `WORKSPACE_OPEN` 시점에 `migrateProjectMcpJson`이 smalti 엔트리만 제거한다 (사용자 정의 서버는 보존).

#### 2.6 Plugin ↔ Plugin 이벤트 브릿지

플러그인이 다른 플러그인에 이벤트를 브로드캐스트할 수 있는 단방향 fire-and-forget 통신 채널.

**설계 원칙**:
- 발신자(emitter)는 반환값을 받지 않는다 — 응답이 필요하면 수신 플러그인이 발신 플러그인으로 별도 emit
- 바인딩은 `.aide/settings.json`에 선언적으로 정의
- 권한(`pluginPermissions`)도 같은 파일에서 관리
- 워크스페이스 스코프 내 로컬 + 글로벌 플러그인 간 통신 가능

**`settings.json` 스키마**:

```json
{
  "eventBindings": { ... },
  "pluginBindings": {
    "my:event": [
      { "plugin": "plugin-b", "tool": "handleEvent", "args": {} },
      { "plugin": "plugin-c", "tool": "onEvent", "args": { "mode": "silent" } }
    ]
  },
  "pluginPermissions": {
    "plugin-a": { "emit": ["my:event"] }
  }
}
```

**Plugin sandbox API**:

```javascript
// Plugin A 코드 내
aide.plugins.emit('my:event', { filePath: '/some/file.ts' });
// fire-and-forget — 반환값 없음
```

**이벤트 라우팅 흐름**:

```
Plugin A sandbox: aide.plugins.emit('my:event', data)
    │
    ▼  (pluginEmitter callback — main process)
settings.json 로드 (fs.readFileSync 동기)
    │
    ▼
pluginPermissions['plugin-a'].emit.includes('my:event') ?
    │  No → console.warn + return
    │  Yes ↓
pluginBindings['my:event'] 순회
    │
    ▼
registry.invokeTool('plugin-b', 'handleEvent', { ...args, ...data }, cwd)
registry.invokeTool('plugin-c', 'onEvent', { ...args, ...data }, cwd)
```

**구현 구조**:

| 구성요소 | 역할 |
|---------|------|
| `PluginEmitter` 타입 (`sandbox.ts`) | `(event, data) => void` 콜백 시그니처 |
| `sandbox.run(workspacePath, emitter?)` | emitter를 `aide.plugins.emit`으로 노출 |
| `registry.setEmitterFactory(factory)` | plugin-handlers에서 주입 |
| `registry.invokeTool(id, tool, args, cwd)` | 대상 플러그인 도구 직접 호출 |
| `makeEmitterFactory()` (`plugin-handlers.ts`) | settings.json 읽기 + 권한 체크 + 라우팅 |

**구현 규칙**:
- `pluginPermissions`에 명시되지 않은 이벤트 emit은 경고 로그 후 무시
- 라우팅 중 개별 플러그인 오류는 다음 바인딩 실행을 막지 않음 (독립 try-catch)
- 데이터 병합: `{ ...binding.args, ...data }` — 런타임 data가 선언적 args를 오버라이드

### 3. Terminal Panel (Renderer)

xterm.js 기반 다중 탭 터미널.

```typescript
interface TerminalTab {
  id: string;
  type: "agent" | "shell";
  agentId?: string;              // agent 탭일 경우
  ptyProcessId: string;          // Main Process의 pty 참조
  title: string;
}
```

**UI 구조**:
- 상단: Agent Selector Bar — 각 에이전트 버튼 + Shell 버튼
- 버튼 클릭 → 해당 에이전트/셸의 새 탭 생성
- 탭 간 전환, 탭 닫기
- xterm.js 인스턴스가 IPC를 통해 Main Process의 Rust PtyHandle(portable-pty)과 연결

**폰트 요구사항**:
- `fontFamily`: Nerd Font 변종 우선 탐색 → 일반 모노스페이스 폴백 → Symbols Nerd Font Mono(번들)
- `Symbols Nerd Font Mono Regular` TTF를 `src/renderer/assets/fonts/`에 번들링하여 Nerd Font 미설치 환경에서도 Powerline/oh-my-zsh 글리프 렌더링 보장
- `unicodeVersion: '11'` — 이모지 및 광폭 문자 올바른 너비 계산

### 4. File Explorer (Renderer)

```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}
```

- 사이드 패널 토글 (단축키)
- Rust `notify` crate 기반 파일 변경 감지 및 자동 갱신 (WatcherHandle via napi-rs)
- Rust fs ops로 파일 CRUD 처리 (readTree, readFile, writeFile, deletePath)
- 파일 클릭 → 기본 에디터에서 열기 (시스템 기본 또는 향후 내장 에디터)

### 5. Auto-Updater (Main Process)

GitHub Releases 기반 업데이트 체크 및 DMG 다운로드 모듈. **PRD F7 참조**.

```typescript
// src/main/updater/check.ts
interface UpdateInfo {
  latestTag: string;          // "v0.0.2"
  currentVersion: string;     // app.getVersion(), e.g. "0.0.1"
  hasUpdate: boolean;
  downloadUrl: string | null; // first .dmg asset URL from the release
  releaseName: string | null;
  htmlUrl: string | null;     // release page URL (fallback)
}

interface UpdaterModule {
  checkForUpdate(): Promise<UpdateInfo | null>;
  getCachedUpdateInfo(): UpdateInfo | null;
  downloadUpdate(): Promise<{ ok: boolean; path?: string; error?: string }>;
  startUpdatePolling(): void;
  stopUpdatePolling(): void;
}
```

**구현 핵심**:

| 항목 | 결정 |
|------|------|
| HTTP 클라이언트 | `electron.net.fetch` (system proxy 자동 사용) |
| API 엔드포인트 | `https://api.github.com/repos/Achelous1/aide/releases/latest` |
| 폴링 주기 | 시작 5초 후 1회 + 60분 간격 (`setInterval`) |
| 캐시 | 메모리 변수 (`cachedInfo: UpdateInfo \| null`) — 디스크 영속화 불필요 |
| 동시 다운로드 차단 | 모듈 레벨 `downloading: boolean` 플래그 |
| Draft/Prerelease 처리 | `release.draft \|\| release.prerelease` 면 캐시 유지 + 무시 |
| 버전 비교 | `parseVersion()`이 leading `v` 제거 후 점 분리, 숫자 배열 사전순 비교 |
| Atomic write | 불필요 — `~/Downloads`는 사용자 영역, 부분 쓰기 위험 낮음 |
| Reveal | `shell.showItemInFolder(targetPath)` |
| Fallback | DMG asset 없거나 실패 시 `shell.openExternal(release.html_url)` |

**IPC 채널**:

| 채널 | 방향 | 페이로드 | 응답 |
|------|------|---------|------|
| `updater:check` | Renderer → Main | — | `Promise<UpdateInfo \| null>` |
| `updater:get-info` | Renderer → Main | — | 캐시된 `UpdateInfo \| null` (네트워크 호출 없음) |
| `updater:download` | Renderer → Main | — | `Promise<{ok, path?, error?}>` |
| `updater:info-changed` | Main → Renderer | `UpdateInfo \| null` | 캐시 변경 시 푸시 |

**렌더러 컴포넌트** (`src/renderer/components/updater/UpdateNotice.tsx`):

```tsx
function UpdateNotice() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // 1. Pull cached state on mount (sync, no network)
    window.aide.updater.getInfo().then(setInfo);
    // 2. Subscribe to updates pushed from main
    return window.aide.updater.onChanged(setInfo);
  }, []);

  if (!info?.hasUpdate) return null;
  // ... render the notice (see UI-SPEC.md)
}
```

**Lifecycle**:
- App `ready` → `startUpdatePolling()` 호출 (`main/index.ts`)
- App `before-quit` → `stopUpdatePolling()` (interval clear)
- 첫 체크는 5초 지연으로 창이 먼저 그려지도록 보장

**보안 고려**:
- GitHub API 호출에 인증 없음 (rate limit 60/h, 폴링 60분이라 충분)
- 다운로드 URL은 오직 `assets.browser_download_url`만 사용 (사용자 입력 신뢰 X)
- 다운로드 후 `~/Downloads/smalti-<tag>.dmg`로 저장 — 워크스페이스 외부

---

## IPC Communication

Main ↔ Renderer 간 통신은 Electron IPC + contextBridge로 안전하게 처리.

```typescript
// preload.ts — Renderer에 노출되는 API
interface AideAPI {
  // Agent
  agent: {
    spawn(agentId: string, cwd: string): Promise<string>;
    kill(processId: string): Promise<void>;
    send(processId: string, input: string): void;
    onData(processId: string, callback: (data: string) => void): void;
    listInstalled(): Promise<AgentConfig[]>;
  };

  // Plugin
  plugin: {
    list(): Promise<PluginInfo[]>;
    enable(name: string): Promise<void>;
    disable(name: string): Promise<void>;
    remove(name: string): Promise<void>;
    getSpec(name: string): Promise<PluginSpec>;
  };

  // File System
  fs: {
    readTree(path: string): Promise<FileTreeNode>;
    readTreeWithError(path: string): Promise<{ nodes: FileTreeNode[]; error?: FsReadTreeError }>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    delete(path: string): Promise<void>;
    onChanged(callback: (event: FSEvent) => void): void;
  };

  // System (OS 레벨 연동)
  system: {
    openPrivacySettings(): void;  // macOS Privacy & Security → Files and Folders 패널 열기
  };
}
```

---

## Project Structure

```
aide/
├── package.json                 # type: "module", pnpm.onlyBuiltDependencies
├── .npmrc                       # node-linker=hoisted (electron-forge 필수)
├── forge.config.ts              # electron-forge 설정 (asar unpack 포함)
├── rust-toolchain.toml          # Rust stable 1.82.0 고정
├── Cargo.toml                   # workspace 루트
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html                   # CSP meta 태그 포함
├── vite.main.config.ts          # Main Process 빌드
├── vite.preload.config.ts       # Preload 빌드
├── vite.renderer.config.ts      # Renderer 빌드 (React + path alias)
│
├── crates/
│   ├── smalti-core/             # 핵심 Rust 로직 (fs, watcher, pty)
│   └── smalti-napi/             # napi-rs 바인딩 (.node 빌드 대상)
│
├── scripts/
│   └── build-native.mjs         # postinstall: Rust .node 빌드 스크립트
│
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts             # 앱 엔트리
│   │   ├── native/              # 빌드 산출물 (gitignored)
│   │   │   └── index.<platform>-<arch>.node  # napi-rs 네이티브 모듈
│   │   ├── agent/
│   │   │   ├── agent-manager.ts # 에이전트 프로세스 관리
│   │   │   ├── agent-registry.ts# 에이전트 설정 레지스트리
│   │   │   └── agents/
│   │   │       ├── claude.ts    # Claude Code 설정
│   │   │       ├── gemini.ts    # Gemini CLI 설정
│   │   │       └── codex.ts     # Codex CLI 설정
│   │   ├── plugin/
│   │   │   ├── plugin-manager.ts   # 플러그인 CRUD
│   │   │   ├── plugin-sandbox.ts   # 샌드박스 런타임
│   │   │   ├── plugin-generator.ts # 생성 파이프라인 (프롬프트 조립)
│   │   │   └── tool-registry.ts    # tool/skill 레지스트리
│   │   ├── filesystem/
│   │   │   └── fs-service.ts    # 파일 시스템 서비스 (Rust fs ops 위임)
│   │   └── ipc/
│   │       ├── channels.ts      # IPC 채널 상수 정의 (single source of truth)
│   │       ├── handlers.ts      # IPC 핸들러 등록
│   │       └── terminal-handlers.ts # 터미널 IPC 핸들러
│   │
│   ├── preload/
│   │   └── index.ts             # contextBridge API 노출
│   │
│   └── renderer/                # React App
│       ├── index.html
│       ├── App.tsx
│       ├── components/
│       │   ├── terminal/
│       │   │   ├── TerminalPanel.tsx
│       │   │   ├── TerminalTab.tsx
│       │   │   └── AgentSelector.tsx
│       │   ├── file-explorer/
│       │   │   ├── FileExplorer.tsx
│       │   │   └── FileTreeItem.tsx
│       │   ├── plugin/
│       │   │   ├── PluginPanel.tsx
│       │   │   └── PluginCard.tsx
│       ├── stores/
│       │   ├── terminal-store.ts
│       │   ├── plugin-store.ts
│       │   └── file-store.ts
│       └── styles/
│           └── global.css
│
├── plugins/                     # 생성된 플러그인 저장 디렉토리
│   └── .gitkeep
│
├── tests/
│   ├── unit/
│   └── e2e/
│
└── .github/
    └── workflows/
        └── ci.yml               # GitHub Actions CI
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "@xterm/xterm": "^5.5.x",
    "@xterm/addon-fit": "^0.10.x",
    "electron-store": "^8.x",
    "zustand": "^5.x",
    "react": "^19.x",
    "react-dom": "^19.x"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.x",
    "@electron-forge/plugin-vite": "^7.x",
    "@vitejs/plugin-react": "^4.x",
    "@napi-rs/cli": "^2.x",
    "napi": "^2.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "vitest": "^3.x",
    "@playwright/test": "^1.x"
  }
}
```

**Rust crate dependencies** (in `crates/smalti-napi/Cargo.toml`):

| Crate | Role |
|-------|------|
| `napi` + `napi-derive` | napi-rs binding macros and runtime |
| `napi-build` | build.rs codegen |
| `portable-pty` | Cross-platform PTY (replaces node-pty) |
| `notify` | Cross-platform file watcher (replaces chokidar) |

**Rust toolchain requirement**: rustup stable ≥ 1.82 (pinned via `rust-toolchain.toml`). Homebrew rustc is insufficient — install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.

> **Note**: xterm.js는 v5부터 `@xterm/xterm` 스코프 패키지로 변경됨. Tailwind CSS는 v3 사용 (v4는 PostCSS 통합 방식 변경으로 electron-forge와 호환성 이슈). `node-pty`, `chokidar`, `simple-git`은 v0.1.0에서 제거됨 — 각각 Rust portable-pty, notify crate, 그리고 Git 기능 제거로 대체.

---

## Security Considerations

### Plugin Sandbox
- `node:vm` 기반 격리: 글로벌 스코프 접근 차단
- 파일시스템 접근은 `plugin.spec.json`의 permissions에 따라 제한
- 네트워크/프로세스 접근은 명시적 허용 필요
- 실행 시간 및 메모리 제한 적용

### Rust Native Module
- fs-handlers의 path traversal 가드: `isExcluded()` 및 절대 경로 정규화로 워크스페이스 루트 외부 접근 차단
- Rust watcher: 감시 대상 경로를 WORKSPACE_OPEN 시점에 명시적으로 지정 — HOME 등 fallback 경로 자동 감시 금지
- macOS: `/dev/fd/N` 경로에서 발생하는 fsevents EBADF는 프로세스 레벨 `uncaughtException` 핸들러로 억제 (Rust watcher 내부)
- Finder 실행 시 `HOME=/` 가드: `getHome()` 헬퍼가 `/`를 거부하고 `os.userInfo().homedir`로 폴백
- Renderer는 Rust 네이티브 모듈에 직접 접근 불가 — contextIsolation 경계 유지

### Electron Security
- `contextIsolation: true` — Renderer에서 Node.js 직접 접근 불가
- `nodeIntegration: false` — preload script를 통한 안전한 API 노출
- `sandbox: false` — Rust 네이티브 모듈(.node)이 Main process에서 로드되기 위해 필요 (필수 트레이드오프)
- CSP(Content Security Policy) meta 태그로 `index.html`에 설정
- 외부 URL 로드 차단
- Electron Fuses로 패키징 시 RunAsNode, NodeOptions 등 비활성화 (코드 서명 전까지 `EnableEmbeddedAsarIntegrityValidation` 등은 비활성 유지)

### Agent Process
- 에이전트 프로세스는 사용자 권한으로 실행 (별도 권한 상승 없음)
- 에이전트별 OAuth 인증은 각 CLI가 자체 관리

---

## IPC Channels (파일시스템 / 시스템 연동 추가)

기존 `FS_READ_TREE`는 하위 호환을 위해 유지하며, Permission Banner를 지원하기 위해 신규 채널을 추가한다. 신규 UI는 `WITH_ERROR` 변형을 사용한다.

| 채널 상수 | 시그니처 | 설명 |
|-----------|---------|------|
| `FS_READ_TREE` | `(dirPath: string) => Promise<FileTreeNode[]>` | 기존 — 에러 시 throw (하위 호환) |
| `FS_READ_TREE_WITH_ERROR` | `(dirPath: string) => Promise<{ nodes: FileTreeNode[]; error?: FsReadTreeError }>` | 신규 — EPERM 등 에러를 구조화해 반환 |
| `OPEN_PRIVACY_SETTINGS` | `() => void` | macOS System Settings의 Privacy & Security → Files and Folders 패널 열기. macOS 버전에 따라 deep link URL 분기 내장 |

**타입 정의**:

```typescript
type FsReadTreeError = {
  code: 'EPERM' | 'ENOENT' | 'ENOTDIR' | 'UNKNOWN';
  path: string;
  message: string;
};
```

**구현 규칙**:
- `FS_READ_TREE_WITH_ERROR`는 루트 조회 실패 시 `nodes: []` + `error` 필드를 반환한다(throw 금지)
- 하위 디렉토리 lazy-fetch가 실패한 경우도 동일한 구조로 반환하여 렌더러가 partial-failure 노드 표시를 결정한다
- `OPEN_PRIVACY_SETTINGS`는 main process에서 `shell.openExternal()`로 deep link URL을 호출한다

---

## macOS TCC (Transparency Consent and Control) 대응

### 배경

패키지 앱(DMG 설치)은 Finder에서 실행될 때 macOS TCC 정책에 의해 다음 폴더 접근이 OS 레벨에서 차단된다:

- `~/Documents`, `~/Desktop`, `~/Downloads`
- 외장 볼륨(`/Volumes/...`), 네트워크 볼륨

접근 시 `fs.readdirSync`가 `EPERM`으로 실패한다. dev 모드(`pnpm start`)는 터미널 프로세스의 권한을 상속하므로 이 이슈는 **DMG로 패키징된 앱에서만 재현된다.**

### 2단 방어 전략

#### 1단 — Info.plist usage descriptions (OS 자동 프롬프트)

`forge.config.ts`의 `packagerConfig.extendInfo`에 다음 키를 포함한다. 패키지 앱이 해당 폴더에 처음 접근하는 순간 OS가 네이티브 허용 다이얼로그를 자동으로 표시한다:

| 키 | 커버 범위 |
|----|----------|
| `NSDocumentsFolderUsageDescription` | `~/Documents` |
| `NSDesktopFolderUsageDescription` | `~/Desktop` |
| `NSDownloadsFolderUsageDescription` | `~/Downloads` |
| `NSRemovableVolumesUsageDescription` | USB / 외장 디스크 |
| `NSNetworkVolumesUsageDescription` | SMB/AFP 등 네트워크 볼륨 |

사용자가 프롬프트에서 `Don't Allow`를 선택하면 프롬프트는 다시 표시되지 않는다 — 이 경우 2단 복구 경로가 필요하다.

#### 2단 — 런타임 에러 감지 + 복구 UI

- `fs.readdirSync`가 `EPERM`으로 throw하면 `FS_READ_TREE_WITH_ERROR`가 `error: { code: 'EPERM', ... }`을 반환
- 렌더러는 Permission Banner(UI-SPEC 3.6.2)를 표시하여 사용자에게 원인 설명 + `Open Settings` / `Retry` 액션을 제공
- Window `focus` 이벤트 기반 자동 재시도로 권한 부여 후 즉시 복구
- 2단 배너의 역할은 **Full Disk Access 요청이 아니라**, 사용자가 1단(Info.plist 자동 프롬프트)에서 `Don't Allow`를 선택한 뒤 System Settings의 **Files and Folders** 섹션에서 폴더별 권한 토글을 **재활성화**할 수 있는 복구 경로를 제공하는 것이다.

### 권한 범위: Files and Folders (Full Disk Access 불필요)

smalti 워크스페이스 파일트리는 **Files and Folders** 섹션의 per-folder 권한(Documents / Desktop / Downloads / 외장 볼륨 등 개별 토글)으로 충분히 동작한다. Full Disk Access는 시스템 전역 권한(Library, Trash, 다른 사용자 홈 등 포함)으로, 백업/안티바이러스 계열 앱에 적합하며 VS Code·Cursor 등 표준 IDE도 요구하지 않는다. smalti도 동일한 최소 권한 정책을 따른다.

이 경우 Permission Banner의 `Open Settings` 버튼은 System Settings의 **Files and Folders 패널을 바로 연다.**

### Deep link URL 버전 분기

macOS 버전에 따라 Privacy & Security URL 스킴이 다르다. `OPEN_PRIVACY_SETTINGS` 핸들러는 `os.release()` 기반으로 분기한다:

| macOS 버전 | URL |
|-----------|-----|
| macOS 13+ (Darwin 22+) | `x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_FilesAndFolders` |
| macOS 12 이하 | `x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders` |

---

## 파일 감시 성능 (File Watcher Performance)

### 배경

smalti 메인 프로세스가 idle 상태에서 CPU 100%+를 소모하는 이슈가 발견되었다. 원인은 구 구현의 `chokidar.watch(cwd, { depth: 3 })`가 workspace 전체를 감시하면서 `node_modules`, `.git`, `dist` 같은 대형 디렉토리의 파일 이벤트를 전부 수신하는 것이었다. v0.1.0에서 chokidar는 Rust `notify` crate 기반 `WatcherHandle`로 전면 교체되었다. 자세한 근거 및 벤치마크 결과는 [[rust-core-migration]] 참조 (idle CPU 0.0% avg, 기존 chokidar 기반 ~127% 대비).

### Exclusion 패턴 (현재)

glob 문자열 기반 exclusion이 `WatcherHandle` 생성 시 전달된다. 공용 상수는 `src/main/ipc/watcher-exclusions.ts`의 `WATCHER_EXCLUSIONS` 배열에 정의.

| 범주 | 패턴 |
|------|------|
| VCS | `.git`, `.hg`, `.svn` |
| 의존성 | `node_modules` |
| 빌드 산출물 | `dist`, `build`, `out`, `coverage`, `target` (Rust/Java) |
| 프레임워크 캐시 | `.next`, `.nuxt`, `.turbo`, `.cache`, `.parcel-cache`, `.vite`, `.swc` |
| 로그/락 파일 | `.log`, `.pid`, `.lock` |

**중요**: watcher exclusion은 **감시 대상에서만 제외**하는 것이지, 파일트리 렌더링(`readTree`)과 무관하다. `node_modules`도 파일트리에서 정상적으로 **표시된다.**

### 미래 작업

- **`.gitignore` 머지**: 프로젝트별 `.gitignore`를 파싱해 exclusion에 자동 머지 (미착수)
- **Lazy per-directory Watcher**: 사용자가 FileExplorer에서 expand한 폴더에 대해서만 추가 watcher 등록 (미착수)

### Workspace-scoped Watcher (현재)

watcher는 **workspace 활성화 시점에만 생성**된다. 부팅 시 `registerFsHandlers`는 IPC 핸들러만 등록하고, watcher는 만들지 않는다. `WORKSPACE_OPEN` 핸들러가 `setWorkspaceWatcher(path)`를 호출할 때 비로소 Rust `WatcherHandle`이 생성된다.

`setWorkspaceWatcher(workspacePath: string | null): void`
- `workspacePath: string` — 기존 watcher를 close하고 새 경로로 WatcherHandle을 재생성한다. workspace 전환 시 호출.
- `workspacePath: null` — watcher를 완전히 해제한다. `before-quit` 등 cleanup 시점에 호출.

이 원칙으로 (1) workspace 미선택 상태에서는 watcher 비용이 0이고, (2) workspace 전환 시 자동 교체되며, (3) HOME 같은 fallback 경로가 절대 감시 대상이 되지 않는다. 자세한 사고 사례 및 진단 과정은 wiki의 `main-process-cpu-home-watcher-bugfix` 참조.

---

## Known Pitfalls

### Fallback cwd로 HOME 감시 시 macOS 시스템 활동에 의한 CPU 폭주
패키지 앱(Finder 실행) 환경에서 fallback cwd(`getHome()` 등)로 watcher를 생성하면, macOS Spotlight 인덱싱·TCC mediator·Time Machine·iCloud sync 등이 HOME 하위에 끊임없이 만드는 파일 이벤트를 모두 처리하게 되어 메인 프로세스 CPU가 100%+로 폭주한다. **watcher는 반드시 사용자가 명시적으로 연 workspace 경로에 한정**해야 하며, 부팅 시점·fallback 경로 기반 자동 watcher 생성을 금지한다. exclusion 패턴은 프로젝트 산출물(`node_modules` 등) 필터링용이지 HOME 자체를 보호하지 못한다. (Rust WatcherHandle 도입 이후에도 이 원칙은 동일하게 적용된다.)

### dev vs DMG 권한 차이
dev 모드(`pnpm start`)에서는 재현되지 않는 EPERM 이슈가 DMG 패키지에서만 발생한다. 원인은 터미널 프로세스의 권한 상속 vs. Finder 실행 시의 TCC 제약 차이. **파일시스템 접근 관련 변경은 반드시 DMG 빌드로 검증**해야 하며, dev 모드만으로 OK 판단 금지.

### "Don't Allow" 이후 재프롬프트 불가
사용자가 OS 허용 프롬프트에서 `Don't Allow`를 한 번 선택하면, 앱은 프로그래밍적으로 프롬프트를 다시 띄울 수 없다(OS 정책). 따라서 반드시 **System Settings deep link로 복구 경로를 UI에 제공**해야 한다 — `Open Settings` 버튼이 필수이며 단순 에러 메시지만 표시하면 사용자가 복구 방법이 없다.

---

## Cross-Platform Notes

| 항목 | macOS | Windows |
|------|-------|---------|
| Shell | bash / zsh | PowerShell / cmd |
| Rust PTY | portable-pty, .node suffix `darwin-arm64` / `darwin-x64` | portable-pty, .node suffix `win32-x64-msvc` |
| 에이전트 경로 | `/usr/local/bin/claude` 등 | `%APPDATA%` 또는 PATH |
| 파일 경로 | POSIX | Win32 (path.sep 처리) |
| 빌드 | .dmg / .app (universal: lipo arm64+x64) | .exe / NSIS installer |
| .node 파일명 | `index.darwin-arm64.node` / `index.darwin-universal.node` | `index.win32-x64-msvc.node` |

electron-forge가 `MakerZIP`(macOS), `MakerSquirrel`(Windows)로 플랫폼별 패키징 처리.

**macOS universal binary**: `sh build.sh` → `pnpm run build:native:universal` → `lipo`로 arm64+x64 `.node` 병합 → `index.darwin-universal.node`. DMG 릴리즈용. CI 및 dev는 단일 아키텍처 빌드(`pnpm install` postinstall) 사용.

**napi-rs .node 패키징**: 빌드 산출물 `src/main/native/*.node`는 gitignore 대상이며, `pnpm install`의 postinstall 단계(`scripts/build-native.mjs`)에서 자동 빌드된다. `forge.config.ts`의 `asar.unpack` 패턴이 `.node` 파일을 asar 외부로 추출한다.

### pnpm 설정

electron-forge는 pnpm의 기본 symlink 방식과 호환되지 않는다. 반드시 프로젝트 루트에 `.npmrc` 설정 필요:

```ini
# .npmrc
node-linker=hoisted
```

네이티브 모듈(electron, esbuild) 빌드를 허용하기 위해 `package.json`에 설정:

```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["electron", "esbuild"]
  }
}
```

### napi-rs .node 패키징

`src/main/native/*.node`는 napi-rs 빌드 산출물이므로 asar 아카이브에서 unpack 필요:

```typescript
// forge.config.ts
packagerConfig: {
  asar: {
    unpack: '**/native/*.node',
  },
}
```

---

## Development Commands

```bash
# 설치 (postinstall에서 Rust .node 자동 빌드)
pnpm install

# Rust 네이티브 모듈만 재빌드 (단일 아키텍처, 빠름)
pnpm run build:native

# macOS universal binary 빌드 (arm64 + x64 lipo 병합, DMG 릴리즈용)
pnpm run build:native:universal

# 개발 서버 (HMR)
pnpm start

# 릴리즈 빌드 (universal .node 포함 DMG)
sh build.sh

# 테스트
pnpm test              # vitest (unit)
pnpm test:e2e          # playwright (e2e)

# 린트
pnpm lint
```

> **Rust 툴체인**: `rustup` stable ≥ 1.82 필수. `scripts/build-native.mjs`가 `~/.cargo/bin`을 PATH 앞에 추가하여 Homebrew rustc보다 rustup shim이 우선 사용된다. universal 빌드는 `rustup target add aarch64-apple-darwin x86_64-apple-darwin` 사전 등록 필요.

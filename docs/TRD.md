# AIDE - Technical Requirements Document (MVP)

## Overview

AIDE는 CLI 기반 AI 코드 에이전트(Claude Code, Gemini CLI, Codex CLI)를 통합하는 Electron 앱이다. 직접 LLM API를 호출하지 않고, 각 에이전트의 네이티브 프로토콜(MCP, function calling 등)을 활용한다.

---

## Tech Stack

| 항목 | 선택 | 근거 |
|------|------|------|
| Framework | Electron + electron-forge | 가장 큰 커뮤니티, 공식 문서 풍부, 플러그인 생태계 |
| Frontend | React 19 + TypeScript | 컴포넌트 기반, 타입 안전성, Electron과 검증된 조합 |
| Bundler | Vite (via @electron-forge/plugin-vite) | 빠른 HMR, 모던 빌드 |
| Terminal | xterm.js + node-pty | 멀티플랫폼 터미널 에뮬레이션 (macOS, Windows) |
| State | Zustand | 경량, 보일러플레이트 최소 |
| Styling | Tailwind CSS | 유틸리티 기반, 빠른 UI 구성 |
| Data Storage | JSON (electron-store) | 설정/플러그인 스펙 로컬 저장 |
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
  pty: IPty;                     // node-pty 인스턴스
  status: "idle" | "running" | "error";
  cwd: string;
}
```

**핵심 동작**:
- `spawn(agentId, cwd)`: node-pty로 에이전트 CLI 프로세스 생성
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

에이전트에게 플러그인 생성을 위임하는 구조. AIDE가 직접 코드를 생성하지 않고, 에이전트의 코드 생성 능력을 활용한다.

```
사용자: "미사용 import 정리 플러그인 만들어줘"
    │
    ▼
AIDE: 플러그인 생성 프롬프트 조립
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
AIDE: 검증 → 샌드박스 로드 → 레지스트리 등록
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

에이전트가 tool을 호출하면 AIDE가 중간에서 해당 플러그인의 샌드박스 함수를 실행하고 결과를 반환한다.

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
- xterm.js 인스턴스가 IPC를 통해 Main Process의 node-pty와 연결

### 4. File Explorer (Renderer)

```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  gitStatus?: "modified" | "added" | "deleted" | "untracked";
}
```

- 사이드 패널 토글 (단축키)
- chokidar를 통한 파일 변경 감지 및 자동 갱신
- Git 상태 인라인 표시 (색상/아이콘)
- 파일 클릭 → 기본 에디터에서 열기 (시스템 기본 또는 향후 내장 에디터)

### 5. Git Integration (Main Process)

```typescript
interface GitService {
  // simple-git 기반
  status(cwd: string): Promise<GitStatus>;
  commit(cwd: string, message: string): Promise<void>;
  push(cwd: string): Promise<void>;
  pull(cwd: string): Promise<void>;
  branch(cwd: string): Promise<BranchSummary>;
  log(cwd: string, limit: number): Promise<GitLog>;
}

interface GitHubService {
  // octokit 기반
  listPRs(repo: string): Promise<PR[]>;
  getPR(repo: string, number: number): Promise<PRDetail>;
  listIssues(repo: string): Promise<Issue[]>;
}
```

Git 작업은 에이전트를 통한 자연어 실행도 가능하고, UI 버튼으로 직접 실행도 가능.

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
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    delete(path: string): Promise<void>;
    onChanged(callback: (event: FSEvent) => void): void;
  };

  // Git
  git: {
    status(cwd: string): Promise<GitStatus>;
    commit(cwd: string, message: string): Promise<void>;
    push(cwd: string): Promise<void>;
    pull(cwd: string): Promise<void>;
  };

  // GitHub
  github: {
    listPRs(repo: string): Promise<PR[]>;
    listIssues(repo: string): Promise<Issue[]>;
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
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html                   # CSP meta 태그 포함
├── vite.main.config.ts          # Main Process 빌드
├── vite.preload.config.ts       # Preload 빌드
├── vite.renderer.config.ts      # Renderer 빌드 (React + path alias)
│
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts             # 앱 엔트리
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
│   │   │   └── fs-service.ts    # 파일 시스템 서비스
│   │   ├── git/
│   │   │   ├── git-service.ts   # simple-git 래퍼
│   │   │   └── github-service.ts# octokit 래퍼
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
│       │   └── git/
│       │       ├── GitStatus.tsx
│       │       └── GitHubPanel.tsx
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
    "node-pty": "^1.x",
    "electron-store": "^8.x",
    "simple-git": "^3.x",
    "chokidar": "^3.x",
    "zustand": "^5.x",
    "react": "^19.x",
    "react-dom": "^19.x"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.x",
    "@electron-forge/plugin-vite": "^7.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "vitest": "^3.x",
    "@playwright/test": "^1.x"
  }
}
```

> **Note**: xterm.js는 v5부터 `@xterm/xterm` 스코프 패키지로 변경됨. Tailwind CSS는 v3 사용 (v4는 PostCSS 통합 방식 변경으로 electron-forge와 호환성 이슈).

---

## Security Considerations

### Plugin Sandbox
- `node:vm` 기반 격리: 글로벌 스코프 접근 차단
- 파일시스템 접근은 `plugin.spec.json`의 permissions에 따라 제한
- 네트워크/프로세스 접근은 명시적 허용 필요
- 실행 시간 및 메모리 제한 적용

### Electron Security
- `contextIsolation: true` — Renderer에서 Node.js 직접 접근 불가
- `nodeIntegration: false` — preload script를 통한 안전한 API 노출
- `sandbox: false` — node-pty가 preload에서 동작하기 위해 필요 (필수 트레이드오프)
- CSP(Content Security Policy) meta 태그로 `index.html`에 설정
- 외부 URL 로드 차단
- Electron Fuses로 패키징 시 RunAsNode, NodeOptions 등 비활성화

### Agent Process
- 에이전트 프로세스는 사용자 권한으로 실행 (별도 권한 상승 없음)
- 에이전트별 OAuth 인증은 각 CLI가 자체 관리

---

## Cross-Platform Notes

| 항목 | macOS | Windows |
|------|-------|---------|
| Shell | bash / zsh | PowerShell / cmd |
| node-pty | 네이티브 빌드 필요 | windows-build-tools 필요 |
| 에이전트 경로 | `/usr/local/bin/claude` 등 | `%APPDATA%` 또는 PATH |
| 파일 경로 | POSIX | Win32 (path.sep 처리) |
| 빌드 | .dmg / .app | .exe / NSIS installer |

electron-forge가 `MakerZIP`(macOS), `MakerSquirrel`(Windows)로 플랫폼별 패키징 처리.

### pnpm 설정

electron-forge는 pnpm의 기본 symlink 방식과 호환되지 않는다. 반드시 프로젝트 루트에 `.npmrc` 설정 필요:

```ini
# .npmrc
node-linker=hoisted
```

네이티브 모듈(electron, node-pty, esbuild) 빌드를 허용하기 위해 `package.json`에 설정:

```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["electron", "esbuild", "node-pty"]
  }
}
```

### node-pty 패키징

node-pty는 네이티브 모듈이므로 asar 아카이브에서 unpack 필요:

```typescript
// forge.config.ts
packagerConfig: {
  asar: {
    unpack: '**/node_modules/node-pty/**/*',
  },
}
```

---

## Development Commands

```bash
# 설치
pnpm install

# 개발 서버 (HMR)
pnpm start

# 빌드
pnpm run make

# 테스트
pnpm test              # vitest (unit)
pnpm test:e2e          # playwright (e2e)

# 린트
pnpm lint
```

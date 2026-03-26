# AIDE - Product Requirements Document (MVP)

## Overview

**Product Name**: AIDE (AI-Driven IDE)
**Vision**: 터미널 중심의 AI IDE. 자연어로 플러그인을 생성하고 즉시 실행할 수 있는 "Create n Play" 환경.
**Target**: 모든 개발자
**Tech Stack**: Electron
**MVP 성공 기준**: 사용자가 자연어로 플러그인을 요청하면 생성되고, 즉시 IDE 내에서 동작한다.

---

## Problem Statement

기존 IDE(IntelliJ, VSCode)의 플러그인 생태계는 방대하지만:
- 대부분 오버스펙으로 사용자의 실제 니즈와 불일치
- 원하는 기능만 딱 맞게 동작하는 플러그인을 찾기 어려움
- 플러그인 직접 개발은 높은 진입장벽 (SDK 학습, 빌드 파이프라인 등)

AI 시대에 맞게 "원하는 걸 말하면 만들어주는" 접근이 필요하다.

---

## Core Concept: Create n Play

```
사용자 자연어 요청
    → 니즈 파악 (AI가 요구사항 정제)
    → 스펙 정의 (플러그인 명세 자동 생성)
    → 플러그인 코드 생성
    → AI Tool/Skill 자동 생성 (AI도 해당 플러그인 활용 가능)
    → 즉시 로드 및 실행
```

생성된 플러그인은 사용자가 직접 사용할 수 있을 뿐 아니라, AI 어시스턴트의 tool/skill로도 등록되어 AI가 자율적으로 활용할 수 있다.

---

## MVP Features

### F0. Welcome Page & Workspace Management

앱 최초 실행 또는 프로젝트 미선택 시 보이는 첫 화면.

**Welcome Page**:
- `> aide_` 히어로 타이틀 (브랜딩)
- **Open Repository** 버튼: OS 디렉토리 선택 → 워크스페이스 생성 → 터미널 화면 진입
- **New Project** 버튼: 인라인 입력 → 프로젝트 이름 입력 → 상위 디렉토리 선택 → 폴더 자동 생성(`fs.mkdirSync`) → 워크스페이스 등록 → 터미널 화면 진입
- **최근 프로젝트 히스토리** (최대 5개): 프로젝트명, 경로, 마지막 접근 시간 표시. 클릭 시 바로 열기. electron-store로 영속화 (앱 재시작 시 유지)

**Workspace 관리**:
- 멀티 프로젝트 동시 관리: 여러 프로젝트를 워크스페이스로 등록하고 전환
- 좌측 Workspace Navbar: 전체 프로젝트 목록 + 각 프로젝트의 활성 에이전트 세션 표시
- Navbar 토글: Collapsed(48px 아이콘만) ↔ Expanded(260px 전체 리스트) 전환 가능
- 각 워크스페이스에 `+` 버튼으로 새 에이전트 세션 추가
- 프로젝트별 Git diff 통계 (+lines / -lines) 및 현재 브랜치 인라인 표시

### F1. AI Terminal (Core Interface)

AIDE의 메인 인터페이스. 모든 상호작용의 시작점.

- Electron 기반 터미널 에뮬레이터
- 멀티 LLM 지원: Claude Code, Gemini CLI, Codex CLI
  - AIDE가 직접 LLM API를 호출하지 않음 — CLI 에이전트를 node-pty로 spawn
  - 각 에이전트가 자체 OAuth 인증 관리
  - 탭 `+` 버튼 → 드롭다운 메뉴에서 에이전트/셸 선택하여 새 탭 생성
- Shell 모드: 일반 터미널로 동작 (bash/zsh/powershell)
- 멀티 탭: 여러 에이전트/셸 세션을 탭으로 동시 운영 및 전환
  - 각 탭은 독립 pty 세션 보유, 탭 전환 시 출력 보존 (display:none 패턴)
  - 워크스페이스 진입 시 기본 Shell 탭 자동 생성
- xterm.js 256색 ANSI 컬러 지원 (TERM=xterm-256color, COLORTERM=truecolor)
- JetBrains Mono 폰트, 블록 커서 (깜빡임)

**에이전트 상태 표시 시스템**:
- 각 에이전트 세션의 실시간 상태를 아이콘으로 표시
  - `●` 파란불 (Idle): 작업 완료, 다음 프롬프트 대기
  - `···` 노란불 (Processing): 에이전트 작업 수행 중 (물결 애니메이션)
  - `?` 노란 물음표 (Awaiting Input): 사용자 입력/확인 요청 중
- 상태 감지: pty 출력 스트림에서 에이전트별 프롬프트 패턴 매칭
- Collapsed Nav의 워크스페이스 아이콘 우상단 뱃지로 표시
- Expanded Nav의 에이전트 행에서 dot 아이콘으로 표시

### F2. Plugin System (Create n Play)

자연어 기반 플러그인 생성 및 즉시 실행 시스템.

**플러그인 생성 파이프라인**:

| 단계 | 설명 | 산출물 |
|------|------|--------|
| 1. 니즈 파악 | AI가 사용자 요청을 분석하고 clarifying questions | 요구사항 정의서 |
| 2. 스펙 정의 | 플러그인 동작 명세 자동 생성 | `plugin.spec.json` |
| 3. 코드 생성 | 스펙 기반 플러그인 코드 생성 | 플러그인 소스 코드 |
| 4. Tool/Skill 생성 | AI가 사용할 수 있는 tool 정의 자동 생성 | tool/skill manifest |
| 5. 로드 및 실행 | 핫 로드로 즉시 활성화 | 실행 중인 플러그인 |

**플러그인 관리**:
- 생성된 플러그인 목록 조회, 활성화/비활성화, 삭제
- 플러그인 수정: 자연어로 기존 플러그인 변경 요청
- 플러그인 내보내기/공유 (향후 마켓플레이스 대비)

**플러그인 런타임**:
- 샌드박스 환경에서 안전하게 실행
- 플러그인이 요구하는 런타임/의존성 자동 설치
- 타입 제한 없음: 린터, 포매터, 코드 생성기, 자동화 스크립트, UI 컴포넌트 등 무제한

### F3. File Explorer

프로젝트 파일 탐색 및 관리.

- 재귀 트리 뷰 파일 브라우저 (최대 깊이 10)
- 모든 디렉토리 표시 (자동 제외 없음)
- 디렉토리 우선 정렬 + 알파벳 순
- chokidar 기반 파일 변경 감시 (500ms 디바운스) → 자동 새로고침
- 파일/폴더 CRUD (IPC: readTree, readFile, writeFile, delete)
- 터미널 좌측 사이드 패널 (220px)

### F4. Git & GitHub Integration

버전 관리 및 협업 기본 기능.

- Git 상태 표시: StatusBar에서 30초 주기 폴링으로 실시간 브랜치명 + 변경 파일 수 표시
- 기본 Git 작업 (simple-git 기반 IPC): status, commit, push, pull, branch, log
- GitHub 연동: PR 생성/조회, 이슈 조회
- AI를 통한 자연어 Git 작업 ("마지막 3개 커밋 squash 해줘")

### F5. Agent Auto-Detection

시스템에 설치된 CLI 에이전트를 자동으로 감지.

- `which`/`where` 명령으로 claude, gemini, codex CLI 설치 여부 확인
- AgentDropdown에서 미설치 에이전트 비활성화 (회색 처리 + "Not installed" 힌트)
- Shell은 항상 사용 가능

---

## Architecture (High-Level)

```
┌─────────────────────────────────────────────────┐
│                   Electron App                   │
├──────────┬──────────┬──────────┬────────────────┤
│ Terminal │  File    │   Git    │   Plugin       │
│ (xterm)  │ Explorer │ Manager  │   Manager      │
├──────────┴──────────┴──────────┴────────────────┤
│                  Core Services                   │
│  ┌───────────┐ ┌────────────┐ ┌──────────────┐ │
│  │ AI Engine │ │  Plugin    │ │ Tool/Skill   │ │
│  │ (Multi    │ │  Runtime   │ │ Registry     │ │
│  │  LLM)     │ │ (Sandbox)  │ │              │ │
│  └───────────┘ └────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────┤
│              Plugin Generation Pipeline          │
│  Request → Analyze → Spec → Generate → Deploy   │
├─────────────────────────────────────────────────┤
│                   Node.js (Main Process)         │
└─────────────────────────────────────────────────┘
```

**주요 컴포넌트**:

| 컴포넌트 | 역할 |
|----------|------|
| AI Engine | 멀티 LLM 통합 레이어. 모델별 어댑터로 통일된 인터페이스 제공 |
| Plugin Runtime | 생성된 플러그인의 샌드박스 실행 환경 |
| Tool/Skill Registry | AI가 활용 가능한 tool/skill을 등록하고 조회하는 레지스트리 |
| Plugin Generation Pipeline | 자연어 → 플러그인 코드 → tool/skill까지 end-to-end 생성 파이프라인 |

---

## User Flows

### Flow 1: 플러그인 생성 (Create n Play)

```
User: "TypeScript 파일에서 사용하지 않는 import를 찾아서 하이라이트해주는 플러그인 만들어줘"

AIDE AI: "확인했습니다. 몇 가지 확인할게요:
  1. 하이라이트만 할까요, 자동 삭제 옵션도 넣을까요?
  2. 저장 시 자동 실행할까요, 수동 실행할까요?"

User: "자동 삭제 옵션도 넣어주고, 저장 시 자동 실행해줘"

AIDE AI: "스펙을 정의합니다..."
  → plugin.spec.json 생성
  → 플러그인 코드 생성
  → AI tool 생성: remove_unused_imports(file_path)
  → "플러그인 'ts-import-cleaner'가 활성화되었습니다.
     저장 시 자동으로 미사용 import를 감지합니다.
     AI에서도 'remove_unused_imports' tool로 사용 가능합니다."
```

### Flow 2: AI가 플러그인 tool 활용

```
User: "src/ 폴더 전체에서 미사용 import 정리해줘"

AIDE AI: (등록된 'remove_unused_imports' tool 발견)
  → tool 호출하여 src/ 하위 모든 .ts 파일 처리
  → "47개 파일에서 총 123개의 미사용 import를 제거했습니다."
```

### Flow 3: Welcome → 프로젝트 열기

```
1. 앱 실행 → Welcome Page 표시
2. "Open Repository" 클릭 → OS 디렉토리 선택 다이얼로그
3. 프로젝트 경로 선택 → 워크스페이스 등록 + 최근 프로젝트에 추가
4. Terminal Page로 전환 (FileExplorer + 기본 Shell 탭 자동 생성)
5. 탭 `+` 클릭 → 드롭다운에서 에이전트 선택 → 새 탭 생성

이후 앱 재실행 시:
- Welcome Page의 최근 프로젝트 목록에 해당 프로젝트 표시
- 클릭 시 바로 Terminal Page로 진입
```

### Flow 4: 일반 터미널 사용

```
User: (Shell 모드 전환)
$ npm install
$ git status
$ npm test
```

---

## MVP Scope 정의

### In Scope (MVP)
- [x] Welcome Page (히어로, Open Repository, New Project, 최근 프로젝트 5개)
- [x] Workspace 관리 (멀티 프로젝트, Navbar collapsed, electron-store 영속화)
- [x] Electron 앱 기본 셸 (프로젝트 구조, 빌드 파이프라인)
- [x] 터미널 에뮬레이터 (xterm.js 기반, 멀티 탭, ANSI 256색, 탭 보존)
- [x] 에이전트 선택 드롭다운 (탭 `+` 버튼 → claude/gemini/codex/shell)
- [x] 에이전트 상태 표시 시스템 (idle/processing/awaiting input, pty 파싱)
- [x] 에이전트 자동 감지 (which/where, 미설치 비활성화)
- [ ] 멀티 LLM 연동 — 에이전트별 최적화 (현재: 기본 pty spawn만 구현)
- [ ] 플러그인 생성 파이프라인 (자연어 → 스펙 → 코드 → tool/skill)
- [ ] 플러그인 샌드박스 런타임
- [ ] 플러그인 관리 (목록, 활성화/비활성화, 삭제)
- [x] 파일 트리 브라우저 (chokidar 감시, 재귀 트리)
- [x] Git 기본 기능 (simple-git: status, commit, push, pull, branch, log)
- [ ] GitHub PR/Issue 조회
- [ ] 다크/라이트 테마 토글 UI (CSS 변수 토큰은 완료, 전환 버튼 미구현)
- [ ] Navbar expanded 토글 버튼 연결

### Out of Scope (Post-MVP)
- 커뮤니티 플러그인 허브 (아래 Post-MVP 로드맵 참조)
- 코드 에디터 (Monaco 등) 내장
- 협업 기능 (동시 편집, 세션 공유)
- 로컬 LLM 지원
- 플러그인 버전 관리
- 테마/UI 커스터마이징

---

## Post-MVP: Community Plugin Hub

### 배경
플러그인 생성에는 LLM 토큰이 상당량 소모된다. 이미 누군가 만든 플러그인이 니즈에 부합한다면 새로 생성할 필요 없이 재사용하는 것이 효율적이다.

### 개념: Search-First Generation
플러그인 생성 요청 시 즉시 생성하지 않고, 커뮤니티 허브를 먼저 조회하는 파이프라인으로 확장한다.

```
사용자 자연어 요청
    → 니즈 파악
    → 커뮤니티 허브 조회 (자연어 기반 시맨틱 검색)
    → 매칭 플러그인 존재?
        ├─ Yes → 추천 목록 제시 → 사용자 선택 → 설치 및 활성화
        └─ No  → 기존 Create n Play 파이프라인으로 진행
```

### 핵심 기능
- **시맨틱 검색**: 자연어 요청과 커뮤니티 플러그인 스펙을 매칭
- **AI 추천**: 유사도 기반으로 상위 후보 추천 + 차이점 설명
- **원클릭 설치**: 추천 플러그인 선택 시 즉시 설치 및 tool/skill 등록
- **커스터마이징 옵션**: 커뮤니티 플러그인을 기반으로 사용자 니즈에 맞게 수정 생성 (토큰 절약)
- **플러그인 퍼블리시**: 사용자가 만든 플러그인을 커뮤니티에 공유

---

## Technical Decisions

| 항목 | 선택 | 근거 |
|------|------|------|
| Framework | Electron | 크로스 플랫폼, 웹 기술 활용 |
| Terminal | xterm.js | Electron과 자연스러운 통합, 검증된 터미널 에뮬레이터 |
| Frontend | React + TypeScript | 컴포넌트 기반 UI, 타입 안전성 |
| Plugin Sandbox | Node.js VM / Worker Threads | 격리된 실행 환경, Node API 접근 제어 |
| LLM Integration | Adapter Pattern | 모델별 어댑터로 통일된 인터페이스 |
| IPC | Electron IPC + Event Emitter | Main/Renderer 간 통신 |
| State Management | Zustand | 경량, 간결한 상태 관리 |
| Package Manager | pnpm | 빠른 설치, 디스크 효율적 |
| Theme | Dark + Light | CSS 변수 기반 디자인 토큰으로 테마 전환 |
| Typography | JetBrains Mono (primary), IBM Plex Mono (secondary) | 터미널 네이티브 미학, 모노스페이스 전용 |

**에이전트 컬러 시스템**:

각 에이전트에 고유 색상을 부여하여 탭, 드롭다운, 상태 표시에서 시각적 구분.

| Agent | Color | 용도 |
|-------|-------|------|
| Claude Code | Amber (`#D97706`) | 탭 dot, 드롭다운 dot, 버튼 tint |
| Gemini CLI | Blue (`#3B82F6`) | 탭 dot, 드롭다운 dot, 버튼 tint |
| Codex CLI | Green (`#10B981`) | 탭 dot, 드롭다운 dot, 버튼 tint |
| Shell | Gray (tertiary) | 탭 dot, 드롭다운 dot |

---

## Milestones

### M1: Foundation (Week 1-2)
- Electron 앱 부트스트래핑
- xterm.js 터미널 통합
- 프로젝트 구조 및 빌드 파이프라인
- 기본 Shell 모드 동작
- Welcome Page (Open Repository, New Project, Recent Projects)
- Workspace 관리 (Navbar collapsed/expanded, 멀티 프로젝트)
- 다크/라이트 테마 토큰 시스템

### M2: AI Integration (Week 3-4)
- LLM 어댑터 레이어 (Claude, Gemini, Codex)
- AI 프롬프트 모드 구현
- AI/Shell 모드 전환
- Tool use / function calling 통합

### M3: Plugin System (Week 5-7)
- 플러그인 스펙 스키마 정의
- 플러그인 생성 파이프라인 구현
- 플러그인 샌드박스 런타임
- Tool/Skill 자동 등록 시스템
- 플러그인 관리 UI

### M4: File & Git (Week 8-9)
- 파일 트리 브라우저
- Git 상태 표시 및 기본 작업
- GitHub API 연동

### M5: Integration & Polish (Week 10)
- E2E 플러그인 Create n Play 플로우 검증
- 에러 핸들링 및 안정성
- 기본 온보딩 UX

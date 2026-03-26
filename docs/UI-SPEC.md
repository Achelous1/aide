# AIDE UI Functional Specification

디자인 시스템(design.pen)에 정의된 UI 컴포넌트의 기능 명세서.
개발 시 각 컴포넌트의 동작, 상태, 인터랙션을 참조한다.

---

## 1. Pages Overview

| Page | Description | Design Frames |
|------|-------------|---------------|
| Welcome | 앱 최초 실행 / 프로젝트 미선택 시 | Welcome (Dark/Light) |
| Terminal | 프로젝트 작업 화면 (메인) | Dark/Light Theme, Nav Expanded |

---

## 2. Welcome Page

프로젝트를 열지 않은 상태에서 보이는 첫 화면.

### 2.1 Layout

```
┌─────────────────────────────────────────────────┐
│ TopBar (40px, full width)                        │
├───────────┬─────────────────────────────────────┤
│ Workspace │                                      │
│ Navbar    │         Main Content                 │
│ (260px)   │  - Hero (> aide_)                    │
│           │  - Action Buttons                    │
│           │  - Recent Projects (5)               │
│           │                                      │
└───────────┴─────────────────────────────────────┘
```

### 2.2 TopBar

| Element | Spec | 동작 |
|---------|------|------|
| Traffic Lights | macOS: close/minimize/maximize (12×12 ellipse) | 네이티브 윈도우 컨트롤 |
| Title | `> aide` (JetBrains Mono 13px, accent color) | 앱 브랜딩, 클릭 불가 |

### 2.3 Workspace Navbar (Expanded, 260px)

좌측 사이드바. 전체 워크스페이스(프로젝트) 목록과 에이전트 상태를 표시.

#### Header Section

| Element | Icon | 동작 |
|---------|------|------|
| Workspaces | `grid_view` (Material Symbols) | 워크스페이스 목록 보기 (현재 활성) |
| Tasks | `checklist` (Material Symbols) | 태스크 목록 보기 (향후 구현) |

#### New Workspace Button

| Element | Spec | 동작 |
|---------|------|------|
| `+ New Workspace` | 단축키 `⌘N` 표시 | 클릭 시 디렉토리 선택 다이얼로그 → 새 워크스페이스 등록 |

#### Project List

각 프로젝트 항목:

| Element | Spec | 동작 |
|---------|------|------|
| Avatar | 22×22 컬러 사각형 + 이니셜 (cornerRadius 4) | 프로젝트 식별 컬러. 프로젝트명 첫 글자 표시 |
| Project Name | JetBrains Mono 13px, 500 weight | 프로젝트명 표시 |
| Agent Count | `(n)` 괄호 안 숫자 | 해당 프로젝트에서 활성 에이전트 수 |
| `+` Button | 14px | 해당 프로젝트에 새 에이전트 세션 추가 |
| `∨` / `›` Chevron | 12px | 에이전트 목록 펼침/접힘 토글 |

#### Agent Entry (프로젝트 하위)

| Element | Spec | 동작 |
|---------|------|------|
| Status Indicator | 상태별 아이콘 (아래 참조) | 에이전트 현재 상태 표시 |
| Agent Name | `local` 등 (JetBrains Mono 12px) | 에이전트 세션 식별자 |
| Diff Stats | `+1275 -63` (green/red) | Git 변경 사항 요약 |
| Branch | `feature/design` 등 (11px, tertiary) | 현재 작업 브랜치 |

클릭 시: 해당 프로젝트의 해당 에이전트 세션으로 이동 (Terminal Page 전환).

#### Active Project 표시

현재 선택된 프로젝트는 `surface-elevated` 배경으로 하이라이트.

### 2.4 Hero Section

| Element | Spec | 동작 |
|---------|------|------|
| Title | `> aide_` (JetBrains Mono 36px bold, accent) | 앱 브랜딩. 커서 깜빡임 애니메이션 권장 |
| Subtitle | `AI-Driven IDE for CLI Agents` (16px, secondary) | 설명 텍스트 |

### 2.5 Action Buttons

| Button | Style | 동작 |
|--------|-------|------|
| **Open Repository** | Primary (accent fill, dark text) | 클릭 → OS 디렉토리 선택 다이얼로그 → 선택된 경로로 워크스페이스 생성 → Terminal Page로 이동 |
| **+ New Project** | Secondary (surface-elevated fill, border) | 클릭 → 빈 디렉토리 생성 다이얼로그 또는 git clone 옵션 → 워크스페이스 생성 |

### 2.6 Recent Projects (최대 5개)

| Element | Spec | 동작 |
|---------|------|------|
| Avatar | 20×20 컬러 사각형 + 이니셜 | 프로젝트 식별 |
| Project Name | JetBrains Mono 13px | 프로젝트명 |
| Path | `~/repos/aide` (11px, tertiary) | 프로젝트 경로 |
| Time | `2m ago` (11px, tertiary) | 마지막 접근 시각 (상대 시간) |

클릭 시: 해당 프로젝트를 바로 열고 Terminal Page로 이동.

**데이터**: `electron-store`에 최근 프로젝트 목록 저장. 열 때마다 타임스탬프 갱신.

---

## 3. Terminal Page

프로젝트가 열린 후의 메인 작업 화면.

### 3.1 Layout — Collapsed Nav

```
┌─────────────────────────────────────────────────┐
│ TitleBar (40px, full width)                      │
├────┬──────┬─────────────────────────────────────┤
│ WS │ File │ TabBar (36px)                        │
│ Nav│ Exp  ├─────────────────────────────────────┤
│48px│220px │                                      │
│    │      │ Terminal Area                        │
│    │      │                                      │
│    │      │                                      │
├────┴──────┴─────────────────────────────────────┤
│ StatusBar (24px)                                 │
└─────────────────────────────────────────────────┘
```

### 3.2 Layout — Expanded Nav

```
┌─────────────────────────────────────────────────┐
│ TitleBar (40px, full width)                      │
├──────────┬──────┬───────────────────────────────┤
│ Workspace│ File │ TabBar (36px)                  │
│ Navbar   │ Exp  ├───────────────────────────────┤
│ (260px)  │220px │                                │
│          │      │ Terminal Area                  │
│          │      │                                │
├──────────┴──────┴───────────────────────────────┤
│ StatusBar (24px)                                 │
└─────────────────────────────────────────────────┘
```

### 3.3 TitleBar (40px)

| Element | Spec | 동작 |
|---------|------|------|
| Traffic Lights | close(red) / minimize(yellow) / maximize(green) | 네이티브 윈도우 컨트롤 |
| Title | `> aide` (centered, accent color, JetBrains Mono 13px bold) | 앱 브랜딩 |

### 3.4 Workspace Nav — Collapsed (48px)

좌측 아이콘 바. 전체 워크스페이스를 축소 표시.

#### Workspace Icon

| Element | Spec | 동작 |
|---------|------|------|
| Avatar | 28×28 컬러 사각형 + 이니셜 (cornerRadius 6) | 워크스페이스 식별 |
| Status Badge | 우상단 뱃지 (아래 표 참조) | 에이전트 상태 표시 |
| Active Highlight | `surface-elevated` 배경 (cornerRadius 6) | 현재 활성 워크스페이스 |

클릭 시: 해당 워크스페이스로 전환. FileExplorer와 Terminal이 해당 프로젝트 컨텍스트로 갱신.

#### 하단 요소

| Element | Spec | 동작 |
|---------|------|------|
| Divider | 24px 너비 가로선 | 시각적 구분 |
| `+` Button | 28×28 (surface-elevated, border, cornerRadius 6) | 새 워크스페이스 추가 (디렉토리 선택 다이얼로그) |

#### Nav Toggle

Collapsed ↔ Expanded 토글:
- 클릭 또는 드래그로 확장/축소
- 단축키: `⌘B` (권장)
- Expanded 시 260px 너비의 전체 프로젝트 리스트 표시

### 3.5 Workspace Nav — Expanded (260px)

Welcome Page의 Workspace Navbar와 동일한 구조.
추가로 Terminal Page에서는 FileExplorer 좌측에 위치.

### 3.6 File Explorer (220px)

| Element | Spec | 동작 |
|---------|------|------|
| Header | `EXPLORER` (10px, uppercase, tertiary) | 섹션 제목 |
| Folder | `▶`/`▼` + 폴더명 (13px) | 클릭 시 하위 트리 펼침/접힘 토글 |
| File | 파일명 (13px, secondary) | 클릭 시 console.log(path) (에디터 연동 향후) |

**기능**:
- 재귀 트리 뷰 (최대 깊이 10)
- 모든 디렉토리 표시 (자동 제외 없음)
- 정렬: 디렉토리 우선, 알파벳 순
- chokidar 기반 파일 변경 감시 (500ms 디바운스) → `fs:changed` 이벤트 → 자동 새로고침
- IPC: `readTree(cwd)`, `readFile(path)`, `writeFile(path, content)`, `delete(path)`, `onChanged(callback)`
- 워크스페이스 경로를 `cwd` prop으로 전달받음

### 3.7 TabBar (36px)

| Element | Spec | 동작 |
|---------|------|------|
| Active Tab | accent 색상 상단 보더(2px) + 에이전트 컬러 dot(6px) + 이름 | 현재 활성 탭 표시 |
| Inactive Tab | surface 배경 + tertiary dot + 이름 | 클릭 시 해당 탭으로 전환 |
| `+` Button | surface 배경, `+` 텍스트 (14px) | 클릭 시 Agent Dropdown 표시 |
| Tab Close | 탭 호버 시 `×` 표시 (구현 시) | 클릭 시 해당 세션 종료 및 탭 닫기 |

#### Agent Dropdown (+ 버튼 클릭 시)

`+` 버튼 클릭 시 아래로 펼쳐지는 드롭다운 메뉴.

| Element | Spec | 동작 |
|---------|------|------|
| Header | `New Tab` (11px, tertiary, 600 weight) | 섹션 제목 |
| `● claude` | amber dot + `Claude Code` hint | 클릭 → Claude Code 에이전트 세션 탭 생성 |
| `● gemini` | blue dot + `Gemini CLI` hint | 클릭 → Gemini CLI 에이전트 세션 탭 생성 |
| `● codex` | green dot + `Codex CLI` hint | 클릭 → Codex CLI 에이전트 세션 탭 생성 |
| Divider | 구분선 | — |
| `● $ shell` | gray dot + `Terminal` hint | 클릭 → 일반 Shell 터미널 탭 생성 |

**동작 상세**:
1. `+` 버튼 클릭 → 드롭다운 표시
2. 항목 선택 → `window.aide.terminal.spawn({ shell: agentCommand })` IPC 호출
3. 새 탭 생성 + 해당 에이전트/셸 pty 프로세스 시작
4. 드롭다운 자동 닫힘
5. 드롭다운 외부 클릭 시 닫힘

**비활성 에이전트**: 시스템에 미설치된 에이전트는 항목을 비활성(disabled) 처리하고 `Not installed` 힌트 표시.

### 3.8 Terminal Area

| Element | Spec | 동작 |
|---------|------|------|
| Background | `#0F1117` (terminal-bg 토큰) | xterm.js 캔버스 배경 |
| Font | JetBrains Mono 13px | 터미널 텍스트 |
| Prompt | 에이전트별 프롬프트 표시 | 에이전트 CLI 네이티브 프롬프트 |
| Output | 터미널 출력 스트림 | IPC를 통한 pty 출력 실시간 표시 |
| Cursor | 블록 커서 (깜빡임, `#CDD1E0`) | xterm.js cursorStyle: 'block' |

**기능**:
- xterm.js + FitAddon으로 터미널 영역 자동 리사이즈
- ResizeObserver로 컨테이너 크기 변경 감지 → `pty.resize(cols, rows)` IPC 호출
- 키보드 입력 → `terminal.write(sessionId, data)` IPC로 pty에 전달
- pty 출력 → `terminal.onData(sessionId, data)` 콜백으로 xterm에 쓰기
- **256색 ANSI 컬러**: pty 환경변수 `TERM=xterm-256color`, `COLORTERM=truecolor`, `FORCE_COLOR=1`
- **멀티탭 보존**: 각 탭마다 독립 TerminalPanel 인스턴스, 비활성 탭은 `display: none`으로 숨김 (출력 보존)
- **탭 닫기**: `window.aide.terminal.kill(sessionId)` → pty 종료 + 탭 제거 + 다음 탭 자동 전환

### 3.9 StatusBar (24px)

| Element | Spec | 동작 |
|---------|------|------|
| Git Branch | 실시간 브랜치명 (11px) | simple-git으로 30초 폴링, 변경 파일 수 표시 |
| Plugin Count | `[0] plugins active` (11px) | 활성 플러그인 수. 클릭 시 플러그인 패널 (향후) |
| Spacer | fill | — |
| Agent Name | `claude-opus-4-6` (11px) | 현재 탭의 에이전트/모델명 표시 |

### 3.10 Agent Auto-Detection

앱 시작 시 시스템에 설치된 CLI 에이전트를 자동 감지.

| Agent | Detection | 동작 |
|-------|-----------|------|
| Claude Code | `which claude` / `where claude` | 설치 시 활성, 미설치 시 비활성 |
| Gemini CLI | `which gemini` / `where gemini` | 설치 시 활성, 미설치 시 비활성 |
| Codex CLI | `which codex` / `where codex` | 설치 시 활성, 미설치 시 비활성 |
| Shell | 항상 사용 가능 | 기본 셸 (bash/zsh/powershell) |

- AgentDropdown 마운트 시 `window.aide.agent.detect()` 호출
- 미설치 에이전트: `opacity-40` + "Not installed" 힌트 + 클릭 차단
- 결과는 `agent-store.setInstalledAgents()`에 저장

---

## 4. Agent Status Indicators

에이전트의 현재 상태를 시각적으로 표현하는 뱃지 시스템.

### 4.1 Status Types

| Status | Badge | Color | 의미 |
|--------|-------|-------|------|
| **Idle** | `●` (8px filled circle) | `#3B82F6` (blue) | 작업 완료, 다음 프롬프트 대기 중 |
| **Processing** | `···` (14px circle, dots) | `#F59E0B` (amber) | 에이전트가 작업 수행 중. 실제 구현 시 3개 dot이 위아래 물결 애니메이션 |
| **Awaiting Input** | `?` (14px circle, question mark) | `#F59E0B` (amber) | 에이전트가 사용자 입력/확인을 요청 중 |

### 4.2 Badge 위치

- **Collapsed Nav**: 워크스페이스 아이콘 우상단 (negative gap으로 오버랩)
- **Expanded Nav**: 에이전트 행의 좌측 dot 위치
- **TabBar**: 탭 내 dot 색상으로 표현 (향후 확장)

### 4.3 상태 전환 로직

```
spawn → Processing
  ├─ 에이전트 출력 중 → Processing
  ├─ 프롬프트 대기 감지 → Idle
  ├─ 사용자 입력 요청 감지 → Awaiting Input
  └─ 에러 발생 → Error (red, 향후)
```

**감지 방식**: pty 출력 스트림을 파싱하여 에이전트별 프롬프트 패턴 매칭.
- Claude Code: `>` 프롬프트 → Idle
- Gemini CLI: `>` 프롬프트 → Idle
- Shell: `$` / `%` 프롬프트 → Idle

---

## 5. Agent Color System

각 에이전트에 고유 색상을 부여하여 시각적 구분.

| Agent | Dot Color | Dark Theme BG | Light Theme BG | 용도 |
|-------|-----------|---------------|-----------------|------|
| Claude | `#D97706` (amber) | `$--accent-warning` | `#FEF3C7` | 탭 dot, 에이전트 버튼 |
| Gemini | `#3B82F6` (blue) | `#1C2537` | `#EFF6FF` | 탭 dot, 에이전트 버튼 |
| Codex | `#10B981` (green) | `#152420` | `#F0FDF4` | 탭 dot, 에이전트 버튼 |
| Shell | `$--text-tertiary` (gray) | `$--surface-elevated` | `#F3F4F6` | 탭 dot, 에이전트 버튼 |

---

## 6. Design Tokens

### 6.1 Color Tokens (Dark / Light)

| Token | Dark | Light | 용도 |
|-------|------|-------|------|
| `--background` | `#131519` | `#F5F5F0` | 페이지 배경 |
| `--surface` | `#1A1C23` | `#FAFAF7` | 카드, 패널 배경 |
| `--surface-elevated` | `#24262E` | `#EBEBE6` | 헤더, 팝오버 배경 |
| `--surface-sidebar` | `#181A21` | `#EFEFEA` | 사이드바 배경 |
| `--border` | `#2E3140` | `#E0E3E8` | 보더, 구분선 |
| `--terminal-bg` | `#0F1117` | `#FAFAF7` | 터미널 영역 배경 |
| `--terminal-text` | `#CDD1E0` | `#374151` | 터미널 텍스트 |
| `--text-primary` | `#E8E9ED` | `#0D0D0D` | 기본 텍스트 |
| `--text-secondary` | `#8B8D98` | `#6B7280` | 보조 텍스트 |
| `--text-tertiary` | `#5C5E6A` | `#9CA3AF` | 약한 텍스트, 힌트 |
| `--accent` | `#10B981` | `#059669` | 브랜드 accent (emerald) |
| `--accent-warning` | `#F59E0B` | `#D97706` | 경고, Claude agent |
| `--accent-info` | `#06B6D4` | `#0891B2` | 정보 |

### 6.2 Layout Tokens

| Token | Value | 용도 |
|-------|-------|------|
| `--titlebar-height` | 40px | 타이틀바 높이 |
| `--header-height` | 44px | (제거됨, 드롭다운으로 대체) |
| `--sidebar-width` | 220px | File Explorer 너비 |
| `--tab-height` | 36px | 탭바 높이 |
| `--statusbar-height` | 24px | 상태바 높이 |

### 6.3 Typography

| Token | Value | 용도 |
|-------|-------|------|
| `--font-mono` | JetBrains Mono | 모든 UI 텍스트 (터미널 네이티브 스타일) |
| `--font-secondary` | IBM Plex Mono | 보조 폰트 (필요 시) |

---

## 7. Keyboard Shortcuts (권장)

| Shortcut | 동작 |
|----------|------|
| `⌘N` | 새 워크스페이스 |
| `⌘T` | 새 탭 (드롭다운 표시) |
| `⌘W` | 현재 탭 닫기 |
| `⌘1-9` | 탭 번호로 전환 |
| `⌘B` | Workspace Nav 토글 (collapsed ↔ expanded) |
| `⌘E` | File Explorer 토글 |
| `` ⌘` `` | 다음 탭으로 전환 |
| `⌘,` | 설정 (향후) |

---

## 8. State Management

### 8.1 Zustand Stores

| Store | 관리 대상 |
|-------|----------|
| `workspace-store` | 워크스페이스 목록, 활성 워크스페이스, 최근 프로젝트 |
| `terminal-store` | 탭 목록, 활성 탭, 각 탭의 pty sessionId |
| `file-store` | 파일 트리, 현재 경로 |
| `agent-store` | 설치된 에이전트 목록, 각 세션 상태 (idle/processing/awaiting) |

### 8.2 Persistence

| 데이터 | 저장 방식 | Key |
|--------|----------|-----|
| 워크스페이스 목록 | electron-store | `workspaces` |
| 최근 프로젝트 (5개) | electron-store | `recentProjects` |
| 마지막 활성 워크스페이스 | electron-store | `lastActiveWorkspace` |
| 윈도우 크기/위치 | electron-store | `windowBounds` |
| Nav 상태 (collapsed/expanded) | electron-store | `navCollapsed` |

---

## 9. IPC Channels (추가)

기존 TRD의 IPC에 Welcome Page 관련 채널 추가.

```typescript
// workspace channels
'workspace:list'        // 워크스페이스 목록 조회
'workspace:create'      // 새 워크스페이스 생성 (path)
'workspace:open'        // 워크스페이스 열기 (path → Terminal Page)
'workspace:remove'      // 워크스페이스 제거 (목록에서만)
'workspace:recent'      // 최근 프로젝트 목록 조회

// agent status channels
'agent:status'          // 에이전트 상태 변경 이벤트
'agent:detect'          // 설치된 에이전트 탐지
```

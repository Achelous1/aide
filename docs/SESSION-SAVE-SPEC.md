# Session Save/Restore Spec

## Overview

AIDE 세션을 저장하고 복원하는 기능. 앱을 종료하고 다시 열었을 때, 또는 워크스페이스를 전환할 때 이전 작업 환경을 그대로 복원한다.

## 저장 대상

### 1. 레이아웃 (탭 위치)
- 전체 레이아웃 트리 (`LayoutNode`: `Pane | SplitLayout`)
- 각 pane의 split 방향, 크기 비율
- focused pane ID

### 2. 탭 정보
- 각 pane 내 탭 목록 (`TerminalTab[]`)
- 탭 타입 (`agent | shell | plugin`)
- 활성 탭 ID (`activeTabId`)
- agent 탭: `agentId` (claude, gemini, codex 등)
- plugin 탭: `pluginId`, `pluginName`
- shell 탭: shell 종류 (bash, zsh 등)

### 3. 활성 플러그인
- 현재 활성화(ON)된 플러그인 ID 목록

## 저장하지 않는 것

- PTY 세션 (프로세스는 복원 불가 → 새로 spawn)
- 터미널 출력 히스토리 (xterm 버퍼)
- 에이전트 대화 상태 (에이전트 자체 히스토리 관리)

## 데이터 스키마

```typescript
interface SavedSession {
  version: 1;
  workspaceId: string;
  savedAt: number; // timestamp
  layout: LayoutNode;
  focusedPaneId: string | null;
  tabs: SavedTab[];
  activePlugins: string[]; // plugin IDs
  sidePanelTab: 'files' | 'plugins';
}

interface SavedTab {
  id: string;
  paneId: string;
  type: 'agent' | 'shell' | 'plugin';
  title: string;
  isActive: boolean; // activeTabId 여부
  // agent/shell 전용
  agentId?: string;
  // plugin 전용
  pluginId?: string;
}
```

## 저장 위치

`electron-store`의 workspace별 키:

```
aide-sessions: {
  "workspace-1": SavedSession,
  "workspace-2": SavedSession,
  ...
}
```

## 저장 시점

| 이벤트 | 동작 |
|--------|------|
| 워크스페이스 전환 | 현재 워크스페이스 세션 저장 |
| 앱 종료 (`before-quit`) | 활성 워크스페이스 세션 저장 |
| 수동 저장 (향후) | 단축키 또는 메뉴로 명시적 저장 |

## 복원 시점

| 이벤트 | 동작 |
|--------|------|
| 워크스페이스 열기 | 해당 워크스페이스의 저장된 세션 복원 |
| 앱 시작 | 마지막 활성 워크스페이스의 세션 복원 |

## 복원 절차

```
1. electron-store에서 SavedSession 로드
2. layout 트리 복원 (pane/split 구조)
3. 각 탭에 대해:
   a. shell 탭 → pty spawn → sessionId 할당 → 탭 생성
   b. agent 탭 → agent shell로 pty spawn → sessionId 할당 → 탭 생성
   c. plugin 탭 → 탭 생성 (PluginView가 protocol로 HTML 로드)
4. activeTabId 복원
5. focusedPaneId 복원
6. 활성 플러그인 복원 (각 pluginId에 대해 activate 호출)
7. sidePanelTab 복원
```

## IPC 채널

```typescript
// channels.ts에 추가
SESSION_SAVE: 'session:save',
SESSION_LOAD: 'session:load',
```

## 구현 범위

### Main Process (`src/main/ipc/session-handlers.ts`)
- `SESSION_SAVE`: renderer에서 SavedSession 수신 → electron-store에 저장
- `SESSION_LOAD`: workspaceId로 조회 → SavedSession 반환 (없으면 null)

### Preload (`src/preload/index.ts`)
- `window.aide.session.save(session: SavedSession): Promise<void>`
- `window.aide.session.load(workspaceId: string): Promise<SavedSession | null>`

### Renderer
- `layout-store.ts`: `saveSession()` — 현재 상태를 SavedSession으로 직렬화
- `layout-store.ts`: `restoreSession(session)` — SavedSession에서 레이아웃/탭 복원
- `workspace-store.ts`: `setActive()` 시 세션 저장/복원 호출
- `App.tsx`: 앱 시작 시 마지막 세션 복원 로직

### Types (`src/types/ipc.ts`)
- `SavedSession`, `SavedTab` 인터페이스 추가
- `AideAPI`에 `session` 섹션 추가

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 저장된 세션 없음 | 기본 레이아웃(빈 pane 1개)으로 시작 |
| 저장된 agent가 미설치 | 해당 탭을 shell로 fallback |
| 저장된 plugin 삭제됨 | 해당 탭 제거, 로그 경고 |
| 세션 스키마 버전 불일치 | 세션 무시, 기본 레이아웃 |
| 복원 중 pty spawn 실패 | 해당 탭 제거, 나머지 계속 복원 |

## 마이그레이션

기존 `workspaceLayouts` 인메모리 캐시는 세션 저장으로 대체. 기존 로직(`saveWorkspaceLayout`/`restoreWorkspaceLayout`)은 `saveSession`/`restoreSession`으로 리팩터링.

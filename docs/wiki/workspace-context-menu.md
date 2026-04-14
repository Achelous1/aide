---
title: "워크스페이스 컨텍스트 메뉴 — Rename / Path 표시 / Show in Finder"
category: architecture
tags: ["workspace", "context-menu", "rename", "ipc", "electron", "shell"]
created: 2026-04-14
related: [[eperm-uv-cwd-bugfix]]
---

# 워크스페이스 컨텍스트 메뉴

PR #38. 워크스페이스 사이드바에 우클릭 컨텍스트 메뉴와 인라인 rename, 경로 표시, Show in Finder를 추가.

## 기능 요약

| 기능 | 동작 |
|------|------|
| 컨텍스트 메뉴 트리거 | 워크스페이스 행 우클릭 또는 `···` 버튼(호버) |
| 메뉴 순서 | Rename → Show in Finder → [구분선] → Remove from Workspace |
| 인라인 Rename | 이름이 `<input>`으로 전환, Enter/blur 저장, Esc 취소 |
| 경로 표시 | 이름 아래 `text-[10px]` 텍스트로 항상 표시 |
| Show in Finder | `shell.showItemInFolder(path)` (Windows: Explorer) |

## IPC 구조

### 채널 (`src/main/ipc/channels.ts`)

```ts
WORKSPACE_RENAME: 'workspace:rename',
WORKSPACE_SHOW_IN_FINDER: 'workspace:show-in-finder',
```

### Main 핸들러 (`src/main/ipc/workspace-handlers.ts`)

```ts
// WORKSPACE_RENAME — electron-store에서 name 필드 업데이트
ipcMain.handle(WORKSPACE_RENAME, (_e, id, name) => {
  const ws = getWorkspaces().find(w => w.id === id);
  if (!ws) return null;
  ws.name = name;
  setWorkspaces(workspaces);
  return ws;
});

// WORKSPACE_SHOW_IN_FINDER — shell.showItemInFolder() 위임
ipcMain.handle(WORKSPACE_SHOW_IN_FINDER, (_e, path) => {
  shell.showItemInFolder(path);
});
```

### Preload (`src/preload/index.ts`)

```ts
workspace: {
  rename: (id, name) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_RENAME, id, name),
  showInFinder: (path) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SHOW_IN_FINDER, path),
}
```

## 상태 관리 (`src/renderer/stores/workspace-store.ts`)

```ts
renameWorkspace: (id, name) =>
  set((state) => ({
    workspaces: state.workspaces.map((w) => w.id === id ? { ...w, name } : w),
  })),
```

IPC 호출 전 낙관적 업데이트로 UI가 즉시 반응.

## 컨텍스트 메뉴 구현 (`WorkspaceNav.tsx`)

**클릭 외부 닫기** — `useRef` + `document.addEventListener('mousedown', ...)` 조합:

```ts
useEffect(() => {
  if (!contextMenuId) return;
  const handler = (e: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setContextMenuId(null);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [contextMenuId]);
```

**오버레이** — `position: fixed` + `z-50`, 클릭 좌표(`clientX/Y`)로 위치 결정.

**인라인 rename input** — input의 `onClick`에 `e.stopPropagation()`을 걸어 워크스페이스 활성화 버튼 클릭 전파 차단.

## design.pen 변경

ContextMenu 프레임(AhO8e)에 `cm1 (Rename)` 항목을 index 0으로 삽입 (pencil MCP `M(node, parent, 0)` 사용).

최종 순서: cm1(Rename) → cm2(Show in Finder) → cmDiv → cm3(Remove from Workspace)

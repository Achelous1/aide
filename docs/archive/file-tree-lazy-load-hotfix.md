---
title: File Tree Lazy-Load Hotfix (v0.0.4)
category: session-log
tags: [hotfix, file-tree, ipc, performance, v0.0.4]
created: 2026-04-15
---

# File Tree Lazy-Load Hotfix (v0.0.4)

## Problem

패키지 앱(DMG)에서 파일 트리가 표시되지 않는 현상.
`pnpm start` 개발 모드에서는 정상 동작하나 배포 버전에서는 파일 탐색기가 빈 상태.

## Root Cause

`src/main/ipc/fs-handlers.ts`의 `readTree()` 함수가 MAX_DEPTH=10으로 동기 재귀 탐색을 수행.
`node_modules`, `.git` 등 수천 개의 파일이 있는 디렉토리에서 IPC 채널이 응답 없이 블로킹됨.
개발 모드에서는 타임아웃 허용치가 높아 증상이 숨겨졌으나 패키징 후 명확히 드러남.

## Fix

### `src/main/ipc/fs-handlers.ts`
- `readTree()`를 비재귀로 변경 — 즉각 자식(depth 0)만 반환
- `IGNORED_DIRS` 필터 추가: `.git`, `node_modules`, `.aide`

### `src/renderer/components/file-explorer/FileExplorer.tsx`
- `TreeNode`에 lazy-load 추가
- `children` 상태를 `null`(미로드)로 초기화
- 디렉토리 확장 시 `window.aide.fs.readTree(node.path)` IPC 호출로 자식 로드

## PRs

- **#44**: hotfix/file-tree-lazy-load → main
- **#45**: hotfix/file-tree-lazy-load → develop

---
title: "macOS TCC 파일 권한 처리"
category: environment
tags: [macos, tcc, permissions, packaging, file-system]
created: 2026-04-15
updated: 2026-04-15
related: [[eperm-uv-cwd-bugfix]], [[workspace-context-menu]]
---

# macOS TCC 파일 권한 처리

## 요약
패키지 앱(DMG)이 macOS에서 `~/Documents` 등 보호 폴더를 읽을 때 권한 필요. smalti는 **Files and Folders** 권한만 요구 (Full Disk Access 불필요, VS Code와 동일 수준).

## 문제 재현
- dev(`pnpm start`)에서는 발생 안 함 (터미널 권한 상속)
- DMG 설치 앱 + Finder 런칭 시 `fs.readdirSync` → EPERM
- 원인: Info.plist에 usage description 누락 → OS가 프롬프트 없이 조용히 차단

## 해결책 (2단 방어)

### 1단: Info.plist usage descriptions
`forge.config.ts`의 `extendInfo`에 다음 키 포함:
- NSDocumentsFolderUsageDescription
- NSDesktopFolderUsageDescription
- NSDownloadsFolderUsageDescription
- NSRemovableVolumesUsageDescription
- NSNetworkVolumesUsageDescription

첫 접근 시 OS가 네이티브 프롬프트 자동 표시. 사용자가 "Allow" 선택 → 영구 유지.

### 2단: Permission Banner (거부 복구 경로)
사용자가 1단에서 "Don't Allow" 선택 시 OS는 재프롬프트 안 함. smalti 렌더러가 EPERM 감지 → 배너 표시:
- "Open Settings" 버튼 → System Settings의 **Files and Folders** 섹션 deep link
- 사용자가 해당 폴더 토글 켜고 앱으로 복귀 → window focus 이벤트로 자동 재시도

## Full Disk Access는 왜 불필요한가
| 권한 레벨 | 범위 | 요구 케이스 |
|-----------|------|-----------|
| Files and Folders | Documents/Desktop/Downloads 등 per-folder | **smalti 워크스페이스** (이것만 필요) |
| Full Disk Access | 시스템 전역 (Library, Trash, 다른 사용자 홈) | Backup/Antivirus 앱 전용 |

VS Code, Cursor 등도 Files and Folders만 사용. Full Disk Access 요구는 UX 과잉이며 사용자 신뢰 저하 요인.

## Deep link URL
- macOS 13+ (Darwin 22+): `x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_FilesAndFolders`
- macOS 12 이하: `x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders`

## 관련 파일
- `forge.config.ts` — Info.plist 키
- `src/main/ipc/fs-handlers.ts` — FS_READ_TREE_WITH_ERROR, OPEN_PRIVACY_SETTINGS
- `src/renderer/components/file-explorer/PermissionBanner.tsx` — 배너 UI
- `src/renderer/components/file-explorer/FileExplorer.tsx` — focus 재시도

## 관련 스펙
- [UI-SPEC.md §3.6.2 Permission Banner](../spec/UI-SPEC.md)
- [TRD.md macOS TCC 대응 섹션](../spec/TRD.md)

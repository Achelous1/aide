# smalti Wiki Index

## Architecture
- [[workspace-context-menu]] — 워크스페이스 rename/경로 표시/Show in Finder, IPC 구조 및 컨텍스트 메뉴 구현
- [[app-settings-persistence]] — aide-app-settings electron-store로 테마/윈도우 bounds 전역 영속화
- [[smalti-palette-c-theme]] — smalti 팔레트 C 토큰 시스템, aide-* alias와 smalti-* opacity 토큰의 두 층 구조, design.pen 기준 매핑표

## Decisions
- [[plugin-scope-local-only]] — 글로벌 플러그인 스코프 제거, .mcp.json 생성 중단 + 자동 마이그레이션
- [[rust-core-migration]] — Phase 0+1 완료: chokidar → Rust notify, fs ops → Rust aide-core+napi

## Debugging
- [[mcp-server-sandbox-duplication]] — MCP server.js와 plugin/sandbox.ts가 plugin sandbox를 중복 구현, v0.2.2 alias 동기화 누락으로 칸반 데이터 안 보인 P0 버그(v0.3.1 수정)
- [[eperm-uv-cwd-bugfix]] — pty 스폰/plugin:list EPERM 에러, process.cwd() 미검증 원인 및 수정
- [[main-process-cpu-home-watcher-bugfix]] — DMG idle CPU 127% 이슈, fallback cwd로 HOME 전체를 감시하던 chokidar watcher 라이프사이클 재설계

## Environment
- [[xterm-font-nerd-font]] — xterm.js Nerd Font 글리프 렌더링, Symbols Nerd Font 번들링
- [[macos-tcc-file-permissions]] — macOS TCC Files and Folders 권한, 2단 방어(Info.plist + Permission Banner), Full Disk Access 불필요 근거

## Performance
- [[watcher-performance]] — chokidar watcher exclusion (VS Code 방식), Stage 1 하드코딩 + Stage 2/3/Phase 2 로드맵

---
title: "App Settings Persistence"
category: architecture
tags: [electron-store, theme, window-bounds, persistence]
created: 2026-04-17
updated: 2026-04-17
related: [[plugin-scope-local-only]]
---

# App Settings Persistence

## Context

앱 종료 후 재실행 시 두 가지가 리셋되었다:
- **테마**: 항상 dark로 초기화 (사용자가 light로 바꿔도 다음 실행 시 dark)
- **윈도우 해상도**: 항상 1200x800으로 초기화

기존 `electron-store`는 워크스페이스 세션(`aide-workspaces`, `aide-sessions`)에만 쓰였고, 앱 레벨 전역 설정용 스토어가 없었다.

## 결정

**새로운 `aide-app-settings` electron-store를 도입**하여 글로벌 앱 설정 (테마 + 윈도우 bounds)을 영구 저장한다.

### 왜 기존 스토어를 재활용하지 않나

- `aide-sessions`: workspace별 레이아웃 세션 — 글로벌 앱 설정과 스코프 불일치
- `aide-workspaces`: workspace 목록 메타데이터 — 앱 설정이 여기 섞이면 책임 분리 위배
- **신규 스토어**가 가장 깔끔 — 각 스토어 = 하나의 concern

## 구현

### 새 모듈: `app-settings-handlers.ts`

```ts
export interface AppSettings {
  theme: 'dark' | 'light';
  windowBounds: { x: number; y: number; width: number; height: number } | null;
}

const defaults: AppSettings = { theme: 'dark', windowBounds: null };
const store = new Store<AppSettings>({ name: 'aide-app-settings', defaults });

export function getAppSettings(): AppSettings { /* ... */ }
export function setAppSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void { /* ... */ }

export function registerAppSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.APP_SETTINGS_GET, () => getAppSettings());
  ipcMain.handle(IPC_CHANNELS.APP_SETTINGS_SET, (_event, key, value) => {
    if (key === 'theme' || key === 'windowBounds') store.set(key, value);
  });
}
```

저장 위치: `~/Library/Application Support/aide/aide-app-settings.json` (macOS)

### 윈도우 바운드 저장 (main process)

`createWindow()`에서:

1. **기동 시 복원**: `getAppSettings().windowBounds`를 `BrowserWindow` 생성자에 전달
   - `windowBounds === null` → `x`, `y` 생략하면 Electron이 자동 중앙 정렬
2. **변경 시 저장**: `resize` / `move` 이벤트에 **500ms debounce**로 `setAppSetting('windowBounds', win.getBounds())` 호출

```ts
let boundsTimer: ReturnType<typeof setTimeout> | null = null;
const saveBounds = () => {
  if (boundsTimer) clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    if (!mainWindow.isDestroyed()) {
      setAppSetting('windowBounds', mainWindow.getBounds());
    }
  }, 500);
};
mainWindow.on('resize', saveBounds);
mainWindow.on('move', saveBounds);
```

**Debounce 이유**: 드래그 중 매 픽셀마다 디스크 쓰기 → I/O 낭비. 500ms는 사용자 인지 없이 사라질 수 있는 지연이면서, 연속 이벤트를 하나로 합치기에 충분.

### 테마 저장 (renderer process)

`theme-store.ts`에 `loadSavedTheme()` 액션 추가:

```ts
loadSavedTheme: async () => {
  try {
    const settings = await window.aide.appSettings.get();
    if (settings.theme && settings.theme !== 'dark') {
      applyTheme(settings.theme);
      set({ theme: settings.theme });
    }
  } catch {
    // First launch — keep default dark
  }
},
```

`toggleTheme()`과 `setTheme()`은 이제 `window.aide.appSettings.set('theme', next)`로 즉시 저장.

### 앱 시작 시 복원 (App.tsx)

```tsx
useEffect(() => {
  useThemeStore.getState().loadSavedTheme();
}, []);
```

`beforeunload`나 종료 훅에 의존하지 않고 **변경 시 즉시 저장** (eager write) 패턴을 채택. 크래시 시에도 마지막 설정이 살아남는다.

### 초기 로드 시 transition 억제

`loadSavedTheme()`은 `applyTheme()`을 호출하지만, **최초 렌더링 전**에 실행되므로 `.theme-transitioning` 클래스가 의미 없다. 오히려 fresh mount에서 보이면 어색한 페이드가 발생할 수 있다. 현재 구현은 transition 클래스를 그대로 적용하지만 — 첫 페인트 전이라 시각적으로 문제 없음.

## IPC 계약

### 채널 (`channels.ts`)
```ts
APP_SETTINGS_GET: 'app-settings:get',
APP_SETTINGS_SET: 'app-settings:set',
```

### Preload (`window.aide.appSettings`)
```ts
appSettings: {
  get(): Promise<{ theme: 'dark' | 'light'; windowBounds: WindowBounds | null }>;
  set(key: string, value: unknown): Promise<void>;
},
```

## 테스트 전략

`electron-store`를 모듈 레벨에서 인스턴스화하는 구조는 테스트하기 까다롭다. 해결책: **`vi.mock('electron-store')`**로 in-memory Map 기반 모의 객체 주입.

`tests/unit/app-settings.test.ts` 9개 케이스:
- 초기 기본값 반환
- 저장된 테마/bounds 반환
- theme/windowBounds 저장
- 덮어쓰기
- null 리셋
- 타입 계약 검증

## 저장 지점 정리

| 스토어 | 파일 이름 | 스코프 | 용도 |
|-------|----------|--------|------|
| `aide-workspaces` | aide-workspaces.json | 전역 | 워크스페이스 목록, 색상, lastOpened |
| `aide-sessions` | aide-sessions.json | 전역 (workspaceId 키) | 레이아웃/활성 플러그인/사이드패널 탭 |
| `aide-app-settings` | aide-app-settings.json | 전역 | 테마, 윈도우 bounds |

각 스토어는 단일 concern — 새 설정이 추가될 때 기존 스토어에 추가할지 새 스토어를 만들지는 **스코프(전역 vs workspace)**와 **변경 빈도**로 판단한다.

## 검증

- `pnpm test`: 123/123 통과 (9 테스트 추가)
- 수동: light 테마로 변경 → 종료 → 재실행 → light로 시작 확인
- 수동: 윈도우 리사이즈 → 종료 → 재실행 → 동일 크기/위치 확인

## PR

- #54 `feat: persist theme and window resolution across restarts` (develop)

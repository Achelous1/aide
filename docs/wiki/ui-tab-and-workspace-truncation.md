# UI: Tab Title Overflow & Workspace Path Tooltip

좁은 윈도우에서의 텍스트 처리 패턴 두 가지를 정리한다. 두 변경은 별도 PR로 머지되었다 (#67 탭 overflow, #66 워크스페이스 툴팁).

## 문제

### 1. 탭 제목 wrapping

`PaneView`, `TabBar`, `WorkspaceNav` 의 탭 제목 `<span>` 에는 truncation CSS가 없거나 (`PaneView`/`TabBar`) 부모 flex 컨테이너의 폭 제약이 없어 (`WorkspaceNav`), 윈도우가 좁아지면 탭 제목이 두 줄·세 줄로 wrap 되어 탭 행 높이가 늘어났다.

### 2. 워크스페이스 경로 잘림 방향

`WorkspaceNav` 의 워크스페이스 행은 이름과 절대 경로를 표시한다. 절대 경로는 끝부분 (`/aide` 같은 마지막 세그먼트) 이 식별에 가장 중요한데, 기본 `text-overflow: ellipsis` 는 뒤에서 자른다 → `/Users/chinshuu/Doc…` 처럼 정작 중요한 끝이 사라졌다. hover 시 풀 경로를 볼 수단도 없었다.

## 해결

### 탭 제목 (PR #67)

세 컴포넌트의 탭 컨테이너에 동일한 패턴 적용:

```tsx
// 부모 버튼/컨테이너
className="flex items-center min-w-0 min-w-[80px] max-w-[200px]"

// 제목 span
className="truncate"

// close 버튼 (있을 경우)
className="flex-shrink-0"
```

핵심 포인트:
- **`min-w-0`** — Flex 자식은 기본값이 `min-width: auto` 라 콘텐츠보다 작게 줄지 않는다. `min-w-0` 으로 풀어줘야 `truncate` 가 동작한다 (자주 빠뜨리는 부분).
- **`max-w-[200px]`** — wrap 대신 ellipsis 트리거를 위한 상한. 200px 는 모노스페이스 12px 폰트로 약 25자.
- **`min-w-[80px]`** — 너무 좁아져 탭이 사라지는 것 방지.
- **`flex-shrink-0` on close button** — title 만 줄이고 close 는 항상 표시.

대상 파일:
- `src/renderer/components/layout/PaneView.tsx`
- `src/renderer/components/terminal/TabBar.tsx`
- `src/renderer/components/workspace/WorkspaceNav.tsx` (line ~300, 탭 제목 영역만)

### 워크스페이스 경로 (PR #66)

#### Front-truncation (좌측 ellipsis)

CSS `direction` 트릭으로 라이브러리 없이 처리:

```tsx
<span dir="rtl" className="truncate inline-block w-full text-left">
  <span dir="ltr">{ws.path}</span>
</span>
```

`dir="rtl"` 은 ellipsis 위치를 좌측으로 옮긴다. 안쪽 `dir="ltr"` 은 경로 자체의 글자 방향은 정상으로 유지. 결과: `…/repositories/aide`.

#### Tooltip 컴포넌트 (신규)

`src/renderer/components/ui/Tooltip.tsx` — Tailwind only, 외부 의존성 없음.

```tsx
import { Tooltip } from '../ui/Tooltip';

<Tooltip content={`${ws.name}\n${ws.path}`} placement="right">
  <button>…workspace row…</button>
</Tooltip>
```

Public API:

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `content` | `React.ReactNode` | (필수) | 툴팁 내용. `\n` 으로 멀티라인. ReactNode 도 가능. |
| `children` | `React.ReactNode` | (필수) | 툴팁이 붙을 대상 |
| `placement` | `'top' \| 'bottom' \| 'right'` | `'top'` | 표시 위치 |
| `className` | `string` | — | wrapper 추가 클래스 |

동작:
- hover (`mouseenter`) / focus (`focusin`) 시 200ms 지연 후 표시 (플리커 방지)
- `mouseleave` / `focusout` 즉시 hide
- 표시 중 wrapper 에 `aria-describedby` 자동 부여
- 툴팁 노드는 `role="tooltip"`
- 포지셔닝은 wrapper 기준 absolute (포털 사용 안함 — 본 스코프에서 충분)

## 재사용 가이드라인

### Tooltip 적용 시 주의

1. **Wrapper 가 `relative` 컨텍스트를 가질 것** — 컴포넌트 내부에서 `relative` 를 추가하지만, 부모가 `overflow: hidden` 이면 잘릴 수 있다. side panel 같은 좁은 영역에서는 `placement="right"` 권장.
2. **인터랙션 가능한 children** (button, link 등) 에만 사용 — 일반 텍스트에 hover 만 거는 건 a11y 안티패턴이라 `aria-describedby` 가 의미 없어짐.
3. **포털이 필요한 케이스 (드롭다운 안쪽 등)** — 본 컴포넌트는 portal 없이 wrapper-relative 로 동작하므로 `overflow:hidden` 부모가 있는 컨테이너에서는 잘릴 수 있다. 그런 경우 향후 `Tooltip` 에 `portal?: boolean` 옵션을 추가하거나 `@radix-ui/react-tooltip` 도입을 고려.

### 탭 truncation 패턴 적용 시

다른 좁은 영역 (예: 새 탭 그룹, 사이드바 항목) 에 같은 패턴을 적용할 때:

- **`min-w-0` 누락 디버깅** — `truncate` 적용했는데 안 잘리면 99% 부모 flex 의 `min-width: auto` 문제. 부모/자식 양쪽에 `min-w-0` 추가해 보기.
- **`max-w-*` 값** — 12px 모노스페이스 기준 200px ≈ 25자. 다른 폰트 크기에서는 비례 조정.
- **`flex-shrink-0` 누락 디버깅** — close/icon 버튼이 사라진다면 부모 flex 가 그것까지 줄이고 있는 것. 액션 요소에는 항상 `flex-shrink-0`.

## 검증

- 단위 테스트: `tests/unit/tab-title-overflow.test.tsx` (탭), `tests/unit/tooltip.test.tsx` (Tooltip) — 총 14 신규 케이스
- 시각 검증 시나리오:
  1. `pnpm start` → 윈도우 폭을 600px 이하로 줄여 탭 제목이 wrap 되지 않고 `…` 으로 잘리는지
  2. 워크스페이스 행에 마우스 hover → 200ms 후 풀 name + path 툴팁 표시
  3. 키보드 Tab 으로 워크스페이스 행에 focus → 동일하게 툴팁 표시 (a11y)
  4. 경로 표시가 `…/repositories/aide` 형태인지 (앞이 잘리고 끝이 보이는지)

## 관련 PR

- #66 — `feat(ui): show full workspace path in hover tooltip with front-truncated label`
- #67 — `feat(ui): truncate long tab titles with ellipsis`
- 칸반: `task_hk6huk7o`, `task_pch4mwec`

---
description: 세션 마무리 — 작업 이력을 wiki에 기록하고, 스펙 드리프트를 보정하며, 재사용 가능한 패턴 인사이트를 제공
---

# /wrap — 세션 랩업

이 커맨드는 현재 세션에서 수행된 작업을 체계적으로 마무리합니다. 4단계로 진행됩니다.

## Phase 1 — 세션 작업 수집

대화 이력과 git 상태에서 이번 세션의 작업을 추출합니다. **에이전트에게 위임하지 말고 직접 수집**하세요 (대화 컨텍스트는 서브에이전트에 전달 안 됨).

다음 항목을 정리:
- **생성/머지된 PR**: `gh pr list --author @me --state all --limit 10` 및 대화에서 언급된 PR 번호
- **변경된 파일**: `git log --since="1 day ago" --oneline` + 각 커밋의 변경 파일
- **주요 결정**: 대화 중 논의된 아키텍처/설계 결정 (Why 중심)
- **발견한 버그/패턴**: 디버깅 과정에서 드러난 non-obvious 사실
- **완료된 칸반 태스크**: `mcp__aide__plugin_agent-todo-board_get_board`로 오늘 done 된 항목

## Phase 2 — Wiki 작성

수집한 내용을 `docs/CLAUDE.md`의 LLM Wiki 규약에 맞춰 기록합니다.

### 2.1 `docs/wiki/log.md`에 한 줄 엔트리 추가

포맷: `YYYY-MM-DD [ingest|update|lint] Created/Updated [[page-name]] — 한 줄 설명 (PR #N)`

작업당 1개 엔트리. 복수 PR이면 복수 엔트리.

### 2.2 `docs/wiki/<slug>.md` 페이지 생성 또는 업데이트

**신규 페이지**: 새로운 아키텍처 결정, 패턴, 디버깅 인사이트가 있을 때. YAML frontmatter 필수:

```yaml
---
title: "..."
category: architecture | decision | pattern | debugging | environment | session-log
tags: [...]
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: [[...]], [[...]]
---
```

**구조 가이드** (category별 중점):
- `decision`: Context / 결정 / 왜 / 거부된 대안 / 구현 요약 / PR
- `architecture`: Context / 결정 / 구현 상세 / 영향 범위 / 관련 문서
- `debugging`: 증상 / 재현 경로 / 근본 원인 / 수정 / 재발 방지
- `pattern`: 패턴 / 언제 쓰나 / 언제 쓰지 말아야 하나 / 예시

**기존 페이지 업데이트**: 기존 결정/패턴이 이번 세션에서 확장되었다면 새 페이지 대신 기존 페이지에 섹션 추가 + `updated:` 갱신.

### 2.3 `docs/wiki/index.md` 업데이트

신규 페이지를 category 섹션에 `- [[page-name]] — 한 줄 요약` 형태로 추가. 알파벳 순이 아니라 **중요도/관련성 순**.

## Phase 3 — 스펙 드리프트 검증 및 보정

`docs/spec/{PRD,TRD,UI-SPEC}.md` 3개 파일과 이번 세션의 변경 사이의 불일치를 찾습니다.

### 3.1 드리프트 탐지

각 스펙 파일에 대해:

1. **Grep으로 관련 섹션 찾기**: 변경된 파일/기능의 키워드로 검색 (예: 플러그인 스코프 변경 → "global", "scope", "plugin directory" 등)
2. **불일치 유형 식별**:
   - **Outdated claim**: 스펙이 옛 동작을 기술 (예: "Plugins can be installed globally or locally")
   - **Missing feature**: 구현되었으나 스펙에 없음 (예: 새 IPC 채널, 새 설정)
   - **Wrong path/name**: 경로/심볼 이름이 바뀌었으나 스펙 미반영
3. **보정 필요성 판단**:
   - `PRD.md`: 사용자 가치/기능 범위 변화만 반영 (세부 구현 아님)
   - `TRD.md`: 아키텍처/기술 스택/IPC 계약/데이터 모델 변경 반영
   - `UI-SPEC.md`: UI 컴포넌트/상호작용/상태 변경 반영

### 3.2 수정 원칙

- **사용자 의도 보존**: 스펙의 스타일과 목소리를 유지 (임의로 리라이트 금지)
- **최소 변경**: 해당 섹션만 수정, 주변 문단 건들지 말 것
- **Diff 먼저 표시**: 수정 전에 "이 섹션을 이렇게 바꾸겠다" 요약을 사용자에게 보여줄 것
- **확신 없으면 물어볼 것**: 스펙 수정은 사이드이펙트 큼 — 애매한 건 확인 후 진행

## Phase 4 — 메타 인사이트 제공

마지막으로 사용자에게 다음 2가지 인사이트를 제시:

### 4.1 `omc remember`에 저장할 만한 패턴

이번 세션에서 나온 피드백/선호/결정 중 **durable memory**로 보존할 가치가 있는 항목을 제안. 예시:
- 반복된 지시사항 ("이렇게 해줘"가 2번 이상 나왔거나, 암묵적 가정이 드러남)
- 프로젝트 고유 규칙 (이 repo에만 적용되는 관례)
- 성공한 패턴 ("이 방식이 잘 먹혔다" — 재현 가치 있음)

이미 MEMORY.md에 있는 항목과 중복되면 제외. 각 제안에 대해:
```
[제안] feedback_<name>.md
설명: <왜 저장 가치가 있는지>
내용 초안: <3-5줄>
```

사용자가 Y/N으로 승인하면 작성.

### 4.2 새 slash 커맨드 아이디어

이번 세션에서 **2회 이상 반복되었거나 5단계 이상으로 구성된 워크플로우**를 발견했다면 커맨드 후보로 제안. 예시:
- "DA 리뷰 → P1 수정 → 재검증" 루프 → `/review-loop`
- "칸반 todo 생성 → 팀 spawn → 리뷰 → PR" → `/team-flow`

각 제안에 대해:
```
[커맨드 후보] /<name>
트리거: 언제 쓰는가
단계: 1) ... 2) ... 3) ...
근거: 이번 세션에서 N번 반복됨
```

사용자가 원하면 `.claude/commands/<name>.md`로 작성.

---

## 실행 순서

1. Phase 1 수집 → 사용자에게 **무엇을 기록할지** 1-2문장으로 브리핑
2. Phase 2 실행 → log + wiki 파일 작성 (Edit/Write 사용)
3. Phase 3 실행 → 스펙 diff 요약 → 사용자 승인 후 수정
4. Phase 4 실행 → 인사이트 제시 → 사용자 승인 항목만 저장

**Phase 3 자동 수정 금지**: 스펙은 반드시 diff 보여준 뒤 승인 받고 수정.

**Phase 4 자동 저장 금지**: 메모리와 커맨드 추가는 반드시 사용자 승인 후 진행.

## 주의

- 이 커맨드는 **세션 이력이 충분할 때** 의미 있음. 대화가 짧으면 Phase 1에서 "이번 세션은 기록할 만큼 작업이 많지 않습니다"로 종료 가능.
- Phase 2 wiki 작성은 Write/Edit 직접 사용 — Sonnet executor에 위임 금지 (컨텍스트 손실).
- Phase 3 스펙 검증은 각 파일이 크므로 **Grep으로 관련 섹션만 찾아 Read** (전체 Read 금지).
- Phase 4 제안은 최대 3개씩. 너무 많으면 오히려 노이즈.

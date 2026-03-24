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

### F1. AI Terminal (Core Interface)

AIDE의 메인 인터페이스. 모든 상호작용의 시작점.

- Electron 기반 터미널 에뮬레이터
- AI 프롬프트 모드: 자연어 입력 → AI 응답 및 실행
- Shell 모드: 일반 터미널로 동작 (bash/zsh)
- 모드 전환: 단축키 또는 prefix로 AI/Shell 모드 전환
- 멀티 LLM 지원: Claude, Gemini, Codex
  - 모델 선택/전환 가능
  - 각 모델의 tool use / function calling 활용

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

- 트리 뷰 파일 브라우저
- 파일/폴더 CRUD
- 파일 검색 (이름, 내용)
- 터미널 사이드 패널로 토글

### F4. Git & GitHub Integration

버전 관리 및 협업 기본 기능.

- Git 상태 표시 (변경 파일, 브랜치 등)
- 기본 Git 작업: commit, push, pull, branch, merge
- GitHub 연동: PR 생성/조회, 이슈 조회
- AI를 통한 자연어 Git 작업 ("마지막 3개 커밋 squash 해줘")

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

### Flow 3: 일반 터미널 사용

```
User: (Shell 모드 전환)
$ npm install
$ git status
$ npm test
```

---

## MVP Scope 정의

### In Scope (MVP)
- [ ] Electron 앱 기본 셸 (프로젝트 구조, 빌드 파이프라인)
- [ ] 터미널 에뮬레이터 (xterm.js 기반)
- [ ] AI/Shell 모드 전환
- [ ] 멀티 LLM 연동 (Claude, Gemini, Codex)
- [ ] 플러그인 생성 파이프라인 (자연어 → 스펙 → 코드 → tool/skill)
- [ ] 플러그인 샌드박스 런타임
- [ ] 플러그인 관리 (목록, 활성화/비활성화, 삭제)
- [ ] 파일 트리 브라우저
- [ ] Git 기본 기능 (status, commit, push, pull, branch)
- [ ] GitHub PR/Issue 조회

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

---

## Milestones

### M1: Foundation (Week 1-2)
- Electron 앱 부트스트래핑
- xterm.js 터미널 통합
- 프로젝트 구조 및 빌드 파이프라인
- 기본 Shell 모드 동작

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

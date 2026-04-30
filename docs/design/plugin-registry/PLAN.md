# 플러그인 글로벌 레지스트리 (Export/Import + Update 전략)

## Context

현재 smalti 의 "Create n Play" 시스템은 플러그인을 **워크스페이스 로컬**(`<workspace>/.smalti/plugins/<name>/`)에만 저장합니다. 다른 워크스페이스에서 같은 플러그인을 재사용할 방법이 없어, 같은 자연어 요청으로 매번 새로 생성하거나 수동 복사해야 합니다.

사용자 요청: 플러그인 생성 시 글로벌 폴더에 zip 으로 보관해두고, 다른 워크스페이스에서 가져다 쓸 수 있게 하자. 단, **한곳에서 업데이트했을 때 다른 곳들과의 동기화**를 어떻게 처리할지가 모호하니 함께 설계할 것.

목표: 워크스페이스 격리(현재 sandbox 의 핵심 보안 모델) 를 깨지 않으면서 글로벌 레지스트리 + 명시적 업데이트 흐름을 도입한다.

---

## 핵심 설계 결정

### D1. "복사 + 출처 기록" 모델 (symlink 아님)
- 글로벌 zip 을 워크스페이스에 **풀어서 복사**한다. symlink 는 채택하지 않는다.
- 이유:
  - sandbox 의 `assertInWorkspace()`(src/main/plugin/sandbox.ts) 가 워크스페이스 경로 밖을 거부 — symlink 면 보안 가정이 깨짐
  - Rust 네이티브 watcher 는 워크스페이스 트리 내 변경만 감시 — symlink target 변경을 안전히 잡는다 보장 없음
  - 워크스페이스별 자유 수정(fork) 가능성을 보존해야 한다 (smalti 의 "내 플러그인 즉석 수정" 사용감)

### D2. 자동 push, 명시적 pull
- **생성**(`PLUGIN_GENERATE`) 직후 글로벌 레지스트리로 **자동 export** (사용자 마찰 0)
- 글로벌 → 워크스페이스 **import** 는 항상 **사용자 명시적 액션** (PluginPanel 의 "Add from registry" UI)
- 업데이트 적용도 마찬가지 — 자동 덮어쓰기 절대 X. "업데이트 가능" 배지만 띄우고 사용자가 누르면 적용.
- 이유: 자동 업데이트는 격리 사용감을 망가뜨리고, 워크스페이스에서 사용자가 만진 코드를 말없이 덮어쓸 위험 있음.

### D3. 출처 메타와 상태 분류 (sync-first 모델)
워크스페이스 플러그인의 `plugin.spec.json` 에 `source` 블록을 추가:
```json
{
  "source": {
    "registryId": "plugin-a1b2c3d4",
    "installedVersion": "0.2.0",
    "installedContentHash": "sha256:..."
  }
}
```

**핵심 원칙**: 글로벌에서 가져오는(import) 행위 자체가 "이 플러그인은 upstream 과 동기화한다" 는 묵시적 동의다. 같은 `registryId` 를 갖는 모든 워크스페이스 인스턴스는 결국 동일 upstream 으로 수렴한다 — divergent fork 라는 개념 자체가 존재하지 않는다.

상태 분류:
- **synced**: 워크스페이스 hash == installedContentHash, 글로벌 최신 == installedVersion
- **update-available**: 글로벌에 newer version 존재 → 클릭 한 번으로 덮어씀
- **locally-modified**: 워크스페이스 hash != installedContentHash (사용자가 그 자리에서 수정함). 다음 sync 또는 update 시 **로컬 변경이 사라진다는 경고** 표시. 사용자가 정말 그 변경을 보존하고 싶다면 → "Fork as new plugin" 액션으로 분리 (D6 참조).

### D4. 글로벌 레지스트리 레이아웃
경로: `getHome()/.smalti/registry/` (CLAUDE.md 의 `getHome()` 가이드 — `app.getPath('home')` 직접 사용 금지, `os.userInfo().homedir` fallback 필요)

```
~/.smalti/registry/
  index.json                              # 전체 인덱스 (id → latest, alias)
  plugins/
    plugin-a1b2c3d4/
      meta.json                           # name, description, latest, history[]
      versions/
        0.1.0/
          plugin.zip                      # spec/tool/src/html 압축
          contentHash.txt                 # sha256 of plugin.zip
        0.2.0/
          plugin.zip
          contentHash.txt
```

`index.json` 으로 빠른 목록 조회, 개별 `meta.json` 으로 버전 history. 동일 `id` 의 동일 `version` 재 push 시 contentHash 가 다르면 거부 (immutable versions).

### D5. SemVer 기반 자동 bump
- 워크스페이스에서 "Publish to registry" 누르면, 현재 `version` 과 글로벌 `latest` 비교:
  - 같으면 자동 patch bump (0.2.0 → 0.2.1)
  - 워크스페이스가 이미 더 높으면 그대로 사용
  - 충돌 시(같은 version, 다른 hash) 사용자에게 bump 단계 선택 UI

### D6. 워크스페이스 고유 변경 — "Fork as new plugin"
구조적 결정: 같은 `registryId` 아래에서는 분기를 허용하지 않는다. 워크스페이스가 자기만의 변경을 영구히 보존하고 싶다면, 그건 "같은 플러그인의 다른 버전" 이 아니라 **새로운 플러그인** 이다.

**Fork 액션 흐름**:
1. PluginPanel 에서 `locally-modified` 상태인 플러그인 → "Fork as new plugin" 메뉴
2. 다이얼로그: 새 이름 + 설명 입력 (기본값: 원본 이름 + "-fork")
3. 메인 프로세스 동작:
   - 워크스페이스의 `.smalti/plugins/<old-name>/` 트리를 `.smalti/plugins/<new-name>/` 으로 복사
   - 새 `pluginId` 발급 (`plugin-{새 uuid8}`)
   - 새 spec 의 `source` 블록은 신규 fork 메타로 교체:
     ```json
     "source": {
       "registryId": "plugin-<new-id>",
       "installedVersion": "0.1.0",
       "installedContentHash": "sha256:...",
       "forkedFrom": { "registryId": "plugin-a1b2c3d4", "version": "0.2.0" }
     }
     ```
   - `forkedFrom` 은 **추적용 메타데이터** 일 뿐, 동기화에 영향 주지 않음 (정보 표시용)
   - 신규 ID 이므로 자동 export 로직(D2)이 글로벌 레지스트리에 새 entry 로 push
4. 원본 위치 처리: 사용자에게 선택 — "원본은 upstream 동기화 상태로 복원" / "원본은 그대로 두고 fork 만 추가" 중 후자를 기본으로
   - 후자를 고르면 워크스페이스에 두 플러그인이 공존(원본 = locally-modified, fork = synced new). 다음 update 시 원본은 덮어쓸 후보, fork 는 영향 없음.

**Publish 흐름 (단일 publisher 가정 단순화)**:
- 같은 `registryId` 의 publish 는 사실상 항상 같은 workspace 또는 동일 사용자가 한다고 가정 (fork 모델로 인해 divergence 가 차단되므로).
- publish 직전 글로벌 `latest` 와 워크스페이스 `installedVersion` 비교 → 같으면 patch bump, 워크스페이스가 더 높으면 그대로 사용.
- 만약 글로벌이 더 높다면 (= 다른 곳에서 먼저 publish 했다 = 사용자가 멀티 머신 사용 등) → "Pull latest first" 강제. 이때 `locally-modified` 가 있으면 "이 변경은 사라집니다, 보존하려면 Fork 하세요" 안내.

**경합 가드** (멀티 인스턴스 안전성):
- `index.json` 과 version 디렉토리 생성은 atomic rename(`fs.rename` of temp file) 으로 직렬화
- publish 직전 한 번 더 글로벌 latest 재확인 후 위 규칙 적용

### D7. MCP 편집 가드 (`aide_edit_plugin` 진입점)
구조적 결정: UI 의 Update/Fork 다이얼로그는 사용자가 직접 클릭할 때만 트리거된다. 그러나 외부 에이전트(Claude Code 등)가 `mcp__aide__aide_edit_plugin` 으로 플러그인을 수정하면 이 가드를 우회해 silent locally-modified 를 만든다. MCP 경로에도 동일한 sync-first 원칙을 적용해야 한다.

**`aide_edit_plugin` 의 새 동작**:
1. 편집 대상 플러그인의 `source.registryId` 확인
   - **없으면** (로컬 생성, 글로벌 push 전): 그대로 편집 적용. 종료.
   - **있으면**: `registryGlobal.diff(id)` 호출 → 글로벌 최신 vs 워크스페이스 base 비교
2. `synced` 또는 글로벌과 동일: 그대로 편집 적용 → 결과적으로 `locally-modified` 로 전환. MCP 응답에 다음 메타 포함:
   ```json
   {
     "result": "ok",
     "warning": "Plugin is now locally-modified. Future syncs will offer to overwrite or fork-as-new-plugin to preserve changes."
   }
   ```
3. `update-available`: **편집 즉시 적용하지 않고** 메인 프로세스가 IPC 로 렌더러에 컨펌 다이얼로그 띄움 (신규 6번째 화면 — `MCPEditConflictDialog`):
   - **타이틀**: "Newer version available — choose how to edit"
   - **본문**: "{pluginName} has a newer version (X.Y.Z) in the registry. Editing now without updating means your changes will only survive as a new (forked) plugin."
   - **3개 옵션**:
     - **Update first, then edit** (권장 기본): 글로벌 최신 pull → MCP 호출자에게 "updated, please retry edit" 응답 (편집 자체는 적용 안 됨, 다음 호출에서 자연스럽게 처리)
     - **Fork & edit**: 자동으로 D6 의 Fork-as-new-plugin 실행 (auto-derived name) → 새 플러그인 트리에 MCP 편집 적용 → 응답에 새 `pluginId` 반환. 원본은 upstream 으로 자동 복원.
     - **Edit anyway**: 편집 즉시 적용. 결과는 `locally-modified` + `update-available` 동시 상태. 다음 sync 시 D3 의 경고 다이얼로그 트리거.
4. 다이얼로그는 timeout 없이 **무한 차단 유지**. 사용자가 셋 중 하나를 명시적으로 누르기 전까지 MCP 호출은 응답 받지 못함. MCP 호출자(Claude Code 등) 의 자체 timeout 으로 인해 끊기더라도 다음 호출이 들어오면 같은 다이얼로그가 (또는 사용자가 결정한 결과로) 처리됨. 자동 "Edit anyway" 같은 fallback 은 만들지 않는다 — silent locally-modified 를 만드는 모든 경로를 차단하는 것이 D7 의 목적.
5. 일관성: UI 의 Update/Fork 와 동일한 코드 경로(`registryGlobal.applyUpdate`, `registryGlobal.forkAsNew`) 호출. 새 헬퍼 추가 X.

**핵심 메시지 (다이얼로그/MCP 응답 모두에 명시)**:
- "Editing without updating preserves your changes only by forking into a new plugin (`pluginId` 가 새로 발급됨). 원본 entry 는 upstream 동기화 상태로 복원됩니다."
- 이 문장이 사용자가 의도와 다른 결과를 만들지 않도록 가드 역할.

**해당 흐름은 신규 6번째 화면 디자인 필요** — Phase 0 파일 목록에 `MCPEditConflictDialog.tsx` 추가, design.pen 에도 추가 mockup 필요.

**보너스**: `aide_create_plugin` 도 같은 이름의 글로벌 entry 가 이미 존재하면(이름 충돌) 사용자에게 컨펌 — overwrite vs new-with-suffix vs cancel.

### D8. MCP 네임스페이스 rebrand: `aide` → `smalti`
프로젝트가 `aide` 에서 `smalti` 로 리브랜드된 상태인데, MCP 서버 노출 이름과 도구 prefix 는 여전히 `aide` 다 (`mcp__aide__aide_edit_plugin` 등). 워크스페이스 디렉토리는 이미 `.smalti/` 로 마이그레이션됐으니, MCP 도 같은 변경을 적용해 일관성을 맞춘다.

**변경 대상**:
- MCP 서버 등록 이름: `aide` → `smalti` (Claude Code/외부 클라이언트 측 호출은 `mcp__smalti__*` 로 노출됨)
- 도구 prefix: `aide_create_plugin` → `smalti_create_plugin`, `aide_edit_plugin` → `smalti_edit_plugin`, `aide_delete_plugin` → `smalti_delete_plugin`, `aide_list_plugins` → `smalti_list_plugins`, `aide_invoke_tool` → `smalti_invoke_tool`
- 플러그인 MCP 도구도 동일 (`plugin_agent-todo-board_*` 등 prefix 는 그대로 유지 — 플러그인 이름 자체이므로 rebrand 와 무관)

**호환성 전략**:
- 일정 기간(2~3 마이너 버전) `aide_*` 이름도 alias 로 함께 노출. 호출 시 deprecation warning 로그.
- 외부 클라이언트의 MCP 설정에 `aide` 서버 이름이 박혀있을 수 있으므로 마이그레이션 가이드 문서화 필요.
- `~/.claude.json`, `~/.gemini/settings.json`, `~/.codex/config.toml` 의 mcpServers 키도 함께 업데이트하는 헬퍼 1회성 마이그레이션 스크립트 제공 (`writeMcpConfig` 와 동일 위치).

**별도 PR 권장**: 이 rebrand 는 본 플러그인 레지스트리 구현과 독립적이고 영향 범위가 큰(외부 사용자 노출 인터페이스 변경) 변경이므로 본 PR 또는 Phase 1 작업과 분리해 별도 PR 로 처리. 본 PLAN.md 의 D7 본문에 등장하는 `mcp__aide__*` 표기는 rebrand 적용 후 `mcp__smalti__*` 로 일괄 치환된다는 가정.

---

## Phase 0: UI 디자인 (pencil MCP)

프로젝트 규칙: 코드 작성 전에 design.pen 을 먼저 확인/생성한다.

1. `pencil get_editor_state` 로 현재 활성 .pen 파일 확인
2. 기존 design.pen 에 PluginPanel 디자인이 있는지 `batch_get` 으로 검색
3. 없으면 다음 화면들을 신규 디자인:
   - **PluginPanel 갱신본**: 각 플러그인 행에 상태 배지(synced/update-available/locally-modified) + 액션 메뉴(Update / Fork as new plugin / Publish / Remove)
   - **RegistryBrowser**: 모달 또는 사이드 패널. 글로벌 레지스트리 플러그인 목록(이름/설명/version/이미 설치 여부) + Import 버튼
   - **ForkAsNewPluginDialog**: 새 이름·설명 입력 + 원본 처리 라디오 ("그대로 유지" / "upstream 으로 복원")
   - **UpdateConfirmDialog**: locally-modified 동시 update 시 경고 ("로컬 변경이 사라집니다, 보존하려면 Fork")
   - **PublishConflictDialog**: 글로벌 latest > 워크스페이스 base 일 때 Pull-latest-first 안내
   - **MCPEditConflictDialog** (D7): MCP `aide_edit_plugin` 진입 시 newer version 존재할 때 3옵션(Update first / Fork & edit / Edit anyway) 가드
4. 디자인 컨펌 후 구현 단계로 진행

## 변경 대상 파일

### 신규 파일
- `src/main/plugin/registry-global.ts` — 글로벌 레지스트리 R/W (push/pull/list/diff). zip 처리는 여기로 캡슐화.
- `src/main/plugin/zip-utils.ts` — 플러그인 디렉토리 ↔ zip 변환, contentHash 계산. `archiver` + `unzipper` 또는 `adm-zip` 사용 (deps 추가 필요).
- `src/renderer/components/plugin/RegistryBrowser.tsx` — 글로벌 레지스트리 목록/import UI. PluginPanel 에서 진입.
- `src/renderer/components/plugin/PluginStatusBadge.tsx` — synced / update-available / locally-modified 배지 컴포넌트
- `src/renderer/components/plugin/dialogs/ForkAsNewPluginDialog.tsx` — Fork 액션 입력(이름/설명/원본 처리 옵션)
- `src/renderer/components/plugin/dialogs/UpdateConfirmDialog.tsx` — locally-modified 동시 update 시 경고
- `src/renderer/components/plugin/dialogs/PublishConflictDialog.tsx` — Pull-latest-first 가드 안내
- `src/renderer/components/plugin/dialogs/MCPEditConflictDialog.tsx` — MCP `aide_edit_plugin` 진입 시 newer version 존재할 때 3옵션 가드 (D7)

### 수정 파일
- `src/main/ipc/channels.ts` — 신규 채널 추가:
  `PLUGIN_REGISTRY_LIST`, `PLUGIN_REGISTRY_IMPORT`, `PLUGIN_REGISTRY_PUBLISH`, `PLUGIN_REGISTRY_DIFF`, `PLUGIN_REGISTRY_REMOVE`
- `src/main/ipc/plugin-handlers.ts:213-231` — `PLUGIN_GENERATE` 핸들러 끝에서 `registryGlobal.push()` 호출(자동 export). 신규 채널 핸들러도 여기.
- `src/main/plugin/spec-generator.ts:9-20` — `PluginSpec` 인터페이스에 optional `source` 블록 추가.
- `src/preload/` — `window.aide.plugin.registry.*` API 노출 (list/import/publish/diff/remove).
- `src/renderer/components/plugin/PluginPanel.tsx` — 각 플러그인 행에 상태 배지(synced/update-available/forked) + "Add from registry" 진입 버튼.
- `src/renderer/stores/plugin-store.ts` — 레지스트리 상태(목록, diff 결과) 캐시.
- `src/types/` — 공유 타입(`RegistryPluginSummary`, `RegistryDiff`, `PluginSyncStatus`) 추가.
- `package.json` — `archiver` (또는 `adm-zip`) 의존성 추가. native 모듈 아님이므로 Vite 외부화 불필요(CLAUDE.md 의 packaging 주의사항 참고).
- `src/main/index.ts` — 앱 시작 시 `~/.smalti/registry/` 디렉토리 ensure. **반드시 `getHome()` 헬퍼 사용 + try/catch 로 감쌀 것** (CLAUDE.md "Finder sets HOME=/" 주의사항).

### 재사용할 기존 코드
- `src/main/plugin/registry.ts` 의 `register()/rescanPluginsDir()` — import 후 워크스페이스 등록은 그대로 호출.
- `src/main/migrate-aide-workspace.ts` 패턴 — 글로벌 레지스트리 schema 가 바뀔 때 마이그레이션 함수 같은 위치에 추가.
- 기존 file watcher — import 후 워크스페이스 디렉토리에 파일이 떨어지면 자동 감지하여 `PLUGIN_CHANGED` 브로드캐스트하므로 별도 invalidate 호출 불필요.

---

## 흐름 요약

### 생성 시 (자동 export)
1. `PLUGIN_GENERATE` → 기존대로 워크스페이스에 spec/code 작성
2. **신규**: `registryGlobal.push(workspacePluginPath)` → zip + contentHash 작성 → `index.json` 업데이트
3. 워크스페이스 spec 의 `source` 블록 채움 (`installedVersion`, `installedContentHash` = 방금 push 한 값)

### Import 시
1. PluginPanel → "Add from registry" → RegistryBrowser 가 `PLUGIN_REGISTRY_LIST` 호출
2. 사용자가 선택 → `PLUGIN_REGISTRY_IMPORT(id, version?)` (version 미지정 시 latest)
3. 메인이 zip 풀어 워크스페이스 `.smalti/plugins/<name>/` 에 복사 (이름 충돌 시 사용자에게 rename 요청)
4. `source` 블록 기록 → file watcher 가 자동 register → UI 갱신

### 업데이트 감지 & 적용
1. PluginPanel 마운트 시 워크스페이스 플러그인 각각에 대해 `PLUGIN_REGISTRY_DIFF(id)` 호출
2. 각 플러그인에 상태 배지 표시 (synced / update-available / locally-modified)
3. `update-available` 클릭 → 새 zip 으로 디렉토리 교체 + `installedVersion/Hash` 갱신
4. `locally-modified` 가 동시에 있으면 적용 전 "로컬 변경이 사라집니다, 보존하려면 Fork 하세요" 경고 다이얼로그

### Fork as new plugin (D6)
1. PluginPanel → locally-modified 플러그인의 "Fork as new plugin" 액션
2. 새 이름/설명 입력 → 새 `pluginId` 발급, 트리 복사, `forkedFrom` 메타 기록
3. 자동 export 로직(D2)이 글로벌에 신규 entry 로 push
4. 원본 처리 옵션: "그대로 유지" (기본) / "upstream 으로 복원"

### Publish (워크스페이스 → 글로벌)
1. locally-modified 상태에서 사용자가 "Publish" → 자동 patch bump 제안
2. 컨펌 시 새 version 디렉토리 생성, zip 작성, `meta.json` history 추가
3. 워크스페이스 `installedVersion/Hash` 도 새 값으로 동기화 → synced 로 전환
4. 글로벌 latest 가 워크스페이스 base 보다 높으면 publish 차단, "Pull latest first" 안내 (멀티 머신 케이스)

---

## Verification

End-to-end 시나리오 (수동 + 자동):

1. **자동 export**: 워크스페이스 A 에서 `Create n Play` 로 플러그인 생성 → `~/.smalti/registry/plugins/<id>/versions/0.1.0/plugin.zip` 존재 확인 + `index.json` 에 entry 확인
2. **import**: 다른 워크스페이스 B 열고 RegistryBrowser 에서 import → `<workspace-B>/.smalti/plugins/<name>/` 에 동일 파일 트리 + spec 의 `source` 블록 채워짐 + 등록되어 invokeTool 동작
3. **synced 배지**: B 에서 import 직후 PluginPanel 에 synced 배지
4. **update flow**: A 에서 src/index.js 수정 후 "Publish" → 0.1.1 push. B 의 PluginPanel 새로고침 → "update-available" 배지 → 클릭 → B 의 디스크가 0.1.1 로 교체
5. **locally-modified 경고**: B 에서 import 후 src/index.js 수정 → locally-modified 배지. update-available 동시에 뜨면 적용 시 "로컬 변경이 사라집니다" 경고 다이얼로그
6. **Fork as new plugin**: locally-modified 상태에서 "Fork as new plugin" → 새 pluginId 발급, `.smalti/plugins/<new-name>/` 생성, 새 spec 의 `forkedFrom` 메타 채워짐, 글로벌 레지스트리에 신규 entry 로 push, 원본은 그대로 유지(기본 옵션) 후 다음 update 시 영향 없는지 검증
7. **immutable 거부**: 같은 version 으로 hash 다른 zip 을 push 시도 → 에러
8. **Pull-latest-first 가드**: 글로벌 latest 가 워크스페이스 base 보다 높을 때 publish 시도 → 차단되고 안내 표시
9. **HOME=/ 안전성**: 패키징된 앱을 Finder 로 실행 후에도 `~/.smalti/registry/` 가 진짜 user home 에 생성되는지 (CLAUDE.md 알려진 함정)
10. **단위 테스트**: `zip-utils` (round-trip + hash 안정성), `registry-global` (push/pull/diff)
11. `pnpm test`, `pnpm lint`, `pnpm test:e2e` 통과

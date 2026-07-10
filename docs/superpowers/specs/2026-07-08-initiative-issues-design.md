# 중점수행과제별 쟁점 관리 설계서

- 날짜: 2026-07-08
- 상태: 승인

## 개요

기존 프로젝트 단위 "고려사항" 탭을 폐지하고, 각 중점수행과제(Initiative) 안에서 "쟁점"을 관리하는 기능으로 대체한다.

- 쟁점은 과제별로 텍스트, 중요도(상/중/하), 대응안, 해결 상태를 가진다.
- 쟁점 목록은 사용자가 드래그로 순서를 자유롭게 바꿀 수 있다(중요도에 따른 자동 정렬 없음).
- 기존에 저장된 고려사항 데이터는 마이그레이션하지 않고 폐기한다.

## 데이터 모델

```
Initiative (중점수행과제)
├─ id, name, description, owner
├─ items: (Task | Milestone)[]
└─ issues: Issue[]                 ← 신규 필드

Issue (쟁점)
├─ id: string
├─ content: string                 한 줄 텍스트 (필수)
├─ importance: "상" | "중" | "하"   기본값 "중"
├─ response: string                대응안 (선택)
├─ status: "열림" | "대응중" | "해결"
├─ createdDate: ISO 날짜           생성 시 자동 기록
├─ resolvedDate: ISO 날짜 | null   status가 "해결"로 바뀔 때 자동 기록, 되돌리면 null
└─ 배열 내 위치가 표시 순서 (드래그앤드롭으로 변경, id 기준 splice)
```

**제거되는 것**
- `Project.considerations` 필드
- `Consideration` 타입, `ConsiderationLog.jsx` 컴포넌트
- `calc.js`의 `countOpenConsiderations`
- 프로젝트 상세의 "고려사항" 탭

**기존 데이터 처리**: `data/projects.json` 및 Neon `store.payload`에 남아있는 기존 `considerations` 배열은 별도 마이그레이션 스크립트 없이 방치한다. 프론트엔드가 더 이상 이 필드를 읽거나 쓰지 않으므로, 다음 저장(PUT) 시점에 응답 payload에서 자연스럽게 사라진다.

## UI

### 중점수행과제 카드 (Initiatives.jsx)
- 카드를 펼치면 기존 간트차트(Gantt) 아래에 새 "쟁점" 섹션을 추가한다.
- 카드 헤더 요약에 쟁점 건수를 추가: `진척 X% · 태스크 N건 · 쟁점 M건(미해결 K)` (미해결 0건이면 괄호 생략)

### 쟁점 섹션 (신규 컴포넌트 `IssueLog.jsx`)
기존 `ConsiderationLog.jsx`와 동일한 상호작용 패턴을 따르되 아래와 같이 변경한다.

- **열림/대응중 쟁점**: 항상 표시. 각 카드에 드래그 핸들(⠿)을 두어 `Initiatives.jsx`의 과제 재정렬과 동일한 HTML5 drag-and-drop 방식으로 순서 변경.
- **해결 쟁점**: "✓ 해결됨 N건 보기/접기" 토글 아래 접어서 보관 (초기 상태는 접힘).
- **쟁점 카드 구성**: 중요도 배지(상=빨강/중=주황/하=초록), 쟁점 내용, 대응안(있을 때만 표시), 상태 select(열림/대응중/해결), 편집(✏)·삭제(🗑️) 아이콘 버튼.
- **추가/편집 모달**: 내용(input, 필수), 중요도(select, 기본 "중"), 대응안(textarea, 선택). 상태는 모달에서 설정하지 않고 목록에서 select로만 변경(신규 생성 시 "열림" 고정) — 기존 고려사항 폼과 동일한 방식.
- **순서 변경 로직**: 열림/대응중 쟁점만 드래그 대상이 되며, 재정렬 시 `[...active(재정렬됨), ...resolved(원래 순서 유지)]`로 전체 배열을 재구성한다. 해결된 쟁점은 항상 배열 뒤쪽에 위치하되 화면에는 접혀서 별도 표시되므로 순서 자체는 의미가 없다.

### 프로젝트 상세 탭
`TABS = ['중점수행과제', '운영업무']` — "고려사항" 탭 제거.

### 홈 화면 카드 & PNG 스냅샷
- 기존 "고려사항" chip을 "쟁점" chip으로 교체.
- 표시 대상: 해당 프로젝트의 모든 과제(`initiatives[].issues`)를 합쳐 상태가 "해결"이 아닌 쟁점만 모아 표시.
- 배지 색상: 상=빨강, 중=주황, 하=초록 (기존 높음/중간/낮음 dot 색상 매핑을 상/중/하로 치환).

## 계산 로직 (calc.js)

- `countOpenConsiderations(project)` 제거.
- 신규: `countOpenIssues(project)` — `project.initiatives`의 모든 `issues`를 평탄화하여 `status !== '해결'` 개수를 합산.
- 신규: `initiativeOpenIssueCount(initiative)` — 과제 카드 헤더에 쓰이는 단일 과제 기준 미해결 쟁점 수.

## 테스트

- `tests/calc.test.js`: `countOpenConsiderations` 관련 테스트 제거, `countOpenIssues`/`initiativeOpenIssueCount` 테스트 추가.
- `tests/components/considerations.test.jsx` → `tests/components/issues.test.jsx`로 대체: 추가/편집/삭제/상태 변경/드래그 순서변경(active만 대상) 동작 검증.
- `tests/pages/project.test.jsx`, `tests/pages/home.test.jsx`, `tests/app.test.jsx`: "고려사항" 탭/데이터 관련 케이스를 "쟁점" 기준으로 갱신.

## 범위 제외 (YAGNI)

- 쟁점에 대한 담당자 지정, 마감일 등 추가 필드 없음 — 요청된 필드(내용/중요도/순서/대응/해결여부)만 구현.
- 프로젝트 단위로 쟁점을 한눈에 모아보는 별도 화면 없음 (홈 카드 chip 요약으로 충분).
- 기존 고려사항 데이터 자동 이관 스크립트 없음.

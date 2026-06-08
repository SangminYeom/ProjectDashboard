# 프로젝트 대시보드 설계서

- 날짜: 2026-06-07
- 상태: 승인 대기

## 개요

여러 프로젝트의 KPI, 중점수행과제(태스크별 진척률·일정), 운영업무, 고려사항/대응안을 관리하는 **개인용 로컬 웹 대시보드**.

- 사용자: 1인 (개인 관리용)
- 실행: `npm start` → 브라우저에서 `http://localhost:3000`
- 저장: `data/projects.json` 단일 파일 (OneDrive 폴더에 위치하여 자동 백업·동기화)

## 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프론트엔드 | React + Vite | 간트·탭·폼 등 복잡한 UI의 유지보수성 |
| 백엔드 | Express (server.js) | 정적 파일 서빙 + JSON 파일 읽기/쓰기 API |
| 테스트 | Vitest | 핵심 로직 단위 테스트 |
| 데이터 | JSON 파일 | 단일 사용자, DB 불필요, OneDrive 동기화 활용 |

## 데이터 모델

`data/projects.json` 하나에 전체 데이터 저장.

```
Project
├─ id: string
├─ name: string
├─ description: string
├─ startDate, endDate: ISO 날짜
├─ kpis: KPI[]
├─ initiatives: Initiative[]
├─ operations: Operation[]
└─ considerations: Consideration[]

KPI (혼합형 — type으로 구분)
├─ id, name
├─ type: "numeric" | "qualitative"
├─ (numeric) target: number, current: number, unit: string
│   → 달성률 = current / target × 100 (자동 계산)
└─ (qualitative) status: "달성" | "순항" | "주의" | "미달"

Initiative (중점수행과제)
├─ id, name, description, owner
├─ tasks: Task[]
└─ 진척률: 소속 태스크 progress의 평균 (자동 계산, 저장하지 않음. 태스크 0건이면 0%)

Task
├─ id, name
├─ startDate, endDate: ISO 날짜
├─ progress: 0~100
├─ status: "예정" | "진행중" | "완료" | "보류"
└─ 지연 판정: endDate < 오늘 && progress < 100 (자동 계산)

Operation (운영업무)
├─ id, name
├─ cycle: "일" | "주" | "월" | "분기"
├─ owner: string
├─ status: "정상" | "주의" | "이슈"
├─ lastPerformed: ISO 날짜
└─ memo: string

Consideration (고려사항 — 이슈 로그 방식)
├─ id, title, content
├─ response: string (대응안)
├─ severity: "높음" | "중간" | "낮음"
├─ status: "열림" | "대응중" | "해결"
├─ createdDate, resolvedDate: ISO 날짜
└─ 해결된 건도 삭제하지 않고 이력으로 보관 (UI에서 접어서 표시)
```

## 화면 구성 (레이아웃 A: 카드 홈 + 탭형 상세)

### 홈 화면
- 상단 전체 요약 한 줄: 프로젝트 N개 · 지연 태스크 N건 · 미해결 고려사항 N건
- 프로젝트 카드 그리드. 카드 내용: 프로젝트명, 기간, KPI 평균 달성률(수치형 KPI만 평균, 정성형 제외), 과제 건수, 지연 태스크 수, 미해결 고려사항 수 배지
- 진척률은 중점수행과제 단위까지만 관리 — 프로젝트 단위 진척률(과제 평균)은 표시하지 않음
- `+ 새 프로젝트` 카드

### 프로젝트 상세
- 상단 고정 **KPI 바**: 수치형은 달성률 게이지(현재값/목표값), 정성형은 상태 뱃지. 현재값·상태는 클릭하여 인라인 수정
- 탭 3개:
  1. **중점수행과제** — 과제별 카드(접기/펼치기). 카드 안에 태스크 간트차트: 시작~종료 막대, 진척률 표시, 오늘 기준선, 지연 태스크 주황색 경고. 진척률은 행에서 인라인 수정. 간트는 라이브러리 없이 CSS로 직접 렌더링
  2. **운영업무** — 테이블 (업무명/주기/담당/상태/최근수행일/메모)
  3. **고려사항** — 중요도 색상의 이슈 카드 목록. 열림/대응중 항상 표시, 해결 건은 접어서 보관

### 편집 방식
- 추가/수정: 모달 폼
- 자주 바뀌는 값(진척률, KPI 현재값, 상태): 목록에서 인라인 수정
- 저장 버튼 없음 — 변경 시 0.5초 디바운스 후 자동 저장

## 아키텍처

```
브라우저 (React SPA)
   GET /api/projects   ← 앱 시작 시 전체 로드
   PUT /api/projects   ← 변경 시 전체 저장 (디바운스 0.5초)
server.js (Express, 포트 3000)
   정적 파일(dist/) + JSON API
data/projects.json
```

- 단일 사용자이므로 API는 읽기/쓰기 2개로 단순화. 세분화된 CRUD 없음
- 프론트가 전체 데이터를 메모리에 보유, 수정 후 전체 PUT

## 에러 처리 / 데이터 안전

- **원자적 저장**: 임시 파일 작성 후 rename
- **자동 백업**: 저장 시 `data/backups/YYYY-MM-DD.json` 일자별 1개, 최근 7일치 유지
- 저장 실패: 화면 상단 경고 배너, 메모리 데이터 유지로 재시도 가능
- JSON 손상: 서버가 마지막 백업으로 복구 제안

## 테스트

- 단위 테스트 (Vitest): 과제 진척률 평균 계산, 지연 판정, KPI 달성률 계산, 원자적 저장·백업 로테이션
- 컴포넌트 테스트: 주요 화면 렌더링, 인라인 수정 동작
- E2E 없음 (개인 도구 범위에 과함)

## 프로젝트 구조

```
ProjectDashboard/
├─ server.js               Express: 정적 서빙 + API + 저장/백업 로직
├─ data/
│  ├─ projects.json
│  └─ backups/
├─ src/
│  ├─ pages/Home.jsx
│  ├─ pages/Project.jsx
│  ├─ components/KpiBar.jsx
│  ├─ components/Gantt.jsx
│  ├─ components/OperationsTable.jsx
│  ├─ components/ConsiderationLog.jsx
│  ├─ components/Modal.jsx
│  └─ lib/calc.js          진척률·지연·달성률 계산 (순수 함수)
├─ docs/superpowers/specs/
└─ package.json
```

## 범위 제외 (YAGNI)

- 다중 사용자 / 인증 / 권한
- 알림 (이메일·푸시)
- 엑셀 가져오기/내보내기
- 차트 라이브러리 (간트는 CSS 직접 구현)
- 모바일 최적화 (데스크탑 브라우저 기준)

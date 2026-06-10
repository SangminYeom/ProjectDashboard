# 홈 카드 리디자인 설계서

- 날짜: 2026-06-10
- 상태: 승인

## 목표

현재 홈 화면 프로젝트 카드의 문제를 해결한다.
- 섹션 구분이 불명확하고 색상이 과다해 "촌스럽고 올드하다"는 피드백
- 중점수행과제가 시각적으로 강조되지 않음
- KPI 수치 포맷이 불충분 (`현재값` 만 표시)
- 상태 표시에 이모지(🟢🟡🔴) 사용

## 디자인 방향: Apple-style Minimal

Apple.com · SF Pro 디자인 언어를 참조. 핵심 원칙:

1. **색은 하나** — 액센트 `#0071e3`(Apple Blue)를 KPI 진척률에만 사용
2. **섹션 박스 없음** — 배경색/테두리 박스 대신 여백과 소문자 레이블로 구분
3. **여백이 곧 디자인** — 섹션 간 24px, 카드 패딩 28px 26px
4. **이모지 제거** — 상태 표시는 CSS 5px 원형 dot으로 대체
5. **진척 바 2px** — 얇고 절제된 선

## 디자인 토큰

### 색상

| 역할 | 값 |
|---|---|
| 페이지 배경 | `#f5f5f7` |
| 카드 배경 | `#ffffff` |
| 주요 텍스트 | `#1d1d1f` |
| 보조 텍스트 | `#6e6e73` |
| 3차 텍스트 / 레이블 | `#86868b` |
| 액센트 (KPI 진척률만) | `#0071e3` |
| 진척 바 채움 | `#1d1d1f` |
| 진척 바 트랙 | `#e8e8ed` |
| 상태 dot — 정상 | `#30d158` (Apple green) |
| 상태 dot — 주의 | `#ff9f0a` (Apple amber) |
| 상태 dot — 이슈/고려 | `#ff3b30` (Apple red) |
| 카드 구분선 | `#f0f0f2` |

### 타이포그래피

| 요소 | 크기 | 굵기 | 간격 |
|---|---|---|---|
| 페이지 제목 | 32px | 700 | letter -0.8px |
| 카드 제목 | 17px | 600 | letter -0.4px |
| 기간 | 12px | 400 | — |
| 섹션 레이블 | 9.5px | 600 | letter 1.6px, uppercase |
| 과제명 / KPI명 | 13px | 400 | — |
| KPI 진척 % | 13px | 600 | — |
| 상태 dot 텍스트 | 11px | 400 | — |

### 카드 그림자

```
box-shadow: 0 2px 8px rgba(0,0,0,.04), 0 0 1px rgba(0,0,0,.06);
```

호버: `transform: translateY(-2px)` + 그림자 강화

## 카드 구조

```
┌─────────────────────────────────┐  ← border-radius 18px, padding 28px 26px
│  프로젝트 이름                    │  ← 17px bold, #1d1d1f
│  2026년 1월 – 12월               │  ← 12px, #86868b
│                                 │
│  중점수행과제 ←───── 섹션 레이블   │  ← 9.5px uppercase, #86868b, mb 12px
│  과제명 ──────────────────  80%  │  ← name + 2px bar + % (3열 flex)
│  과제명 ────────────────────  45% │
│  과제명 ──────────────────  20%  │
│                                 │  ← 섹션 간격 24px
│  KPI ←──────────── 섹션 레이블   │
│  KPI명          7억/10억  진척70% │  ← name(좌) / 수치+진척%(우, #0071e3)
│  KPI명    3,200/5,000명  진척64%  │
│  KPI명                    달성   │  ← 정성형: 텍스트만
│                                 │
│ ─────────────────────────────── │  ← 1px #f0f0f2 구분선
│  • 운영 정상 5  • 주의 1  • 고려 2│  ← 5px dot + 11px 텍스트
└─────────────────────────────────┘
```

### 과제명 처리
- 잘림(truncate) 없음 — 전체 표시
- flex-shrink: 0, white-space: nowrap

### KPI 포맷
- 수치형: `현재값 / 목표값` (보조색) + `진척 XX%` (Apple Blue, 굵게)
- 수치형에는 진척 바 제거 (텍스트 수치로 충분)
- 정성형: status 텍스트만 (`#6e6e73`, 보조색)

### 상태 dot (푸터)
- 5px × 5px 원형, CSS 구현
- 운영 정상: `#30d158`, 주의: `#ff9f0a`, 이슈: `#ff3b30`
- 고려사항 미해결: `#ff3b30`

## 변경 범위

### `src/pages/Home.jsx`
- `card-section` / `card-section-badge` 구조 제거
- 카드 내부를 새 구조로 교체:
  - `card-head` (이름 + 기간)
  - `sec` 레이블 + `ini-list` (중점수행과제)
  - `sec` 레이블 + `kpi-list` (KPI)
  - `card-footer` (dot 상태)
- KPI 표시: `{k.current} / {k.target}{k.unit} · 진척 {kpiRate(k)}%`
- 이모지 제거 (`QUAL_ICON`, `OP_ICON` 상수 제거 또는 미사용)

### `src/styles.css`
- 홈/카드 관련 기존 스타일 교체:
  - `.home`, `.home-header`, `.home-title`, `.home-stats` 신규
  - `.card-grid`, `.project-card` 수정
  - `.card-head`, `.sec`, `.ini-list`, `.ini-row`, `.ini-track`, `.ini-fill`
  - `.kpi-list`, `.kpi-row`, `.kpi-name`, `.kpi-nums`, `.kpi-prog`
  - `.card-footer`, `.stat`, `.dot`, `.dot-green`, `.dot-amber`, `.dot-red`
  - 기존 `.card-section*`, `.kpi-summary*`, `.ini-summary*` 제거
- 전역: `body` background → `#f5f5f7`

### 변경하지 않는 것
- Project 상세 페이지 (Gantt, Initiatives, KpiBar 등)
- 데이터 모델 / API
- 라우팅 구조

## 테스트 고려사항

`tests/pages/home.test.jsx` 의 기존 실패 테스트를 함께 수정한다.
현재 실패 원인: 텍스트가 여러 엘리먼트로 분리되어 `getByText` 매처 불일치.
수정 방향: 구조 변경에 맞춰 셀렉터 업데이트.

# 마일스톤 기능 설계서

- 날짜: 2026-06-10
- 상태: 승인

## 개요

중점수행과제(initiative)에 단일 날짜 마일스톤(완료일, 배포일 등)을 추가할 수 있는 기능.
태스크가 기간(startDate~endDate) 바 형태인 반면, 마일스톤은 하루 단위 ◆ 다이아몬드 마커로 표시하여 눈에 확 띄도록 강조한다.

## 데이터 모델

initiative 객체에 `milestones: []` 배열 추가. `tasks[]`와 구조가 달라 별도 배열로 관리한다.

```js
// initiative
{
  id, name, description, owner,
  tasks: [...],
  milestones: [
    { id: string, name: string, date: string }  // date: "YYYY-MM-DD"
  ]
}
```

마일스톤에는 진척률·상태가 없다. name과 date만 가진다.

## Gantt 렌더링

- `Gantt` 컴포넌트에 `milestones` prop 추가
- 태스크 행 렌더링 후 마일스톤 행을 이어서 표시 (같은 컨테이너)
- 진척률 칸: `—` 표시
- 상태 칸: `◆ 마일스톤` 앰버 뱃지
- 타임라인 트랙: date 위치에 앰버 ◆ 다이아몬드 마커 (rotate 45deg, box-shadow 강조)
- 마일스톤 date는 Gantt min/max 범위 계산에 포함
- 드래그 재정렬은 milestones 내에서만 (tasks와 섞이지 않음)

## UI 변경 포인트

| 위치 | 변경 내용 |
|------|-----------|
| `Initiatives.jsx` | `milestoneFormFor` state 추가, `MilestoneForm` 모달 (name + date), `+ 마일스톤 추가` 버튼 |
| `Gantt.jsx` | `milestones` prop 수신, 마일스톤 행 렌더링, ◆ 마커 스타일, `MilestoneEditForm` |
| initiative 헤더 메타 | `태스크 N건 · 마일스톤 M건` (마일스톤 0건이면 생략) |
| `ProjectSnapshot` | 마일스톤 항목 표시 (◆ 아이콘 + 이름 + 날짜) |
| `server\storage.js` | 기존 프로젝트 migrate: `milestones` 필드 없으면 `[]` 기본값 처리 |

## 스타일

- 마커 색상: 앰버 (`#f59e0b`, 테두리 `#d97706`)
- 마커 크기: 14×14px, `rotate(45deg)`
- box-shadow: `0 0 0 4px rgba(245,158,11,.25)` — 후광 효과로 강조
- 마일스톤 행 배경: `#fffbeb` (태스크 행과 구분)
- 이름 텍스트: `font-weight: 600`, 색상 `#92400e`

## 테스트 범위

- 마일스톤 추가 후 Gantt에 행이 나타나는지
- date가 Gantt 범위에 포함되는지 (min/max 계산)
- milestones 없는 기존 프로젝트 로드 시 에러 없는지

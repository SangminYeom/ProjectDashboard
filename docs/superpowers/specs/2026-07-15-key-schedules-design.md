# 주요 일정 기능 설계서

- 날짜: 2026-07-15
- 상태: 승인

## 개요

기존 '프로젝트' 관리와는 별개로, 회사/팀 전체의 주요 일정(워크샵, 임원 보고, 감사 등)을 관리하는 최상위 기능을 추가한다. 특정 프로젝트에 종속되지 않는 완전히 독립적인 목록이며, 날짜가 정해진 단일 이벤트뿐 아니라 날짜 미정 이벤트도 등록할 수 있다.

주의: 기존에 `docs/superpowers/specs/2026-06-10-milestone-design.md`에 정의된 '마일스톤'은 이니셔티브 하위의 간트차트 마커 기능으로, 이번 '주요 일정'과는 다른 개념이다. 혼동을 피하기 위해 코드/테이블 명명 시 '마일스톤'이라는 단어를 사용하지 않는다.

## 데이터 모델

기존 `store` 테이블 한 행에 저장되는 JSON payload에 `schedules` 키를 추가한다.

```js
// store.payload
{
  projects: [...],
  schedules: [
    {
      id: string,
      title: string,
      date: string | null,   // "YYYY-MM-DD", 날짜 미정이면 null
      memo: string,
      createdAt: string,     // ISO timestamp
      updatedAt: string,     // ISO timestamp
    }
  ]
}
```

- `date`가 `null`이면 "날짜 미정" 항목으로 취급한다.
- 진척률/상태/담당자 같은 필드는 없다. 제목·날짜·메모만 가진다.

## API

`api/projects.js`와 동일한 패턴으로 `api/schedules.js`를 신규 작성한다.

- 인증: 기존과 동일하게 `requireAuth(req, res)` 체크 (`api/_auth.js`)
- `GET`: `{ schedules: [...] }` 반환
- `PUT`: body에 `schedules` 배열이 있는지 검증(`Array.isArray`) 후, store payload 중 `schedules` 키만 갱신하고 204 반환. 다른 키(`projects`)는 건드리지 않는다.
- 잘못된 payload(배열 아님 등)는 400과 한글 에러 메시지(`'schedules 배열이 필요합니다'`) 반환

### DB 헬퍼 확장

`server/db.js`의 `readStore`/`writeStore`는 현재 payload 전체를 한 번에 읽고 쓰는 구조다. `schedules` 갱신 시 `projects` 데이터를 덮어쓰지 않도록, `writeStore`가 특정 키만 병합해서 저장할 수 있도록 소폭 확장한다(예: 현재 payload를 읽어와서 변경된 키만 merge 후 저장).

## 프론트엔드 UI/UX

- **사이드바**: 기존 '프로젝트' 메뉴와 나란히 '주요 일정' 메뉴 항목 추가 (`Sidebar.jsx`)
- **신규 페이지** `src/pages/Schedules.jsx`:
  - 상단에 "날짜 미정" 그룹을 먼저 표시, 그 아래 날짜가 가까운 순으로 정렬된 항목을 나열
  - 이미 지난 날짜의 일정은 흐리게(회색 톤) 표시하되 목록에서 제외하지 않음 (자동 보관/삭제 없음)
  - 각 항목: 제목, 날짜(또는 "미정" 배지), 메모 미리보기
- **작성/수정 폼** `src/components/ScheduleForm.jsx`: `ProjectForm.jsx`와 동일한 모달 스타일
  - 필드: 제목(필수), 날짜(입력 필드 + "날짜 미정" 체크박스로 date를 null 처리), 메모(자유 텍스트)
  - 모달 내 삭제 버튼 포함 (수정 모드일 때)
- **상태 관리**: `App.jsx`에 `schedules` state 추가. 기존 `updateProjects`/디바운스 저장 패턴과 동일하게 `updateSchedules` 함수를 추가하고, `loadProjects`와 유사한 방식으로 초기 로드 시 `schedules`도 함께 불러온다.

## 편집 플로우

- **생성**: 목록 상단 "+ 일정 추가" 버튼 → `ScheduleForm` 모달 → 저장 시 클라이언트에서 `schedules` 배열에 추가 후 디바운스 PUT
- **수정**: 목록 항목 클릭 시 같은 모달을 기존 값으로 채워서 오픈
- **삭제**: 모달 내 삭제 버튼으로 배열에서 제거 후 디바운스 PUT

## 에러 처리

- PUT 실패 시 기존 프로젝트 저장 실패 처리와 동일한 방식(있다면 재사용)으로 사용자에게 저장 실패를 알린다. 별도의 새로운 에러 UX는 만들지 않는다.

## 테스트 범위

- `tests/api-functions/schedules.test.js` 신규 작성 (`projects.test.js` 패턴 미러링)
  - 미인증 요청 401
  - GET 정상 동작 (빈 배열 포함)
  - PUT 정상 저장, `projects` 키가 보존되는지 확인
  - `schedules`가 배열이 아닌 잘못된 payload 400
- 프론트엔드: 날짜 미정 항목이 별도 그룹으로 분리되는지, 날짜순 정렬이 올바른지 확인하는 간단한 컴포넌트 테스트 (기존 테스트 스타일에 맞춰 최소 범위로)

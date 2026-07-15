# 주요 일정(Key Schedules) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트와 독립적인 '주요 일정' 목록(제목/날짜 또는 미정/메모)을 사이드바에서 접근 가능한 새 페이지로 추가한다.

**Architecture:** 기존 `store.payload` JSON에 `schedules` 키를 추가하고, `api/projects.js`와 동일한 GET/PUT-전체배열 패턴으로 `api/schedules.js`를 신설한다. 프론트엔드는 `App.jsx`가 `schedules` state를 별도로 들고, 새 `Schedules` 페이지 컴포넌트(+ `ScheduleForm` 모달)가 `ProjectIssues.jsx`의 리스트+모달 패턴을 따른다.

**Tech Stack:** React 18(JSX, 훅), Vitest + @testing-library/react, Vercel Serverless Functions, Neon(`@neondatabase/serverless`).

## Global Constraints

- TypeScript 미사용 — 모든 신규 파일은 `.js`/`.jsx`.
- UI 문자열은 한글, 기존 컴포넌트의 톤(간결한 라벨)을 따른다.
- 신규 npm 의존성 추가 금지 — 기존 패키지만 사용.
- 데이터 모델은 `docs/superpowers/specs/2026-07-15-key-schedules-design.md`를 따른다: `{ id, title, date: string|null, memo, createdAt, updatedAt }`.
- 기존 `마일스톤`(이니셔티브 하위 간트 마커, `docs/superpowers/specs/2026-06-10-milestone-design.md`)과 명명/데이터가 섞이지 않도록 한다.

---

### Task 1: `writeStore`가 payload를 병합 저장하도록 수정

**Files:**
- Modify: `server/db.js:12-21`
- Test: `tests/db.test.js:31-39`

**Interfaces:**
- Produces: `writeStore(partialPayload: object): Promise<void>` — 이제 전체 덮어쓰기가 아니라 기존 payload와 `partialPayload`를 얕게 병합(shallow merge)해서 저장한다. `readStore()`의 시그니처/동작은 변경 없음.

현재 `writeStore`는 넘어온 객체로 payload 전체를 덮어쓴다. `api/projects.js`가 `writeStore({ projects })`만 호출해도 문제없었던 이유는 지금까지 payload에 `projects` 키 하나뿐이었기 때문이다. `schedules` 키를 추가하면, 프로젝트만 수정해도 `schedules`가 통째로 사라지는 버그가 생긴다. 이를 막기 위해 `writeStore`가 저장 전 현재 payload를 읽어와 병합하도록 고친다.

- [ ] **Step 1: 병합 동작을 검증하는 실패하는 테스트 작성**

`tests/db.test.js`의 `describe('writeStore', ...)` 블록 전체를 아래 내용으로 교체:

```js
describe('writeStore', () => {
  it('neon upsert 쿼리를 호출한다 (기존 payload 조회 1회 + 저장 1회)', async () => {
    const sqlFn = vi.fn()
      .mockResolvedValueOnce([]) // SELECT: 기존 행 없음
      .mockResolvedValueOnce([]) // INSERT ... ON CONFLICT
    neon.mockReturnValue(sqlFn)
    await writeStore({ projects: [{ id: 'p1' }] })
    expect(neon).toHaveBeenCalledWith(process.env.DATABASE_URL)
    expect(sqlFn).toHaveBeenCalledTimes(2)
  })

  it('기존 payload의 다른 키를 보존하며 병합한다', async () => {
    const sqlFn = vi.fn()
      .mockResolvedValueOnce([{ payload: { projects: [{ id: 'p1' }] } }])
      .mockResolvedValueOnce([])
    neon.mockReturnValue(sqlFn)
    await writeStore({ schedules: [{ id: 's1' }] })
    const insertedJson = sqlFn.mock.calls[1][1]
    expect(JSON.parse(insertedJson)).toEqual({
      projects: [{ id: 'p1' }],
      schedules: [{ id: 's1' }],
    })
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/db.test.js`
Expected: 첫 번째 테스트는 `sqlFn`이 1번만 호출되어 `toHaveBeenCalledTimes(2)`에서 FAIL. 두 번째 테스트는 `writeStore`가 병합하지 않으므로 `{ schedules: [{id:'s1'}] }`만 저장되어 FAIL.

- [ ] **Step 3: `writeStore` 구현 수정**

`server/db.js` 전체를 아래로 교체:

```js
import { neon } from '@neondatabase/serverless'

// NOTE: neon() is called per-function (not at module scope) because:
// 1. Serverless compatibility: Vercel Functions lack persistent state; per-request is idiomatic
// 2. Test isolation: Vitest mocks applied per-test via neon.mockReturnValue() require fresh calls
export async function readStore() {
  const db = neon(process.env.DATABASE_URL)
  const rows = await db`SELECT payload FROM store WHERE id = 1`
  return rows[0]?.payload ?? { projects: [] }
}

export async function writeStore(partialPayload) {
  const db = neon(process.env.DATABASE_URL)
  const rows = await db`SELECT payload FROM store WHERE id = 1`
  const current = rows[0]?.payload ?? { projects: [] }
  const merged = { ...current, ...partialPayload }
  const json = JSON.stringify(merged)
  await db`
    INSERT INTO store (id, payload, updated_at)
    VALUES (1, ${json}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
      SET payload = ${json}::jsonb, updated_at = now()
  `
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/db.test.js`
Expected: PASS (4 tests: readStore 2개, writeStore 2개)

- [ ] **Step 5: 기존 API 테스트가 깨지지 않는지 전체 확인**

Run: `npx vitest run tests/api-functions/projects.test.js`
Expected: PASS — 이 테스트는 `writeStore`를 모킹하므로 내부 구현 변경의 영향을 받지 않는다.

- [ ] **Step 6: Commit**

```bash
git add server/db.js tests/db.test.js
git commit -m "fix: writeStore가 기존 payload를 병합 저장하도록 수정"
```

---

### Task 2: `api/schedules.js` 신설 (GET/PUT)

**Files:**
- Create: `api/schedules.js`
- Test: `tests/api-functions/schedules.test.js`

**Interfaces:**
- Consumes: `readStore()`, `writeStore(partialPayload)` from `server/db.js` (Task 1); `requireAuth(req, res)` from `api/_auth.js`.
- Produces: `GET /api/schedules` → `200 { schedules: [] }` (payload에 `schedules`가 없으면 빈 배열); `PUT /api/schedules` body `{ schedules: [...] }` → `204`.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `tests/api-functions/schedules.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/db.js', () => ({
  readStore: vi.fn(),
  writeStore: vi.fn(),
}))

vi.mock('../../api/_auth.js', () => ({
  requireAuth: vi.fn().mockReturnValue(true),
}))

import { readStore, writeStore } from '../../server/db.js'
import { requireAuth } from '../../api/_auth.js'
import handler from '../../api/schedules.js'

function req(method, body = null) {
  return { method, body, headers: {} }
}
function res() {
  const r = { status: vi.fn(), json: vi.fn(), end: vi.fn() }
  r.status.mockReturnValue(r)
  return r
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAuth.mockReturnValue(true)
})

describe('GET /api/schedules', () => {
  it('store의 schedules를 반환한다', async () => {
    readStore.mockResolvedValue({ projects: [], schedules: [{ id: 's1' }] })
    const r = res()
    await handler(req('GET'), r)
    expect(r.status).toHaveBeenCalledWith(200)
    expect(r.json).toHaveBeenCalledWith({ schedules: [{ id: 's1' }] })
  })

  it('schedules 키가 없으면 빈 배열을 반환한다', async () => {
    readStore.mockResolvedValue({ projects: [] })
    const r = res()
    await handler(req('GET'), r)
    expect(r.json).toHaveBeenCalledWith({ schedules: [] })
  })
})

describe('PUT /api/schedules', () => {
  it('schedules를 저장하고 204를 반환한다', async () => {
    writeStore.mockResolvedValue(undefined)
    const r = res()
    await handler(req('PUT', { schedules: [{ id: 's1' }] }), r)
    expect(writeStore).toHaveBeenCalledWith({ schedules: [{ id: 's1' }] })
    expect(r.status).toHaveBeenCalledWith(204)
    expect(r.end).toHaveBeenCalled()
  })

  it('schedules가 배열이 아니면 400을 반환한다', async () => {
    const r = res()
    await handler(req('PUT', { schedules: 'not-array' }), r)
    expect(r.status).toHaveBeenCalledWith(400)
    expect(r.json).toHaveBeenCalledWith({ error: 'schedules 배열이 필요합니다' })
    expect(writeStore).not.toHaveBeenCalled()
  })
})

describe('인증 실패', () => {
  it('requireAuth가 false면 readStore를 호출하지 않는다', async () => {
    requireAuth.mockReturnValueOnce(false)
    const r = res()
    await handler(req('GET'), r)
    expect(readStore).not.toHaveBeenCalled()
  })
})

describe('허용되지 않는 메서드', () => {
  it('DELETE → 405 반환', async () => {
    const r = res()
    await handler(req('DELETE'), r)
    expect(r.status).toHaveBeenCalledWith(405)
    expect(r.end).toHaveBeenCalled()
  })
})

describe('DB 오류 처리', () => {
  it('readStore 오류 시 500을 반환한다', async () => {
    readStore.mockRejectedValue(new Error('db down'))
    const r = res()
    await handler(req('GET'), r)
    expect(r.status).toHaveBeenCalledWith(500)
    expect(r.json).toHaveBeenCalledWith({ error: 'internal' })
  })

  it('writeStore 오류 시 500을 반환한다', async () => {
    writeStore.mockRejectedValue(new Error('db down'))
    const r = res()
    await handler(req('PUT', { schedules: [] }), r)
    expect(r.status).toHaveBeenCalledWith(500)
    expect(r.json).toHaveBeenCalledWith({ error: 'internal' })
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/api-functions/schedules.test.js`
Expected: FAIL — `Cannot find module '../../api/schedules.js'`

- [ ] **Step 3: `api/schedules.js` 구현**

Create `api/schedules.js`:

```js
import { readStore, writeStore } from '../server/db.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    try {
      const data = await readStore()
      return res.status(200).json({ schedules: data.schedules ?? [] })
    } catch {
      return res.status(500).json({ error: 'internal' })
    }
  }

  if (req.method === 'PUT') {
    const { schedules } = req.body ?? {}
    if (!Array.isArray(schedules)) {
      return res.status(400).json({ error: 'schedules 배열이 필요합니다' })
    }
    try {
      await writeStore({ schedules })
      return res.status(204).end()
    } catch {
      return res.status(500).json({ error: 'internal' })
    }
  }

  res.status(405).end()
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/api-functions/schedules.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add api/schedules.js tests/api-functions/schedules.test.js
git commit -m "feat: 주요 일정 API(/api/schedules) 추가"
```

---

### Task 3: `src/lib/schedules.js` 정렬/그룹핑 헬퍼

**Files:**
- Create: `src/lib/schedules.js`
- Test: `tests/schedules.test.js`

**Interfaces:**
- Produces: `groupSchedules(schedules: Array<{id,title,date,memo}>): { undated: Array, dated: Array }` (dated는 date 오름차순 정렬); `isPastSchedule(schedule: {date}, today: string): boolean`.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `tests/schedules.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { groupSchedules, isPastSchedule } from '../src/lib/schedules.js'

describe('groupSchedules', () => {
  it('date가 없는 항목을 undated로 분리한다', () => {
    const schedules = [
      { id: 's1', title: 'A', date: null },
      { id: 's2', title: 'B', date: '2026-08-01' },
    ]
    const { undated, dated } = groupSchedules(schedules)
    expect(undated).toEqual([schedules[0]])
    expect(dated).toEqual([schedules[1]])
  })

  it('dated 항목을 날짜 오름차순으로 정렬한다', () => {
    const schedules = [
      { id: 's1', title: 'A', date: '2026-09-01' },
      { id: 's2', title: 'B', date: '2026-07-01' },
      { id: 's3', title: 'C', date: '2026-08-01' },
    ]
    const { dated } = groupSchedules(schedules)
    expect(dated.map((s) => s.id)).toEqual(['s2', 's3', 's1'])
  })

  it('빈 배열이면 둘 다 빈 배열', () => {
    expect(groupSchedules([])).toEqual({ undated: [], dated: [] })
  })
})

describe('isPastSchedule', () => {
  it('날짜가 오늘보다 이전이면 true', () => {
    expect(isPastSchedule({ date: '2026-07-01' }, '2026-07-15')).toBe(true)
  })
  it('날짜가 오늘 이후면 false', () => {
    expect(isPastSchedule({ date: '2026-08-01' }, '2026-07-15')).toBe(false)
  })
  it('날짜가 오늘이면 false', () => {
    expect(isPastSchedule({ date: '2026-07-15' }, '2026-07-15')).toBe(false)
  })
  it('date가 null이면 false', () => {
    expect(isPastSchedule({ date: null }, '2026-07-15')).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/schedules.test.js`
Expected: FAIL — `Cannot find module '../src/lib/schedules.js'`

- [ ] **Step 3: 구현 작성**

Create `src/lib/schedules.js`:

```js
export function groupSchedules(schedules) {
  const undated = schedules.filter((s) => s.date == null)
  const dated = schedules
    .filter((s) => s.date != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  return { undated, dated }
}

export function isPastSchedule(schedule, today) {
  return schedule.date != null && schedule.date < today
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/schedules.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/schedules.js tests/schedules.test.js
git commit -m "feat: 주요 일정 정렬/그룹핑 헬퍼 추가"
```

---

### Task 4: `src/api.js`에 `loadSchedules` 추가 + `createDebouncedSave` 일반화

**Files:**
- Modify: `src/api.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Produces: `loadSchedules(): Promise<{schedules: Array}>` (401 → `AuthError` throw); `createDebouncedSave({ endpoint = '/api/projects', bodyKey = 'projects', delay, onError }): (items) => void` — 기존 호출부(`createDebouncedSave({ onError })`, `createDebouncedSave({ delay, onError })`)는 그대로 동작(기본값 사용).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/api.test.js` 상단 import를 아래로 교체:

```js
import { loadProjects, loadSchedules, createDebouncedSave } from '../src/api.js'
```

파일 맨 끝(`createDebouncedSave — 401 처리` 블록 뒤)에 아래 블록 추가:

```js
describe('loadSchedules', () => {
  it('GET /api/schedules 응답을 반환한다', async () => {
    vi.useRealTimers()
    const payload = { schedules: [{ id: 's1' }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) }))
    expect(await loadSchedules()).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith('/api/schedules', { credentials: 'include' })
  })
  it('401 응답 시 AuthError를 throw한다', async () => {
    vi.useRealTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(loadSchedules()).rejects.toBeInstanceOf(AuthError)
  })
  it('응답 실패 시 throw', async () => {
    vi.useRealTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(loadSchedules()).rejects.toThrow('500')
  })
})

describe('createDebouncedSave — endpoint/bodyKey 커스터마이즈', () => {
  it('endpoint와 bodyKey를 지정하면 해당 경로/키로 PUT한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const save = createDebouncedSave({ endpoint: '/api/schedules', bodyKey: 'schedules', delay: 100 })
    save([{ id: 's1' }])
    await vi.advanceTimersByTimeAsync(100)
    expect(fetchMock).toHaveBeenCalledWith('/api/schedules', expect.objectContaining({ method: 'PUT' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ schedules: [{ id: 's1' }] })
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/api.test.js`
Expected: FAIL — `loadSchedules is not a function` / import 에러

- [ ] **Step 3: `src/api.js` 구현 수정**

`src/api.js` 전체를 아래로 교체:

```js
import { AuthError } from './auth-error.js'

export { AuthError }

export async function loadProjects() {
  const res = await fetch('/api/projects', { credentials: 'include' })
  if (res.status === 401) throw new AuthError()
  if (!res.ok) throw new Error(`로드 실패: ${res.status}`)
  return res.json()
}

export async function loadSchedules() {
  const res = await fetch('/api/schedules', { credentials: 'include' })
  if (res.status === 401) throw new AuthError()
  if (!res.ok) throw new Error(`로드 실패: ${res.status}`)
  return res.json()
}

export function createDebouncedSave({ endpoint = '/api/projects', bodyKey = 'projects', delay = 500, onError } = {}) {
  let timer = null
  return function save(items) {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [bodyKey]: items }),
          credentials: 'include',
        })
        if (res.status === 401) { onError?.(new AuthError()); return }
        if (!res.ok) throw new Error(`저장 실패: ${res.status}`)
        onError?.(null)
      } catch (err) {
        onError?.(err)
      }
    }, delay)
  }
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/api.test.js`
Expected: PASS (기존 테스트 포함 전체)

- [ ] **Step 5: Commit**

```bash
git add src/api.js tests/api.test.js
git commit -m "feat: api.js에 loadSchedules 추가, createDebouncedSave 엔드포인트 일반화"
```

---

### Task 5: 사이드바에 '주요 일정' 메뉴 추가

**Files:**
- Modify: `src/components/icons.jsx`
- Modify: `src/components/Sidebar.jsx:1-16`
- Test: `tests/components/sidebar.test.jsx`

**Interfaces:**
- Produces: `CalendarIcon(props)` (새 아이콘). `Sidebar`는 `onNavigate({ page: 'schedules' })`를 호출하는 새 버튼(접근성 이름에 `주요 일정` 포함)을 렌더한다. 기존 props(`projects, view, onNavigate, onAddProject`) 변경 없음.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/components/sidebar.test.jsx` 맨 끝에 추가:

```js
it('주요 일정 메뉴 클릭 시 onNavigate가 호출된다', () => {
  const onNavigate = vi.fn()
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={onNavigate} onAddProject={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /주요 일정/ }))
  expect(onNavigate).toHaveBeenCalledWith({ page: 'schedules' })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/components/sidebar.test.jsx`
Expected: FAIL — `주요 일정` 텍스트를 가진 버튼을 찾을 수 없음

- [ ] **Step 3: `CalendarIcon` 추가**

`src/components/icons.jsx` 맨 끝에 추가:

```js

export function CalendarIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  )
}
```

- [ ] **Step 4: `Sidebar.jsx`에 메뉴 항목 추가**

`src/components/Sidebar.jsx`를 아래로 교체:

```jsx
import { projectColor } from '../lib/colors.js'
import { projectSidebarStatus } from '../lib/projectStatus.js'
import { GridIcon, CalendarIcon } from './icons.jsx'

export default function Sidebar({ projects, view, onNavigate, onAddProject }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">고객가치혁신유닛</div>

      <button
        className={`side-item side-home${view.page === 'home' ? ' active' : ''}`}
        onClick={() => onNavigate({ page: 'home' })}
      >
        <span className="side-ico"><GridIcon /></span>
        <span className="side-project-name">전체 개요</span>
      </button>

      <button
        className={`side-item${view.page === 'schedules' ? ' active' : ''}`}
        onClick={() => onNavigate({ page: 'schedules' })}
      >
        <span className="side-ico"><CalendarIcon /></span>
        <span className="side-project-name">주요 일정</span>
      </button>

      <div className="side-section-label">프로젝트</div>
      <ul className="side-projects">
        {projects.map((p) => {
          const st = projectSidebarStatus(p)
          const active = view.page === 'project' && view.id === p.id
          return (
            <li key={p.id}>
              <button
                className={`side-item side-project${active ? ' active' : ''}`}
                onClick={() => onNavigate({ page: 'project', id: p.id })}
              >
                <span className="side-dot" style={{ background: projectColor(p.id) }} aria-hidden="true" />
                <span className="side-project-name">{p.name}</span>
                <span className={`side-badge side-badge--${st.tone}`}>{st.text}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <button className="side-item side-add" onClick={onAddProject}>+ 새 프로젝트</button>
    </aside>
  )
}
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/components/sidebar.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/icons.jsx src/components/Sidebar.jsx tests/components/sidebar.test.jsx
git commit -m "feat: 사이드바에 주요 일정 메뉴 추가"
```

---

### Task 6: `ScheduleForm` 모달 컴포넌트

**Files:**
- Create: `src/components/ScheduleForm.jsx`
- Modify: `src/styles.css` (모달/폼 섹션에 체크박스 라벨 스타일 추가)
- Test: `tests/components/schedule-form.test.jsx`

**Interfaces:**
- Consumes: `Modal` from `./Modal.jsx`.
- Produces: `ScheduleForm({ initial?, onSubmit, onClose })` — `onSubmit`은 `{ title: string, date: string|null, memo: string }`으로 호출된다. `initial`이 있으면 제목이 '일정 수정'/버튼이 '저장', 없으면 '일정 추가'/'추가'.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `tests/components/schedule-form.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ScheduleForm from '../../src/components/ScheduleForm.jsx'

it('제목과 날짜를 입력해 onSubmit을 호출한다', () => {
  const onSubmit = vi.fn()
  render(<ScheduleForm onSubmit={onSubmit} onClose={() => {}} />)
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '워크샵' } })
  fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-08-01' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onSubmit).toHaveBeenCalledWith({ title: '워크샵', date: '2026-08-01', memo: '' })
})

it('날짜 미정 체크 시 date는 null로 제출되고 날짜 입력은 비활성화된다', () => {
  const onSubmit = vi.fn()
  render(<ScheduleForm onSubmit={onSubmit} onClose={() => {}} />)
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '임원 보고' } })
  fireEvent.click(screen.getByLabelText('날짜 미정'))
  expect(screen.getByLabelText('날짜')).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onSubmit).toHaveBeenCalledWith({ title: '임원 보고', date: null, memo: '' })
})

it('initial 값이 있으면 수정 폼(저장 버튼)으로 표시되고 값이 채워진다', () => {
  const initial = { id: 's1', title: '워크샵', date: '2026-08-01', memo: '메모' }
  render(<ScheduleForm initial={initial} onSubmit={() => {}} onClose={() => {}} />)
  expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  expect(screen.getByLabelText('제목')).toHaveValue('워크샵')
  expect(screen.getByLabelText('날짜 미정')).not.toBeChecked()
})

it('initial의 date가 null이면 날짜 미정이 체크된 채로 표시된다', () => {
  const initial = { id: 's2', title: '임원 보고', date: null, memo: '' }
  render(<ScheduleForm initial={initial} onSubmit={() => {}} onClose={() => {}} />)
  expect(screen.getByLabelText('날짜 미정')).toBeChecked()
  expect(screen.getByLabelText('날짜')).toBeDisabled()
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/components/schedule-form.test.jsx`
Expected: FAIL — `Cannot find module '../../src/components/ScheduleForm.jsx'`

- [ ] **Step 3: 구현 작성**

Create `src/components/ScheduleForm.jsx`:

```jsx
import { useState } from 'react'
import Modal from './Modal.jsx'

export default function ScheduleForm({ initial, onSubmit, onClose }) {
  const [undated, setUndated] = useState(!!initial && initial.date == null)

  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      title: f.get('title'),
      date: undated ? null : f.get('date'),
      memo: f.get('memo'),
    })
  }

  return (
    <Modal title={initial ? '일정 수정' : '일정 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>제목 <input name="title" defaultValue={initial?.title} required /></label>
        <label className="form-checkbox-label">
          <input type="checkbox" checked={undated} onChange={(e) => setUndated(e.target.checked)} />
          날짜 미정
        </label>
        <label>날짜 <input name="date" type="date" defaultValue={initial?.date ?? ''} disabled={undated} /></label>
        <label>메모 <textarea name="memo" defaultValue={initial?.memo} /></label>
        <button type="submit" className="btn-primary">{initial ? '저장' : '추가'}</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: 체크박스 라벨 스타일 추가**

`src/styles.css:468` (`.form textarea { min-height: 72px; resize: vertical; }`) 바로 뒤에 추가:

```css
.form label.form-checkbox-label { flex-direction: row; align-items: center; gap: 6px; }
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/components/schedule-form.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/ScheduleForm.jsx src/styles.css tests/components/schedule-form.test.jsx
git commit -m "feat: ScheduleForm 모달 컴포넌트 추가"
```

---

### Task 7: `Schedules` 페이지 (목록 + 추가/수정/삭제)

**Files:**
- Create: `src/pages/Schedules.jsx`
- Modify: `src/styles.css` (주요 일정 리스트 스타일 섹션 추가)
- Test: `tests/pages/schedules.test.jsx`

**Interfaces:**
- Consumes: `groupSchedules`, `isPastSchedule` from `../lib/schedules.js` (Task 3); `todayStr` from `../lib/calc.js`; `ScheduleForm` (Task 6); `EditIcon`, `TrashIcon` from `../components/icons.jsx`.
- Produces: `Schedules({ schedules: Array, onChange: (next: Array) => void })` — `App.jsx`가 이 컴포넌트에 `schedules` state와 `updateSchedules`를 연결한다(Task 8).

- [ ] **Step 1: 실패하는 테스트 작성**

Create `tests/pages/schedules.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Schedules from '../../src/pages/Schedules.jsx'

const schedules = [
  { id: 's1', title: '워크샵', date: '2026-08-01', memo: '', createdAt: '', updatedAt: '' },
  { id: 's2', title: '임원 보고', date: null, memo: '분기별', createdAt: '', updatedAt: '' },
]

it('제목, 날짜 미정 그룹, 날짜 항목을 렌더한다', () => {
  render(<Schedules schedules={schedules} onChange={() => {}} />)
  expect(screen.getByRole('heading', { name: '주요 일정' })).toBeInTheDocument()
  expect(screen.getByText('날짜 미정')).toBeInTheDocument()
  expect(screen.getByText('워크샵')).toBeInTheDocument()
  expect(screen.getByText('임원 보고')).toBeInTheDocument()
})

it('일정이 없으면 안내 문구를 보여준다', () => {
  render(<Schedules schedules={[]} onChange={() => {}} />)
  expect(screen.getByText('등록된 일정이 없습니다.')).toBeInTheDocument()
})

it('일정 추가 버튼 → 폼 제출 시 onChange가 새 항목을 포함해 호출된다', () => {
  const onChange = vi.fn()
  render(<Schedules schedules={schedules} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '+ 일정 추가' }))
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '신규 일정' } })
  fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-09-01' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ title: '신규 일정', date: '2026-09-01' })]),
  )
  expect(onChange.mock.calls[0][0]).toHaveLength(3)
})

it('수정 버튼 → 폼 제출 시 onChange가 해당 항목만 변경해 호출된다', () => {
  const onChange = vi.fn()
  render(<Schedules schedules={schedules} onChange={onChange} />)
  // '워크샵'(s1)의 수정 버튼만 정확히 지정 — 목록 순서(미정 그룹이 먼저 렌더)에 의존하지 않도록 aria-label로 선택
  fireEvent.click(screen.getByRole('button', { name: '워크샵 수정' }))
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '워크샵(변경)' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const updated = onChange.mock.calls[0][0]
  expect(updated).toHaveLength(2)
  expect(updated.find((s) => s.id === 's1').title).toBe('워크샵(변경)')
})

it('삭제 버튼 클릭 시 confirm 후 onChange가 해당 항목 제외하고 호출된다', () => {
  const onChange = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<Schedules schedules={schedules} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '워크샵 삭제' }))
  const remaining = onChange.mock.calls[0][0]
  expect(remaining).toEqual([schedules[1]])
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/pages/schedules.test.jsx`
Expected: FAIL — `Cannot find module '../../src/pages/Schedules.jsx'`

- [ ] **Step 3: 구현 작성**

Create `src/pages/Schedules.jsx`:

```jsx
import { useState } from 'react'
import ScheduleForm from '../components/ScheduleForm.jsx'
import { groupSchedules, isPastSchedule } from '../lib/schedules.js'
import { todayStr } from '../lib/calc.js'
import { EditIcon, TrashIcon } from '../components/icons.jsx'

export default function Schedules({ schedules, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const today = todayStr()
  const { undated, dated } = groupSchedules(schedules)

  function addSchedule(form) {
    const now = new Date().toISOString()
    onChange([...schedules, { id: crypto.randomUUID(), ...form, createdAt: now, updatedAt: now }])
  }
  function updateSchedule(id, form) {
    onChange(schedules.map((s) => (s.id === id ? { ...s, ...form, updatedAt: new Date().toISOString() } : s)))
  }
  function removeSchedule(schedule) {
    if (!confirm(`'${schedule.title}' 일정을 삭제할까요?`)) return
    onChange(schedules.filter((s) => s.id !== schedule.id))
  }

  return (
    <div className="schedules-page">
      <header className="home-header">
        <h1 className="home-title">주요 일정</h1>
        <p className="home-subtitle">프로젝트와 무관한 회사 전체 주요 일정</p>
      </header>

      <button className="btn-primary" onClick={() => setAdding(true)}>+ 일정 추가</button>

      {undated.length === 0 && dated.length === 0 && <p className="empty">등록된 일정이 없습니다.</p>}

      {undated.length > 0 && (
        <section className="schedule-group">
          <div className="schedule-group-label">날짜 미정</div>
          <div className="schedule-list">
            {undated.map((s) => (
              <ScheduleRow key={s.id} schedule={s}
                onEdit={() => setEditing(s)} onRemove={() => removeSchedule(s)} />
            ))}
          </div>
        </section>
      )}

      {dated.length > 0 && (
        <section className="schedule-group">
          <div className="schedule-list">
            {dated.map((s) => (
              <ScheduleRow key={s.id} schedule={s} isPast={isPastSchedule(s, today)}
                onEdit={() => setEditing(s)} onRemove={() => removeSchedule(s)} />
            ))}
          </div>
        </section>
      )}

      {(adding || editing) && (
        <ScheduleForm
          initial={editing}
          onSubmit={(form) => {
            if (editing) updateSchedule(editing.id, form)
            else addSchedule(form)
            setAdding(false)
            setEditing(null)
          }}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function ScheduleRow({ schedule, isPast, onEdit, onRemove }) {
  return (
    <div className={`schedule-row${isPast ? ' is-past' : ''}`}>
      {schedule.date
        ? <span className="schedule-date">{schedule.date}</span>
        : <span className="schedule-badge schedule-badge--undated">미정</span>}
      <span className="schedule-title">{schedule.title}</span>
      {schedule.memo && <span className="schedule-memo">{schedule.memo}</span>}
      <span className="schedule-actions">
        <button className="icon-btn" onClick={onEdit} aria-label={`${schedule.title} 수정`}><EditIcon /></button>
        <button className="icon-btn" onClick={onRemove} aria-label={`${schedule.title} 삭제`}><TrashIcon /></button>
      </span>
    </div>
  )
}
```

- [ ] **Step 4: 스타일 추가**

`src/styles.css`의 `.resolved-section { margin-top: 20px; opacity: .7; }` (쟁점 섹션 마지막 줄, 약 452번째 줄) 바로 뒤, `/* ===== 모달 / 폼 ===== */` 주석 앞에 추가:

```css
/* ===== 주요 일정 ===== */
.schedules-page { max-width: 640px; }
.schedule-group { margin-bottom: 20px; }
.schedule-group-label {
  font-size: 11px; font-weight: 600; letter-spacing: .5px;
  text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;
}
.schedule-list { display: flex; flex-direction: column; gap: 6px; }
.schedule-row {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border-radius: 12px; padding: 9px 12px;
  border: 1px solid var(--border); box-shadow: var(--shadow-card);
}
.schedule-row.is-past { opacity: .5; }
.schedule-date { font-size: 12px; font-weight: 600; color: var(--text-secondary); flex-shrink: 0; width: 88px; }
.schedule-badge--undated {
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  background: var(--surface-sunk); border-radius: 20px; padding: 3px 9px; flex-shrink: 0;
}
.schedule-title { font-size: 13px; color: #1d1d1f; flex: 1; min-width: 0; }
.schedule-memo {
  font-size: 12px; color: var(--text-muted); flex-shrink: 0; max-width: 200px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.schedule-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity .12s; }
.schedule-row:hover .schedule-actions,
.schedule-row:focus-within .schedule-actions { opacity: 1; }
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/pages/schedules.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/pages/Schedules.jsx src/styles.css tests/pages/schedules.test.jsx
git commit -m "feat: 주요 일정 목록 페이지(Schedules) 추가"
```

---

### Task 8: `App.jsx` 배선 — `schedules` state, 로드/저장, 라우팅

**Files:**
- Modify: `src/App.jsx`
- Test: `tests/app.test.jsx`

**Interfaces:**
- Consumes: `loadSchedules`, `createDebouncedSave` from `./api.js` (Task 4); `Schedules` from `./pages/Schedules.jsx` (Task 7); `Sidebar`가 이미 보내는 `{ page: 'schedules' }` (Task 5).
- Produces: 사이드바에서 '주요 일정' 클릭 시 `Schedules` 페이지가 렌더되고, 편집 시 디바운스 PUT으로 `/api/schedules`에 저장된다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/app.test.jsx`의 `vi.mock('../src/api.js', ...)` 블록을 아래로 교체:

```js
vi.mock('../src/api.js', () => ({
  loadProjects: vi.fn().mockResolvedValue({ projects: [sample], recoveredFrom: null }),
  loadSchedules: vi.fn().mockResolvedValue({ schedules: [] }),
  createDebouncedSave: vi.fn(() => saveMock),
}))
```

파일 맨 끝에 테스트 추가:

```jsx
it('주요 일정 메뉴 클릭 시 일정 페이지를 보여준다', async () => {
  render(<App />)
  const btn = await screen.findByRole('button', { name: /주요 일정/ })
  fireEvent.click(btn)
  expect(await screen.findByRole('heading', { name: '주요 일정' })).toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run tests/app.test.jsx`
Expected: FAIL — `loadSchedules is not a function` (App.jsx가 아직 호출하지 않음 → 실제로는 mock에 정의는 됐지만 App.jsx가 아직 `Schedules` 페이지로 라우팅하지 않아 `주요 일정` 헤딩을 찾지 못해 FAIL). 사이드바 버튼 자체는 Task 5에서 이미 존재하므로 클릭까지는 되지만 페이지 전환이 없어 heading 조회가 실패한다.

- [ ] **Step 3: `App.jsx` 수정**

`src/App.jsx` 전체를 아래로 교체:

```jsx
import { useEffect, useRef, useState } from 'react'
import { loadProjects, loadSchedules, createDebouncedSave } from './api.js'
import { AuthError } from './auth-error.js'
import Home from './pages/Home.jsx'
import Project from './pages/Project.jsx'
import Schedules from './pages/Schedules.jsx'
import Login from './pages/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import ProjectForm from './components/ProjectForm.jsx'

export default function App() {
  const [projects, setProjects] = useState(null)
  const [schedules, setSchedules] = useState(null)
  const [view, setView] = useState({ page: 'home' })
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState(null)
  const [authed, setAuthed] = useState(null) // null=확인중, false=미인증, true=인증됨
  const saveRef = useRef(null)
  const scheduleSaveRef = useRef(null)

  function migrateInitiative(init) {
    if (init.items !== undefined) return init
    const taskItems = (init.tasks ?? []).map(t => ({ ...t, type: 'task' }))
    const msItems = (init.milestones ?? []).map(m => ({ ...m, type: 'milestone' }))
    return { ...init, items: [...taskItems, ...msItems], tasks: undefined, milestones: undefined }
  }

  function migrateProjects(projects) {
    return projects.map(p => ({ ...p, initiatives: (p.initiatives ?? []).map(migrateInitiative) }))
  }

  useEffect(() => {
    function handleSaveError(err) {
      if (err instanceof AuthError) { setAuthed(false); return }
      setNotice(err
        ? { type: 'error', text: '저장에 실패했습니다. 변경 내용은 화면에 유지되어 있으니 잠시 후 다시 수정해 보세요.' }
        : null)
    }
    saveRef.current = createDebouncedSave({ onError: handleSaveError })
    scheduleSaveRef.current = createDebouncedSave({
      endpoint: '/api/schedules',
      bodyKey: 'schedules',
      onError: handleSaveError,
    })
    Promise.all([loadProjects(), loadSchedules()])
      .then(([{ projects, recoveredFrom }, { schedules }]) => {
        setAuthed(true)
        setProjects(migrateProjects(projects))
        setSchedules(schedules)
        if (recoveredFrom) {
          setNotice({ type: 'info', text: `데이터 파일이 손상되어 백업(${recoveredFrom})에서 복구했습니다.` })
        }
      })
      .catch((err) => {
        if (err instanceof AuthError) { setAuthed(false); return }
        setAuthed(true)
        setNotice({ type: 'error', text: '데이터를 불러오지 못했습니다. 서버 실행 상태를 확인하세요.' })
      })
  }, [])

  function updateProjects(next) {
    setProjects(next)
    saveRef.current?.(next)
  }

  function updateProject(id, updater) {
    updateProjects(projects.map((p) => (p.id === id ? updater(p) : p)))
  }

  function updateSchedules(next) {
    setSchedules(next)
    scheduleSaveRef.current?.(next)
  }

  if (authed === null) {
    return <div className="app"><div className="loading">불러오는 중…</div></div>
  }

  if (!authed) {
    return <Login onSuccess={() => window.location.reload()} />
  }

  if (projects === null || schedules === null) {
    return (
      <div className="app">
        {notice && <div className={`banner banner-${notice.type}`}>{notice.text}</div>}
        <div className="loading">불러오는 중…</div>
      </div>
    )
  }

  const current = view.page === 'project' ? projects.find((p) => p.id === view.id) : null

  return (
    <div className="shell">
      <Sidebar
        projects={projects}
        view={view}
        onNavigate={setView}
        onAddProject={() => setAdding(true)}
      />
      <main className="shell-main">
        {notice && <div className={`banner banner-${notice.type}`}>{notice.text}</div>}
        {view.page === 'schedules' ? (
          <Schedules schedules={schedules} onChange={updateSchedules} />
        ) : current ? (
          <Project
            key={current.id}
            project={current}
            onChange={(updater) => updateProject(current.id, updater)}
            onDelete={() => {
              updateProjects(projects.filter((p) => p.id !== current.id))
              setView({ page: 'home' })
            }}
            onBack={() => setView({ page: 'home' })}
          />
        ) : (
          <Home projects={projects} onOpen={(id) => setView({ page: 'project', id })} />
        )}
      </main>

      {adding && (
        <ProjectForm
          onSubmit={(form) => {
            const id = crypto.randomUUID()
            updateProjects([...projects, { id, ...form, kpis: [], initiatives: [], operations: [] }])
            setAdding(false)
            setView({ page: 'project', id })
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npx vitest run tests/app.test.jsx`
Expected: PASS (모든 기존 테스트 + 신규 테스트)

- [ ] **Step 5: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS (신규/기존 포함)

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx tests/app.test.jsx
git commit -m "feat: App에 주요 일정 페이지 배선(로드/저장/라우팅)"
```

---

## 완료 후 확인

- `npm run dev`로 로컬 실행 후 사이드바 '주요 일정' 클릭 → 목록 페이지 진입 확인
- 일정 추가(날짜 있음/미정 각각) → 새로고침 후에도 유지되는지 확인 (Neon 연결 필요, 로컬 `.env`의 `DATABASE_URL` 확인)
- 기존 프로젝트 편집이 여전히 정상 저장되는지 확인 (Task 1의 병합 로직 회귀 테스트)

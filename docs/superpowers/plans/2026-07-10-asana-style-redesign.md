# Asana 스타일 UI/UX 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 중앙 정렬·애플 스타일 대시보드를, 좌측 고정 사이드바 + 뷰 탭(개요·과제·운영·쟁점) + 코랄 강조색의 Asana식 레이아웃으로 재구성한다. 기능은 그대로 두고 UI/레이아웃만 바꾼다.

**Architecture:** React(순수 함수형 컴포넌트) + 상태 기반 라우팅(`view={page,id}`). 앱 셸을 `Sidebar + main` 2단으로 바꾸고, 프로젝트 상세를 4개 뷰 탭으로 분리한다. 쟁점은 데이터상 여전히 `initiative.issues[]`에 저장하되, 전용 탭에서 프로젝트 전체 쟁점을 집계해 보여준다. 스타일은 `styles.css`의 CSS 변수(디자인 토큰)를 기반으로 코랄 팔레트로 통일한다.

**Tech Stack:** React 18, Vite, Vitest + @testing-library/react (jsdom), 순수 CSS(`src/styles.css`).

**설계 문서:** `docs/superpowers/specs/2026-07-10-asana-style-redesign-design.md`

**공통 규칙:**
- 테스트 실행: `npx vitest run <경로>` (전체는 `npm test`).
- 각 Task 끝에서 커밋한다.
- 데이터 구조(`data/projects.json`)는 변경하지 않는다.
- 쟁점 상태 값은 `열림 · 대응중 · 해결`, 미해결 = `status !== '해결'`. 중요도 값은 `상 · 중 · 하`.

---

## Phase 1 — 디자인 토큰 & 순수 함수 헬퍼

### Task 1: 디자인 토큰(CSS 변수) 정의

코랄 강조색 팔레트와 표면/텍스트/상태 색을 CSS 변수로 정의해 이후 모든 스타일이 이를 참조하게 한다.

**Files:**
- Modify: `src/styles.css:1-9` (파일 상단 `/* ===== 기본 ===== */` 블록 바로 위에 `:root` 추가)

- [ ] **Step 1: `:root` 토큰 블록 추가**

`src/styles.css` 최상단(1번째 줄 `/* ===== 기본 ===== */` **앞**)에 아래를 삽입한다:

```css
/* ===== 디자인 토큰 ===== */
:root {
  /* 강조색 (Asana 코랄) */
  --accent:        #D85A30;
  --accent-hover:  #C24E28;
  --accent-strong: #993C1D;
  --accent-bg:     #FAECE7;

  /* 표면 */
  --surface-page: #f5f5f7;
  --surface-card: #ffffff;
  --surface-sunk: #f1f1f4;

  /* 텍스트 */
  --text-primary:   #1d1d1f;
  --text-secondary: #6e6e73;
  --text-muted:     #86868b;

  /* 경계/그림자 */
  --border:        #e8e8ed;
  --border-strong: #d2d2d7;
  --shadow-card:   0 1px 2px rgba(0,0,0,.04), 0 0 1px rgba(0,0,0,.06);

  /* 상태 */
  --ok:    #1a7f37;
  --warn:  #b45309;
  --danger:#cf1124;

  /* 레이아웃 */
  --sidebar-w: 240px;
  --radius-card: 12px;
  --radius-ctl: 8px;
}
```

- [ ] **Step 2: 빌드가 깨지지 않는지 확인**

Run: `npm run build`
Expected: 성공(에러 없이 `dist/` 생성). 아직 화면 변화는 없다.

- [ ] **Step 3: 커밋**

```bash
git add src/styles.css
git commit -m "style: 코랄 기반 디자인 토큰(CSS 변수) 추가"
```

---

### Task 2: 프로젝트 색상 헬퍼 `projectColor`

프로젝트별 색점을 id 기반으로 안정적으로 결정한다(데이터에 저장하지 않고 항상 같은 색이 나오도록).

**Files:**
- Create: `src/lib/colors.js`
- Test: `tests/colors.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/colors.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { projectColor, PROJECT_PALETTE } from '../src/lib/colors.js'

describe('projectColor', () => {
  it('같은 id에는 항상 같은 색을 돌려준다', () => {
    expect(projectColor('abc')).toBe(projectColor('abc'))
  })
  it('팔레트 안의 값만 돌려준다', () => {
    expect(PROJECT_PALETTE).toContain(projectColor('p1'))
    expect(PROJECT_PALETTE).toContain(projectColor('another-id'))
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/colors.test.js`
Expected: FAIL (`colors.js` 없음 → 모듈 해석 실패)

- [ ] **Step 3: 구현**

`src/lib/colors.js`:

```js
// 프로젝트별 색점: id로부터 안정적으로 팔레트 색을 고른다.
export const PROJECT_PALETTE = [
  '#7F77DD', // purple
  '#1D9E75', // teal
  '#D85A30', // coral
  '#378ADD', // blue
  '#D4537E', // pink
  '#BA7517', // amber
  '#0F6E56', // deep teal
  '#534AB7', // deep purple
]

export function projectColor(id) {
  const s = String(id)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PROJECT_PALETTE[h % PROJECT_PALETTE.length]
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/colors.test.js`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/colors.js tests/colors.test.js
git commit -m "feat: 프로젝트 색점 헬퍼 projectColor 추가"
```

---

### Task 3: 사이드바 상태 헬퍼 `projectSidebarStatus`

사이드바에 표시할 프로젝트 상태 배지(쟁점수 / 운영상태 / 진척률)를 결정한다.

**Files:**
- Create: `src/lib/projectStatus.js`
- Test: `tests/project-status.test.js`

우선순위: 미해결 쟁점>0 → `쟁점 N`(danger). 없으면 운영에 `이슈` 있으면 `이슈`(danger), `주의` 있으면 `주의`(warning). 그 외 → 과제 평균 진척률 `NN%`(muted).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/project-status.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { projectProgress, projectSidebarStatus } from '../src/lib/projectStatus.js'

const base = { kpis: [], operations: [], initiatives: [] }

describe('projectProgress', () => {
  it('과제 진척의 평균을 반올림한다', () => {
    const p = { ...base, initiatives: [
      { id: 'a', items: [{ type: 'task', progress: 100 }] },
      { id: 'b', items: [{ type: 'task', progress: 50 }] },
    ] }
    expect(projectProgress(p)).toBe(75)
  })
  it('과제가 없으면 0', () => {
    expect(projectProgress(base)).toBe(0)
  })
})

describe('projectSidebarStatus', () => {
  it('미해결 쟁점이 있으면 쟁점 배지(danger)', () => {
    const p = { ...base, initiatives: [
      { id: 'a', items: [], issues: [{ status: '열림' }, { status: '대응중' }, { status: '해결' }] },
    ] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'issue', text: '쟁점 2', tone: 'danger' })
  })
  it('쟁점이 없고 운영에 이슈가 있으면 이슈 배지(danger)', () => {
    const p = { ...base, operations: [{ status: '이슈' }] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'op', text: '이슈', tone: 'danger' })
  })
  it('쟁점이 없고 운영에 주의가 있으면 주의 배지(warning)', () => {
    const p = { ...base, operations: [{ status: '주의' }] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'op', text: '주의', tone: 'warning' })
  })
  it('그 외에는 진척률 배지(muted)', () => {
    const p = { ...base, initiatives: [{ id: 'a', items: [{ type: 'task', progress: 40 }] }] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'progress', text: '40%', tone: 'muted' })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/project-status.test.js`
Expected: FAIL (`projectStatus.js` 없음)

- [ ] **Step 3: 구현**

`src/lib/projectStatus.js`:

```js
import { countOpenIssues, initiativeProgress } from './calc.js'

export function projectProgress(project) {
  const inits = project.initiatives ?? []
  if (inits.length === 0) return 0
  const sum = inits.reduce((acc, i) => acc + initiativeProgress(i), 0)
  return Math.round(sum / inits.length)
}

export function projectSidebarStatus(project) {
  const open = countOpenIssues(project)
  if (open > 0) return { kind: 'issue', text: `쟁점 ${open}`, tone: 'danger' }
  const ops = project.operations ?? []
  if (ops.some((o) => o.status === '이슈')) return { kind: 'op', text: '이슈', tone: 'danger' }
  if (ops.some((o) => o.status === '주의')) return { kind: 'op', text: '주의', tone: 'warning' }
  return { kind: 'progress', text: `${projectProgress(project)}%`, tone: 'muted' }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/project-status.test.js`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/projectStatus.js tests/project-status.test.js
git commit -m "feat: 사이드바 상태 헬퍼 projectSidebarStatus 추가"
```

---

## Phase 2 — 앱 셸 & 사이드바

### Task 4: ProjectForm 컴포넌트 추출

새 프로젝트 폼을 App(사이드바)과 홈에서 공유하기 위해 별도 파일로 뺀다. (현재 `Home.jsx` 내부의 `ProjectForm`과 동일 동작)

**Files:**
- Create: `src/components/ProjectForm.jsx`
- Test: `tests/components/project-form.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/components/project-form.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ProjectForm from '../../src/components/ProjectForm.jsx'

it('입력한 값으로 onSubmit을 호출한다', () => {
  const onSubmit = vi.fn()
  render(<ProjectForm onSubmit={onSubmit} onClose={() => {}} />)
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '신규 과제' } })
  fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-01-01' } })
  fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: '신규 과제', startDate: '2026-01-01', endDate: '2026-12-31' }),
  )
})
```

> 참고: `getByLabelText('이름')`이 동작하려면 `<label>이름 <input/></label>` 구조를 유지해야 한다(현재 구조 그대로).

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/project-form.test.jsx`
Expected: FAIL (`ProjectForm.jsx` 없음)

- [ ] **Step 3: 구현 — ProjectForm 파일 생성**

`src/components/ProjectForm.jsx`:

```jsx
import Modal from './Modal.jsx'

export default function ProjectForm({ initial, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'),
      description: f.get('description'),
      startDate: f.get('startDate'),
      endDate: f.get('endDate'),
    })
  }
  return (
    <Modal title={initial ? '프로젝트 수정' : '새 프로젝트'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>이름 <input name="name" defaultValue={initial?.name} required /></label>
        <label>설명 <textarea name="description" defaultValue={initial?.description} /></label>
        <label>시작일 <input name="startDate" type="date" defaultValue={initial?.startDate} required /></label>
        <label>종료일 <input name="endDate" type="date" defaultValue={initial?.endDate} required /></label>
        <button type="submit" className="btn-primary">{initial ? '저장' : '추가'}</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/project-form.test.jsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/ProjectForm.jsx tests/components/project-form.test.jsx
git commit -m "refactor: ProjectForm 컴포넌트 분리"
```

---

### Task 5: Sidebar 컴포넌트

전체 개요 + 프로젝트 목록(색점·이름·상태 배지) + 새 프로젝트를 렌더한다.

**Files:**
- Create: `src/components/Sidebar.jsx`
- Test: `tests/components/sidebar.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/components/sidebar.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Sidebar from '../../src/components/Sidebar.jsx'

const projects = [
  { id: 'p1', name: 'DUR 고도화', kpis: [], operations: [],
    initiatives: [{ id: 'i1', items: [], issues: [{ status: '열림' }] }] },
  { id: 'p2', name: '청구 시스템', kpis: [], operations: [],
    initiatives: [{ id: 'i2', items: [{ type: 'task', progress: 80 }], issues: [] }] },
]

it('전체 개요·프로젝트 목록·새 프로젝트를 렌더한다', () => {
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={() => {}} onAddProject={() => {}} />)
  expect(screen.getByRole('button', { name: /전체 개요/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /DUR 고도화/ })).toBeInTheDocument()
  expect(screen.getByText('쟁점 1')).toBeInTheDocument()   // p1 상태 배지
  expect(screen.getByText('80%')).toBeInTheDocument()      // p2 상태 배지
  expect(screen.getByRole('button', { name: /새 프로젝트/ })).toBeInTheDocument()
})

it('프로젝트 클릭 시 onNavigate가 해당 id로 호출된다', () => {
  const onNavigate = vi.fn()
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={onNavigate} onAddProject={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /DUR 고도화/ }))
  expect(onNavigate).toHaveBeenCalledWith({ page: 'project', id: 'p1' })
})

it('새 프로젝트 클릭 시 onAddProject 호출', () => {
  const onAddProject = vi.fn()
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={() => {}} onAddProject={onAddProject} />)
  fireEvent.click(screen.getByRole('button', { name: /새 프로젝트/ }))
  expect(onAddProject).toHaveBeenCalled()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/sidebar.test.jsx`
Expected: FAIL (`Sidebar.jsx` 없음)

- [ ] **Step 3: 구현**

`src/components/Sidebar.jsx`:

```jsx
import { projectColor } from '../lib/colors.js'
import { projectSidebarStatus } from '../lib/projectStatus.js'

export default function Sidebar({ projects, view, onNavigate, onAddProject }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">고객가치혁신유닛</div>

      <button
        className={`side-item side-home${view.page === 'home' ? ' active' : ''}`}
        onClick={() => onNavigate({ page: 'home' })}
      >
        <span className="side-ico" aria-hidden="true">▦</span>
        <span className="side-project-name">전체 개요</span>
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/sidebar.test.jsx`
Expected: PASS

- [ ] **Step 5: 사이드바 스타일 추가**

`src/styles.css` 하단(로그인 블록 뒤)에 추가:

```css
/* ===== 사이드바 ===== */
.sidebar {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: var(--sidebar-w);
  background: var(--surface-card);
  border-right: 1px solid var(--border);
  padding: 18px 12px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 2px;
}
.sidebar-brand { font-size: 14px; font-weight: 600; color: var(--text-primary); padding: 4px 10px 14px; }
.side-item {
  display: flex; align-items: center; gap: 9px; width: 100%;
  background: none; border: none; text-align: left;
  padding: 8px 10px; border-radius: var(--radius-ctl);
  font-size: 13px; color: var(--text-primary); transition: background .12s;
}
.side-item:hover { background: var(--surface-sunk); }
.side-item.active { background: var(--accent-bg); color: var(--accent-strong); font-weight: 600; }
.side-ico { font-size: 13px; color: inherit; }
.side-section-label {
  font-size: 10px; font-weight: 600; letter-spacing: 1px;
  text-transform: uppercase; color: var(--text-muted);
  padding: 14px 10px 6px;
}
.side-projects { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.side-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.side-project-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-badge { font-size: 10px; flex-shrink: 0; }
.side-badge--danger  { color: var(--danger); }
.side-badge--warning { color: var(--warn); }
.side-badge--muted   { color: var(--text-muted); }
.side-add { color: var(--text-muted); margin-top: 6px; }
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/Sidebar.jsx tests/components/sidebar.test.jsx src/styles.css
git commit -m "feat: 사이드바 컴포넌트 + 스타일"
```

---

### Task 6: App 셸 통합 (사이드바 + 2단 레이아웃)

App을 `Sidebar + main` 2단 구조로 바꾸고, 새 프로젝트 추가를 App 레벨로 올린다.

**Files:**
- Modify: `src/App.jsx:76-97` (렌더 부분)
- Modify: `src/App.jsx:1-6` (import)
- Test: `tests/app.test.jsx` (기존 테스트 갱신)

- [ ] **Step 1: 기존 app 테스트를 새 구조로 갱신**

`tests/app.test.jsx`를 열어 렌더 결과 관련 단언을 아래 방향으로 맞춘다(파일 상단 mock/로딩 흐름은 유지). 최소한 다음 테스트가 있어야 한다. 기존에 홈 렌더/프로젝트 진입을 확인하던 테스트가 있으면 이 내용으로 대체한다:

```jsx
it('로그인·로딩 후 사이드바와 홈이 함께 보인다', async () => {
  // (기존 파일의 loadProjects mock 성공 케이스 설정을 그대로 사용)
  render(<App />)
  expect(await screen.findByRole('button', { name: /전체 개요/ })).toBeInTheDocument()
})
```

> 기존 `tests/app.test.jsx`의 mock 설정(`vi.mock('../src/api.js', ...)` 등)은 그대로 두고, 화면 단언만 사이드바 존재 확인으로 조정한다. 프로젝트 오픈을 테스트하던 부분은 사이드바의 프로젝트 버튼 클릭으로 바꾼다:

```jsx
it('사이드바에서 프로젝트를 열면 상세가 보인다', async () => {
  render(<App />)
  const btn = await screen.findByRole('button', { name: /차세대 시스템/ }) // mock 데이터의 프로젝트명에 맞춘다
  fireEvent.click(btn)
  expect(screen.getAllByText('차세대 시스템').length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/app.test.jsx`
Expected: FAIL (사이드바가 아직 없음 → `전체 개요` 버튼 못 찾음)

- [ ] **Step 3: App.jsx import 갱신**

`src/App.jsx` 상단 import에 다음 두 줄을 추가한다(기존 import들 아래):

```jsx
import Sidebar from './components/Sidebar.jsx'
import ProjectForm from './components/ProjectForm.jsx'
```

그리고 `useState`에 `adding` 상태를 추가한다. `const [view, setView] = useState({ page: 'home' })` 아래에:

```jsx
  const [adding, setAdding] = useState(false)
```

- [ ] **Step 4: App.jsx 렌더부 교체**

`src/App.jsx`의 `return ( ... )` 블록(현재 `<div className="app">` ~ 끝, 76-97행 부근)을 아래로 교체한다:

```jsx
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
        {current ? (
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
```

> 참고: 로딩/미인증 상태의 조기 반환(`if (!authed) ...`, `if (projects === null) ...`)은 그대로 둔다.

- [ ] **Step 5: 셸 레이아웃 스타일 추가**

`src/styles.css`에서 기존 `.app` 규칙(10행 부근)은 그대로 두고(스냅샷/로딩 화면이 사용), 아래를 사이드바 블록 근처에 추가한다:

```css
/* ===== 앱 셸 ===== */
.shell { min-height: 100vh; background: var(--surface-page); }
.shell-main {
  margin-left: var(--sidebar-w);
  padding: 28px 36px 80px;
  max-width: 1180px;
}
@media (max-width: 640px) {
  .sidebar { position: static; width: auto; border-right: none; border-bottom: 1px solid var(--border); }
  .shell-main { margin-left: 0; padding: 20px 16px 60px; }
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/app.test.jsx`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add src/App.jsx tests/app.test.jsx src/styles.css
git commit -m "feat: 앱 셸을 사이드바+메인 2단 구조로 전환"
```

---

### Task 7: Home을 App 소유의 추가 흐름에 맞게 정리

Home 내부의 새 프로젝트 상태/폼/추가 카드 로직을 제거하고, App이 넘겨준 흐름을 쓴다(추가 카드는 사이드바로 대체).

**Files:**
- Modify: `src/pages/Home.jsx`
- Test: `tests/pages/home.test.jsx` (갱신)

- [ ] **Step 1: home 테스트 갱신**

`tests/pages/home.test.jsx`의 `setup()`에서 `onChange` 관련 부분을 제거하고 `onOpen`만 넘기도록 바꾼다. 추가 카드/폼을 검증하던 테스트가 있으면 삭제한다(추가는 이제 사이드바 담당). 카드 렌더/클릭 검증은 유지:

```jsx
function setup() {
  const onOpen = vi.fn()
  render(<Home projects={projects} onOpen={onOpen} />)
  return { onOpen }
}

it('프로젝트 카드를 클릭하면 onOpen이 호출된다', () => {
  const { onOpen } = setup()
  fireEvent.click(screen.getByRole('button', { name: /차세대 시스템/ }))
  expect(onOpen).toHaveBeenCalledWith('p1')
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/pages/home.test.jsx`
Expected: FAIL (아직 Home이 add-card/onChange를 참조하거나, 테스트가 갱신된 시그니처와 안 맞음)

- [ ] **Step 3: Home.jsx 정리**

`src/pages/Home.jsx`를 아래로 교체한다(요약 카드 내부 렌더 로직은 유지, 추가 상태/폼/카드만 제거):

```jsx
import { kpiRate, initiativeProgress } from '../lib/calc.js'
import { projectColor } from '../lib/colors.js'

export default function Home({ projects, onOpen }) {
  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">'26년 Project 목표 관리</h1>
        <p className="home-subtitle">고객가치혁신유닛</p>
      </header>

      <div className="card-grid">
        {projects.map((p) => {
          const openIssues = p.initiatives.flatMap((i) => i.issues ?? []).filter((iss) => iss.status !== '해결')
          const impDot = (s) => s === '상' ? 'dot-red' : s === '중' ? 'dot-amber' : 'dot-green'
          return (
            <button key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
              <div className="card-head">
                <div className="card-name">
                  <span className="card-dot" style={{ background: projectColor(p.id) }} aria-hidden="true" />
                  {p.name}
                </div>
                <div className="card-period">{p.startDate.slice(0, 7)} – {p.endDate.slice(0, 7)}</div>
              </div>

              {p.kpis.length > 0 && (
                <div className="card-chip">
                  <div className="sec">KPI</div>
                  <div className="kpi-list">
                    {p.kpis.map((k) => (
                      <div key={k.id} className="kpi-row">
                        <span className="kpi-name">{k.name}</span>
                        {k.type === 'numeric' ? (
                          <div className="kpi-right">
                            <span className="kpi-nums">{k.current}{k.unit} / {k.target}{k.unit}</span>
                            <span className="kpi-prog">진척 {kpiRate(k) ?? 0}%</span>
                          </div>
                        ) : (
                          <span className="kpi-qual">{k.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.initiatives.length > 0 && (
                <div className="card-chip">
                  <div className="sec">중점수행과제</div>
                  <div className="ini-list">
                    {p.initiatives.map((i) => {
                      const prog = initiativeProgress(i)
                      return (
                        <div key={i.id} className="ini-row">
                          <span className="ini-name">{i.name}</span>
                          <div className="ini-track"><div className="ini-fill" style={{ width: `${prog}%` }} /></div>
                          <span className="ini-pct">{prog}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {p.operations.length > 0 && (
                <div className="card-chip">
                  <div className="sec">운영업무</div>
                  <div className="op-list">
                    {p.operations.map((o) => {
                      const cls = o.status === '정상' ? 'dot-green' : o.status === '주의' ? 'dot-amber' : 'dot-red'
                      return (
                        <div key={o.id} className="op-row">
                          <span className={`dot ${cls}`} />
                          <span className="op-item-name">{o.name}</span>
                          <span className="op-item-cycle">{o.cycle}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {openIssues.length > 0 && (
                <div className="card-chip">
                  <div className="sec">쟁점</div>
                  <div className="op-list">
                    {openIssues.map((iss) => (
                      <div key={iss.id} className="op-row">
                        <span className={`dot ${impDot(iss.importance)}`} />
                        <span className="op-item-name">{iss.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/pages/home.test.jsx`
Expected: PASS

- [ ] **Step 5: 홈 카드 색점 스타일 추가**

`src/styles.css`의 `.card-name` 규칙(86행 부근) 뒤에 추가:

```css
.card-name { display: flex; align-items: center; gap: 8px; }
.card-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
```

- [ ] **Step 6: 커밋**

```bash
git add src/pages/Home.jsx tests/pages/home.test.jsx src/styles.css
git commit -m "refactor: 홈에서 추가 로직 제거, 카드 색점 추가"
```

---

## Phase 3 — 프로젝트 상세 뷰 탭 재구성

### Task 8: 개요(Overview) 탭 컴포넌트

KPI 지표 + 과제 진척 요약 + 주요 쟁점 요약을 렌더한다.

**Files:**
- Create: `src/components/ProjectOverview.jsx`
- Test: `tests/components/overview.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/components/overview.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import ProjectOverview from '../../src/components/ProjectOverview.jsx'

const project = {
  id: 'p1', name: 'X', kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
  initiatives: [
    { id: 'i1', name: '인프라 전환', items: [{ type: 'task', progress: 50 }],
      issues: [{ id: 'is1', content: '계약 지연', importance: '상', status: '열림' }] },
  ],
  operations: [],
}

it('KPI·과제 진척·주요 쟁점(소속 과제명 포함)을 보여준다', () => {
  render(<ProjectOverview project={project} onChange={() => {}} />)
  expect(screen.getByText('매출')).toBeInTheDocument()          // KPI 바
  expect(screen.getByText('인프라 전환')).toBeInTheDocument()   // 과제 진척
  expect(screen.getByText('계약 지연')).toBeInTheDocument()     // 주요 쟁점 내용
  expect(screen.getAllByText('인프라 전환').length).toBeGreaterThan(0) // 쟁점의 소속 과제 라벨
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/overview.test.jsx`
Expected: FAIL (`ProjectOverview.jsx` 없음)

- [ ] **Step 3: 구현**

`src/components/ProjectOverview.jsx`:

```jsx
import KpiBar from './KpiBar.jsx'
import { initiativeProgress } from '../lib/calc.js'

const IMP_CLASS = { 상: 'high', 중: 'mid', 하: 'low' }

export default function ProjectOverview({ project, onChange }) {
  const openIssues = project.initiatives
    .flatMap((i) => (i.issues ?? []).map((iss) => ({ ...iss, initiativeName: i.name })))
    .filter((iss) => iss.status !== '해결')

  return (
    <div className="overview">
      <KpiBar kpis={project.kpis} onChange={(kpis) => onChange((p) => ({ ...p, kpis }))} />

      <div className="overview-cols">
        <section className="overview-block">
          <div className="sec">과제 진척</div>
          {project.initiatives.length === 0 && <p className="empty">등록된 과제가 없습니다.</p>}
          {project.initiatives.map((i) => {
            const prog = initiativeProgress(i)
            return (
              <div key={i.id} className="ini-row">
                <span className="ini-name">{i.name}</span>
                <div className="ini-track"><div className="ini-fill" style={{ width: `${prog}%` }} /></div>
                <span className="ini-pct">{prog}%</span>
              </div>
            )
          })}
        </section>

        <section className="overview-block">
          <div className="sec">주요 쟁점</div>
          {openIssues.length === 0 && <p className="empty">미해결 쟁점이 없습니다.</p>}
          {openIssues.map((iss) => (
            <div key={iss.id} className="ov-issue-row">
              <span className={`imp-dot imp-${IMP_CLASS[iss.importance]}`} aria-hidden="true" />
              <span className="ov-issue-content">{iss.content}</span>
              <span className="ov-issue-init">{iss.initiativeName}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/overview.test.jsx`
Expected: PASS

- [ ] **Step 5: 개요 탭 스타일 추가**

`src/styles.css`에 추가:

```css
/* ===== 개요 탭 ===== */
.overview-cols { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 8px; }
@media (min-width: 800px) { .overview-cols { grid-template-columns: 1fr 1fr; gap: 28px; } }
.overview-block { background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 18px 20px; }
.ov-issue-row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; font-size: 13px; }
.ov-issue-row:last-child { margin-bottom: 0; }
.ov-issue-content { flex: 1; min-width: 0; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ov-issue-init { font-size: 11px; color: var(--text-muted); flex-shrink: 0; background: var(--surface-sunk); border-radius: 20px; padding: 2px 9px; }
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/ProjectOverview.jsx tests/components/overview.test.jsx src/styles.css
git commit -m "feat: 프로젝트 개요 탭 컴포넌트"
```

---

### Task 9: 쟁점(집계) 탭 컴포넌트

프로젝트 전체 과제의 쟁점을 한 목록으로 모으고, 소속 과제 라벨/선택을 지원한다.

**Files:**
- Create: `src/components/ProjectIssues.jsx`
- Test: `tests/components/project-issues.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/components/project-issues.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ProjectIssues from '../../src/components/ProjectIssues.jsx'

const initiatives = [
  { id: 'i1', name: '인프라 전환', items: [], issues: [
    { id: 'a', content: '계약 지연', importance: '상', status: '열림', response: '', createdDate: '2026-06-01', resolvedDate: null },
  ] },
  { id: 'i2', name: '보안 강화', items: [], issues: [
    { id: 'b', content: '점검 지연', importance: '중', status: '해결', response: '', createdDate: '2026-06-02', resolvedDate: '2026-06-10' },
  ] },
]

it('여러 과제의 미해결 쟁점을 소속 과제명과 함께 보여준다', () => {
  render(<ProjectIssues initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('계약 지연')).toBeInTheDocument()
  expect(screen.getByText('인프라 전환')).toBeInTheDocument() // 소속 과제 라벨
  // 해결된 쟁점은 기본 숨김
  expect(screen.queryByText('점검 지연')).not.toBeInTheDocument()
})

it('상태를 해결로 바꾸면 해당 과제의 issue만 갱신해 onChange 호출', () => {
  const onChange = vi.fn()
  render(<ProjectIssues initiatives={initiatives} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('계약 지연 상태'), { target: { value: '해결' } })
  const next = onChange.mock.calls[0][0]
  const i1 = next.find((i) => i.id === 'i1')
  expect(i1.issues[0].status).toBe('해결')
  expect(i1.issues[0].resolvedDate).toBeTruthy()
})

it('추가 폼에서 소속 과제를 골라 쟁점을 추가한다', () => {
  const onChange = vi.fn()
  render(<ProjectIssues initiatives={initiatives} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /쟁점 추가/ }))
  fireEvent.change(screen.getByLabelText('소속 과제'), { target: { value: 'i2' } })
  fireEvent.change(screen.getByLabelText('내용'), { target: { value: '신규 쟁점' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const next = onChange.mock.calls[0][0]
  const i2 = next.find((i) => i.id === 'i2')
  expect(i2.issues.some((x) => x.content === '신규 쟁점' && x.status === '열림')).toBe(true)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/project-issues.test.jsx`
Expected: FAIL (`ProjectIssues.jsx` 없음)

- [ ] **Step 3: 구현**

`src/components/ProjectIssues.jsx`:

```jsx
import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const IMPORTANCES = ['상', '중', '하']
const STATUSES = ['열림', '대응중', '해결']
const IMP_CLASS = { 상: 'high', 중: 'mid', 하: 'low' }
const STATUS_CLASS = { 열림: 'open', 대응중: 'progress', 해결: 'resolved' }
const IMP_ORDER = { 상: 0, 중: 1, 하: 2 }

export default function ProjectIssues({ initiatives, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // { initId, issue }
  const [showResolved, setShowResolved] = useState(false)

  const all = initiatives.flatMap((init) =>
    (init.issues ?? []).map((issue) => ({ issue, initId: init.id, initName: init.name })))
  const active = all
    .filter((x) => x.issue.status !== '해결')
    .sort((a, b) => IMP_ORDER[a.issue.importance] - IMP_ORDER[b.issue.importance])
  const resolved = all.filter((x) => x.issue.status === '해결')

  function updateIssue(initId, issueId, patch) {
    onChange(initiatives.map((init) => init.id !== initId ? init : {
      ...init, issues: (init.issues ?? []).map((i) => i.id === issueId ? { ...i, ...patch } : i),
    }))
  }
  function addIssue(initId, form) {
    onChange(initiatives.map((init) => init.id !== initId ? init : {
      ...init,
      issues: [...(init.issues ?? []), {
        id: crypto.randomUUID(), ...form, status: '열림', createdDate: todayStr(), resolvedDate: null,
      }],
    }))
  }
  function removeIssue(initId, issue) {
    if (!confirm(`'${issue.content}'을(를) 삭제할까요?`)) return
    onChange(initiatives.map((init) => init.id !== initId ? init : {
      ...init, issues: (init.issues ?? []).filter((i) => i.id !== issue.id),
    }))
  }
  function setStatus(initId, issue, status) {
    updateIssue(initId, issue.id, { status, resolvedDate: status === '해결' ? todayStr() : null })
  }

  return (
    <section className="issues-tab">
      {active.map(({ issue, initId, initName }) => (
        <IssueRow key={issue.id} issue={issue} initName={initName}
          onStatus={(s) => setStatus(initId, issue, s)}
          onEdit={() => setEditing({ initId, issue })}
          onRemove={() => removeIssue(initId, issue)} />
      ))}
      {active.length === 0 && <p className="empty">미해결 쟁점이 없습니다.</p>}

      <button className="btn-primary" onClick={() => setAdding(true)} disabled={initiatives.length === 0}>
        + 쟁점 추가
      </button>
      {initiatives.length === 0 && <p className="empty">쟁점을 추가하려면 먼저 과제를 만드세요.</p>}

      {resolved.length > 0 && (
        <div className="resolved-section">
          <button className="link-btn" onClick={() => setShowResolved(!showResolved)}>
            ✓ 해결됨 {resolved.length}건 {showResolved ? '접기' : '보기'}
          </button>
          {showResolved && resolved.map(({ issue, initId, initName }) => (
            <IssueRow key={issue.id} issue={issue} initName={initName}
              onStatus={(s) => setStatus(initId, issue, s)}
              onEdit={() => setEditing({ initId, issue })}
              onRemove={() => removeIssue(initId, issue)} />
          ))}
        </div>
      )}

      {(adding || editing) && (
        <IssueForm
          initiatives={initiatives}
          initial={editing?.issue}
          initialInitId={editing?.initId}
          onSubmit={({ initId, ...form }) => {
            if (editing) updateIssue(editing.initId, editing.issue.id, form)
            else addIssue(initId, form)
            setAdding(false); setEditing(null)
          }}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </section>
  )
}

function IssueRow({ issue, initName, onStatus, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="issue-card">
      <div className="issue-row">
        <span className={`imp-dot imp-${IMP_CLASS[issue.importance]}`} aria-hidden="true" title={`중요도 ${issue.importance}`} />
        <p className="issue-content">{issue.content}</p>
        <span className="issue-init-tag">{initName}</span>
        <select className={`status-select status-${STATUS_CLASS[issue.status]}`} value={issue.status}
          aria-label={`${issue.content} 상태`} onChange={(e) => onStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="issue-actions">
          <button className="icon-btn" onClick={onEdit} aria-label={`${issue.content} 편집`}>✏</button>
          <button className="icon-btn" onClick={onRemove} aria-label={`${issue.content} 삭제`}>🗑️</button>
        </span>
      </div>
      {issue.response && (
        <button type="button" className={`issue-response${expanded ? ' expanded' : ''}`}
          aria-label={`${issue.content} 대응안 ${expanded ? '접기' : '펼치기'}`} onClick={() => setExpanded(!expanded)}>
          <span className="issue-response-arrow" aria-hidden="true">↳</span>
          <span className="issue-response-text">{issue.response}</span>
        </button>
      )}
      {expanded && <p className="meta">등록 {issue.createdDate}{issue.resolvedDate ? ` · 해결 ${issue.resolvedDate}` : ''}</p>}
    </div>
  )
}

function IssueForm({ initiatives, initial, initialInitId, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      initId: f.get('initId'),
      content: f.get('content'),
      response: f.get('response'),
      importance: f.get('importance'),
    })
  }
  return (
    <Modal title={initial ? '쟁점 편집' : '쟁점 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>소속 과제
          <select name="initId" defaultValue={initialInitId ?? initiatives[0]?.id} disabled={!!initial}>
            {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <label>내용 <input name="content" defaultValue={initial?.content} required /></label>
        <label>중요도
          <select name="importance" defaultValue={initial?.importance ?? '중'}>
            {IMPORTANCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>대응안 <textarea name="response" defaultValue={initial?.response} /></label>
        <button type="submit" className="btn-primary">저장</button>
      </form>
    </Modal>
  )
}
```

> 편집 시 `소속 과제` select는 `disabled`이므로 FormData에 `initId`가 담기지 않지만, 편집 경로는 `editing.initId`를 사용하므로 문제 없다(과제 이동은 지원하지 않음).
>
> **설계와의 차이(의도된 변경):** 기존 per-과제 `IssueLog`의 드래그 정렬은 집계 탭에서는 여러 과제에 걸쳐 있어 의미가 없으므로 제거하고, 대신 **중요도 순 자동 정렬(상→중→하)**로 대체한다. KPI·과제·간트의 드래그 정렬은 그대로 유지된다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/project-issues.test.jsx`
Expected: PASS

- [ ] **Step 5: 쟁점 탭 스타일 추가**

`src/styles.css`에 추가:

```css
/* ===== 쟁점 집계 탭 ===== */
.issues-tab { display: flex; flex-direction: column; gap: 8px; }
.issue-init-tag {
  font-size: 11px; color: var(--text-secondary);
  background: var(--surface-sunk); border-radius: 20px;
  padding: 2px 9px; flex-shrink: 0; white-space: nowrap;
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/ProjectIssues.jsx tests/components/project-issues.test.jsx src/styles.css
git commit -m "feat: 쟁점 집계 탭 컴포넌트"
```

---

### Task 10: Initiatives(과제 탭)에서 인라인 쟁점 제거

쟁점이 전용 탭으로 이동했으므로 과제 카드 내부의 `IssueLog`를 제거한다(과제 헤더의 쟁점 건수 메타는 유지).

**Files:**
- Modify: `src/components/Initiatives.jsx:5` (import 제거), `:88-91` (IssueLog 블록 제거)
- Test: `tests/components/initiatives.test.jsx` (갱신), `tests/components/issues.test.jsx` (갱신)

- [ ] **Step 1: 테스트 갱신 (초기 실패 유도)**

`tests/components/initiatives.test.jsx`에서 과제 카드 안의 쟁점 UI(예: `+ 쟁점 추가`, 개별 쟁점 카드)를 검증하던 단언이 있으면 제거한다. 헤더 메타의 쟁점 건수(`쟁점 N건`) 검증은 유지한다. 확인용으로 다음을 추가한다:

```jsx
it('과제 카드 안에는 쟁점 추가 버튼이 없다(쟁점은 전용 탭)', () => {
  // (이 파일의 기존 render 헬퍼로 Initiatives를 렌더한 뒤)
  expect(screen.queryByRole('button', { name: /쟁점 추가/ })).not.toBeInTheDocument()
})
```

`tests/components/issues.test.jsx`는 이제 존재하지 않는 인라인 IssueLog 흐름을 검증하므로, 이 파일을 삭제한다(집계 탭 테스트는 Task 9의 `project-issues.test.jsx`가 대체).

```bash
git rm tests/components/issues.test.jsx
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/initiatives.test.jsx`
Expected: FAIL (아직 Initiatives가 IssueLog를 렌더 → `쟁점 추가` 버튼이 존재)

- [ ] **Step 3: Initiatives.jsx 수정**

`src/components/Initiatives.jsx` 5행의 `import IssueLog from './IssueLog.jsx'`를 삭제한다.

그리고 `<div className="initiative-body">` 안의 `IssueLog` 블록(88-91행 부근)을 삭제한다:

```jsx
                <IssueLog
                  issues={init.issues ?? []}
                  onChange={(issues) => updateInit(init.id, (i) => ({ ...i, issues }))}
                />
```

> `initiativeOpenIssueCount` import와 헤더 메타의 쟁점 건수 표시는 그대로 둔다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/initiatives.test.jsx`
Expected: PASS

`IssueLog.jsx`는 더 이상 사용되지 않는다. 삭제한다:

```bash
git rm src/components/IssueLog.jsx
```

- [ ] **Step 5: 커밋**

```bash
git add src/components/Initiatives.jsx tests/components/initiatives.test.jsx
git commit -m "refactor: 과제 카드에서 인라인 쟁점 제거(전용 탭으로 이동)"
```

---

### Task 11: Project.jsx 뷰 탭 재구성 (개요·과제·운영·쟁점)

상단 KPI 바를 개요 탭으로 옮기고, 4개 뷰 탭을 구성한다.

**Files:**
- Modify: `src/pages/Project.jsx`
- Test: `tests/pages/project.test.jsx` (갱신)

- [ ] **Step 1: project 테스트 갱신**

`tests/pages/project.test.jsx`의 기존 두 테스트를 아래로 교체한다(상단 mock/`setup()`은 유지):

```jsx
it('기본 탭은 개요이고 KPI와 과제 진척을 보여준다', () => {
  setup()
  expect(screen.getAllByText('차세대 시스템')[0]).toBeInTheDocument()
  expect(screen.getByText('70%')).toBeInTheDocument()             // KPI 바(개요)
  expect(screen.getAllByText('인프라 전환')[0]).toBeInTheDocument() // 과제 진척(개요)
})

it('과제 탭으로 전환하면 간트/과제 목록이 보인다', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /^과제/ }))
  expect(screen.getAllByText('인프라 전환')[0]).toBeInTheDocument()
})

it('운영 탭으로 전환하면 운영업무가 보인다', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /^운영/ }))
  expect(screen.getByDisplayValue('주간 보고')).toBeInTheDocument()
})

it('쟁점 탭으로 전환하면 집계된 쟁점이 보인다', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /^쟁점/ }))
  expect(screen.getByText('계약 지연')).toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/pages/project.test.jsx`
Expected: FAIL (탭 이름/구성이 아직 옛 구조)

- [ ] **Step 3: Project.jsx 상단부 교체**

`src/pages/Project.jsx`의 import와 컴포넌트 본문 상단을 아래로 교체한다(파일 하단의 `ProjectSnapshot`, `ProjectEditForm`은 그대로 유지):

```jsx
import { useState, useRef, forwardRef, Fragment } from 'react'
import { toPng } from 'html-to-image'
import Initiatives from '../components/Initiatives.jsx'
import OperationsTable from '../components/OperationsTable.jsx'
import ProjectOverview from '../components/ProjectOverview.jsx'
import ProjectIssues from '../components/ProjectIssues.jsx'
import Modal from '../components/Modal.jsx'
import { kpiRate, initiativeProgress, countOpenIssues } from '../lib/calc.js'
import { projectColor } from '../lib/colors.js'

const TABS = ['개요', '과제', '운영', '쟁점']

export default function Project({ project, onChange, onDelete, onBack }) {
  const [tab, setTab] = useState(TABS[0])
  const [editing, setEditing] = useState(false)
  const reportRef = useRef(null)
  const counts = {
    개요: null,
    과제: project.initiatives.length,
    운영: project.operations.length,
    쟁점: countOpenIssues(project),
  }

  function handleExport() {
    toPng(reportRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
      .then((dataUrl) => {
        const a = document.createElement('a')
        a.download = `${project.name}.png`
        a.href = dataUrl
        a.click()
      })
      .catch((err) => console.error('PNG 내보내기 실패:', err))
  }

  return (
    <div className="project">
      <header className="page-head">
        <button className="back-btn" onClick={onBack}>← 홈</button>
        <div className="page-head-row">
          <div>
            <h1 className="proj-title">
              <span className="proj-dot" style={{ background: projectColor(project.id) }} aria-hidden="true" />
              {project.name}
            </h1>
            <span className="proj-period">{project.startDate} – {project.endDate}</span>
          </div>
          <div className="page-head-actions">
            <button className="btn-export" onClick={handleExport} aria-label="PNG 내보내기">↓ PNG</button>
            <button className="icon-btn" onClick={() => setEditing(true)}>✏</button>
            <button className="icon-btn danger"
              onClick={() => confirm(`'${project.name}' 프로젝트를 삭제할까요?`) && onDelete()}>삭제</button>
          </div>
        </div>
      </header>

      {editing && (
        <ProjectEditForm
          project={project}
          onSubmit={(patch) => { onChange((p) => ({ ...p, ...patch })); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}{counts[t] != null ? ` (${counts[t]})` : ''}
          </button>
        ))}
      </nav>

      {tab === '개요' && <ProjectOverview project={project} onChange={onChange} />}
      {tab === '과제' && (
        <Initiatives initiatives={project.initiatives}
          onChange={(initiatives) => onChange((p) => ({ ...p, initiatives }))} />
      )}
      {tab === '운영' && (
        <OperationsTable operations={project.operations}
          onChange={(operations) => onChange((p) => ({ ...p, operations }))} />
      )}
      {tab === '쟁점' && (
        <ProjectIssues initiatives={project.initiatives}
          onChange={(initiatives) => onChange((p) => ({ ...p, initiatives }))} />
      )}

      <ProjectSnapshot ref={reportRef} project={project} />
    </div>
  )
}
```

> `ProjectSnapshot`은 계속 `kpiRate`, `initiativeProgress`, `Fragment`를 사용하므로 위 import에 유지되어 있다. `KpiBar` import는 Project에서 제거되었고(개요 탭이 대신 사용) 문제 없다.

- [ ] **Step 4: 프로젝트 헤더 색점 스타일 추가**

`src/styles.css`의 `.proj-title` 규칙(186행 부근) 뒤에 추가:

```css
.proj-title { display: flex; align-items: center; gap: 9px; }
.proj-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/pages/project.test.jsx`
Expected: PASS

- [ ] **Step 6: 전체 테스트 확인**

Run: `npm test`
Expected: 전부 PASS (여기서 실패가 있으면 해당 테스트의 옛 가정을 새 구조에 맞게 고친다)

- [ ] **Step 7: 커밋**

```bash
git add src/pages/Project.jsx src/styles.css
git commit -m "feat: 프로젝트 상세를 개요·과제·운영·쟁점 뷰 탭으로 재구성"
```

---

## Phase 4 — 비주얼 마감(코랄 전환 & 카드 평탄화)

### Task 12: 강조색·카드·탭을 코랄 토큰으로 통일

하드코딩된 애플 블루(`#0071e3`)와 두꺼운 그림자를 토큰 기반 코랄/얇은 테두리로 교체한다.

**Files:**
- Modify: `src/styles.css` (전역 치환 + 카드/탭/버튼 규칙)

- [ ] **Step 1: 파란색 하드코딩을 강조 토큰으로 치환**

`src/styles.css`에서 아래를 일괄 치환한다(값 그대로 찾아서 바꾼다):
- `#0071e3` → `var(--accent)`
- `#0068cc` → `var(--accent-hover)`
- `input:focus, select:focus, textarea:focus { border-color: var(--accent); }` 로 반영되었는지 확인

포커스/링크/활성 탭/게이지/진행바가 코랄로 바뀐다.

- [ ] **Step 2: 탭 활성색 확인**

`src/styles.css`의 `.tab.active` 규칙을 아래로 맞춘다:

```css
.tab.active { color: var(--accent-strong); border-bottom-color: var(--accent); font-weight: 600; }
```

- [ ] **Step 3: 카드 그림자 → 얇은 테두리로 평탄화**

다음 규칙들의 `box-shadow`를 테두리 기반으로 바꾼다. 각 규칙에 `border: 1px solid var(--border);`를 추가하고 `box-shadow`를 `var(--shadow-card)`로 낮춘다:

- `.project-card` (67행 부근): `box-shadow: var(--shadow-card);` + `border: 1px solid var(--border);`
- `.project-card:hover`: `box-shadow: 0 4px 16px rgba(0,0,0,.08);` + `border-color: var(--border-strong);` (translateY 유지)
- `.kpi-card`, `.initiative-card`, `.op-section`, `.issue-card`: `box-shadow: var(--shadow-card);` + `border: 1px solid var(--border);`
- `.modal`: `box-shadow: 0 20px 60px rgba(0,0,0,.18);` 유지(모달은 떠 있어야 하므로 그림자 유지)

또한 카드 모서리 반경을 토큰으로 정리: `.project-card`의 `border-radius: 22px` → `border-radius: 16px;`, `.kpi-card`/`.initiative-card`/`.op-section`의 `14px` → `var(--radius-card)`.

- [ ] **Step 4: 빌드 및 전체 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공 + 테스트 전부 PASS (색/그림자 변경은 테스트에 영향 없음)

- [ ] **Step 5: 커밋**

```bash
git add src/styles.css
git commit -m "style: 강조색 코랄 전환 및 카드 평탄화"
```

---

### Task 13: 실앱 시각 검증 (verify)

빌드한 앱을 실제로 띄워 레이아웃/색/탭/쟁점 흐름을 눈으로 확인한다.

**Files:** (없음 — 검증 전용)

- [ ] **Step 1: 앱 실행**

Run: `npm start`
Expected: `http://localhost:3000` 에서 로그인 후 대시보드가 뜬다. (로컬 데이터가 없으면 로그인/빈 상태 확인)

- [ ] **Step 2: 체크리스트 육안 확인**

- [ ] 좌측 사이드바가 고정되어 있고 전체 개요·프로젝트 목록(색점+상태 배지)·새 프로젝트가 보인다
- [ ] 사이드바에서 프로젝트를 열면 상세로 이동, 현재 항목이 코랄로 하이라이트된다
- [ ] 상세 상단에 프로젝트명(색점)+기간, 아래 `개요·과제·운영·쟁점` 탭이 있고 활성 탭이 코랄 밑줄이다
- [ ] 개요 탭: KPI 지표 + 과제 진척 + 주요 쟁점(소속 과제 라벨)
- [ ] 과제 탭: 간트/과제 카드에 인라인 쟁점이 더는 없다
- [ ] 쟁점 탭: 여러 과제의 쟁점이 한 목록으로 모이고, 추가 시 소속 과제를 고를 수 있다
- [ ] 새 프로젝트 추가 → 사이드바 목록과 상세로 정상 반영
- [ ] PNG 내보내기 버튼이 여전히 동작한다
- [ ] 좁은 화면(모바일 폭)에서 사이드바가 상단으로 접히고 본문이 정상 표시된다

- [ ] **Step 3: (선택) 스크린샷 확인**

`verify` 스킬 또는 `/run`으로 앱을 구동해 스크린샷을 남긴다. 이상이 있으면 해당 Task로 돌아가 수정한다.

- [ ] **Step 4: 마감 커밋(있을 경우)**

시각 검증 중 발견한 소소한 스타일 보정이 있으면 커밋한다:

```bash
git add -A
git commit -m "style: 시각 검증 후 마감 보정"
```

---

## 완료 기준

- [ ] `npm test` 전부 통과
- [ ] `npm run build` 성공
- [ ] Task 13 육안 체크리스트 전 항목 확인
- [ ] 데이터 구조(`data/projects.json`) 변경 없음, 기존 데이터 정상 로드

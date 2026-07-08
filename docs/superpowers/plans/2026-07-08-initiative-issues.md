# 중점수행과제별 쟁점 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트 단위 "고려사항" 탭을 폐지하고, 각 중점수행과제(Initiative) 카드 안에서 쟁점(텍스트/중요도/대응안/해결여부/드래그 순서변경)을 관리하는 기능으로 대체한다.

**Architecture:** `Initiative`에 `issues: Issue[]` 필드를 추가하고, 기존 `ConsiderationLog.jsx`와 동일한 상호작용 패턴(추가/편집/삭제 모달, 상태 select, 해결 건 접기)을 재사용하는 신규 `IssueLog.jsx` 컴포넌트를 만든다. 순서 변경은 `Initiatives.jsx`가 이미 쓰고 있는 HTML5 drag-and-drop 패턴을 그대로 따른다. `Project.considerations`와 `ConsiderationLog.jsx`는 완전히 제거한다.

**Tech Stack:** React 18 (함수형 컴포넌트, hooks), Vitest + @testing-library/react, 순수 함수는 `src/lib/calc.js`에 집중.

## Global Constraints

- 쟁점(Issue) 필드: `id, content(한 줄 텍스트, 필수), importance("상"|"중"|"하", 기본 "중"), response(선택), status("열림"|"대응중"|"해결"), createdDate, resolvedDate`.
- 순서는 배열 내 위치로 결정하며 사용자가 드래그로 자유롭게 변경한다 — 중요도에 따른 자동 정렬은 하지 않는다.
- 해결된 쟁점은 항상 "해결됨 N건 보기/접기" 토글 아래 접어서 표시한다(기존 고려사항과 동일 UX).
- 기존 `data/projects.json` / Neon `store.payload`에 남은 `considerations` 필드는 마이그레이션하지 않고 방치한다(다음 저장 시 자연 소멸).
- 각 태스크 완료 후 `npm test`(vitest run)가 전체 통과해야 한다.

---

### Task 1: calc.js — 쟁점 집계 함수 추가

**Files:**
- Modify: `src/lib/calc.js`
- Test: `tests/calc.test.js`

**Interfaces:**
- Produces: `initiativeOpenIssueCount(initiative): number`, `countOpenIssues(project): number` — 이후 Task 3(Initiatives.jsx), Task 4(Project.jsx)에서 사용.
- 기존 `countOpenConsiderations`는 이번 태스크에서 그대로 유지한다(Project.jsx가 아직 참조 중 — Task 6에서 제거).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/calc.test.js` 상단 import에 `initiativeOpenIssueCount, countOpenIssues`를 추가하고, `countOpenConsiderations` describe 블록 바로 뒤에 아래 블록을 추가한다.

```js
import {
  initiativeProgress, isTaskDelayed, kpiRate, projectKpiAverage,
  countDelayedTasks, countOpenConsiderations, initiativeOpenIssueCount, countOpenIssues, todayStr,
} from '../src/lib/calc.js'
```

```js
describe('initiativeOpenIssueCount', () => {
  it('해결 상태가 아닌 쟁점만 센다', () => {
    const init = { issues: [{ status: '열림' }, { status: '대응중' }, { status: '해결' }] }
    expect(initiativeOpenIssueCount(init)).toBe(2)
  })
  it('issues 키가 없으면 0', () => {
    expect(initiativeOpenIssueCount({})).toBe(0)
  })
})

describe('countOpenIssues', () => {
  it('모든 과제의 미해결 쟁점 수를 합산', () => {
    const p = { initiatives: [
      { issues: [{ status: '열림' }, { status: '해결' }] },
      { issues: [{ status: '대응중' }] },
    ] }
    expect(countOpenIssues(p)).toBe(2)
  })
  it('initiatives나 issues 키가 없어도 0', () => {
    expect(countOpenIssues({})).toBe(0)
    expect(countOpenIssues({ initiatives: [{}] })).toBe(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/calc.test.js`
Expected: FAIL — `initiativeOpenIssueCount is not a function` (또는 undefined import 관련 에러)

- [ ] **Step 3: 최소 구현 작성**

`src/lib/calc.js`의 `countOpenConsiderations` 함수 바로 뒤에 추가:

```js
export function initiativeOpenIssueCount(initiative) {
  return (initiative.issues ?? []).filter((i) => i.status !== '해결').length
}

export function countOpenIssues(project) {
  return (project.initiatives ?? []).reduce((sum, i) => sum + initiativeOpenIssueCount(i), 0)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/calc.test.js`
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/calc.js tests/calc.test.js
git commit -m "feat: 과제별 미해결 쟁점 집계 함수 추가"
```

---

### Task 2: IssueLog 컴포넌트 신규 작성

**Files:**
- Create: `src/components/IssueLog.jsx`
- Test: `tests/components/issues.test.jsx`

**Interfaces:**
- Consumes: `Modal`(`src/components/Modal.jsx`, `{ title, onClose, children }`), `todayStr()`(`src/lib/calc.js`).
- Produces: `export default function IssueLog({ issues, onChange })` — `issues: Issue[]`, `onChange(nextIssues: Issue[]): void`.이후 Task 3에서 `Initiatives.jsx`가 `init.issues ?? []`를 넘겨 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/components/issues.test.jsx` 신규 작성:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import IssueLog from '../../src/components/IssueLog.jsx'

const issues = [
  { id: 'i1', content: '벤더 계약 지연', response: '대체 벤더 확보', importance: '상', status: '열림', createdDate: '2026-06-01', resolvedDate: null },
  { id: 'i2', content: '인력 이탈 리스크', response: '', importance: '중', status: '대응중', createdDate: '2026-05-01', resolvedDate: null },
  { id: 'i3', content: '예산 이슈', response: '', importance: '하', status: '해결', createdDate: '2026-04-01', resolvedDate: '2026-05-15' },
]

it('미해결 건은 표시하고 해결 건은 접어둔다', () => {
  render(<IssueLog issues={issues} onChange={() => {}} />)
  expect(screen.getByText('벤더 계약 지연')).toBeInTheDocument()
  expect(screen.getByText('인력 이탈 리스크')).toBeInTheDocument()
  expect(screen.queryByText('예산 이슈')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText(/해결됨 1건 보기/))
  expect(screen.getByText('예산 이슈')).toBeInTheDocument()
})

it('상태를 해결로 바꾸면 resolvedDate가 기록된다', () => {
  const onChange = vi.fn()
  render(<IssueLog issues={issues} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('벤더 계약 지연 상태'), { target: { value: '해결' } })
  const updated = onChange.mock.calls[0][0].find((i) => i.id === 'i1')
  expect(updated.status).toBe('해결')
  expect(updated.resolvedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('추가 폼으로 새 쟁점을 등록한다 (기본 상태: 열림, 기본 중요도: 중)', () => {
  const onChange = vi.fn()
  render(<IssueLog issues={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 쟁점 추가'))
  fireEvent.change(screen.getByLabelText(/내용/), { target: { value: '신규 리스크' } })
  fireEvent.change(screen.getByLabelText(/대응안/), { target: { value: '모니터링 강화' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ content: '신규 리스크', response: '모니터링 강화', importance: '중', status: '열림' })
  expect(added.createdDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('드래그로 미해결 쟁점의 순서를 바꾼다 (해결 건은 그대로 뒤에 유지)', () => {
  const onChange = vi.fn()
  render(<IssueLog issues={issues} onChange={onChange} />)
  const dt = { types: ['application/issue-idx'], setData: vi.fn(), getData: vi.fn().mockReturnValue('0'), dropEffect: null }
  const firstCard = screen.getByText('벤더 계약 지연').closest('.issue-card')
  const secondCard = screen.getByText('인력 이탈 리스크').closest('.issue-card')
  fireEvent.dragStart(firstCard, { dataTransfer: dt })
  fireEvent.dragOver(secondCard, { dataTransfer: dt })
  fireEvent.drop(secondCard, { dataTransfer: dt })
  const result = onChange.mock.calls[0][0]
  expect(result.map((i) => i.id)).toEqual(['i2', 'i1', 'i3'])
})

it('쟁점을 삭제할 수 있다', () => {
  const onChange = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<IssueLog issues={issues} onChange={onChange} />)
  fireEvent.click(screen.getByLabelText('벤더 계약 지연 삭제'))
  expect(onChange.mock.calls[0][0].map((i) => i.id)).toEqual(['i2', 'i3'])
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/issues.test.jsx`
Expected: FAIL — `Failed to resolve import "../../src/components/IssueLog.jsx"`

- [ ] **Step 3: 최소 구현 작성**

`src/components/IssueLog.jsx` 신규 작성:

```jsx
import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const IMPORTANCES = ['상', '중', '하']
const STATUSES = ['열림', '대응중', '해결']
const IMP_CLASS = { 상: 'high', 중: 'mid', 하: 'low' }

export default function IssueLog({ issues, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showResolved, setShowResolved] = useState(false)
  const [dragOver, setDragOver] = useState(null)

  const active = issues.filter((i) => i.status !== '해결')
  const resolved = issues.filter((i) => i.status === '해결')

  function update(id, patch) {
    onChange(issues.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }
  function setStatus(issue, status) {
    update(issue.id, { status, resolvedDate: status === '해결' ? todayStr() : null })
  }
  function remove(issue) {
    confirm(`'${issue.content}'을(를) 삭제할까요?`) && onChange(issues.filter((x) => x.id !== issue.id))
  }
  function reorderActive(fromIdx, toIdx) {
    const next = [...active]
    const [item] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, item)
    onChange([...next, ...resolved])
  }

  return (
    <section className="issue-log">
      <div className="issue-log-head">쟁점</div>
      {active.map((issue, idx) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onStatus={setStatus}
          onEdit={() => setEditing(issue)}
          onRemove={() => remove(issue)}
          draggableProps={{
            dragOver: dragOver === idx,
            onDragStart: (e) => { e.dataTransfer.setData('application/issue-idx', String(idx)); e.dataTransfer.effectAllowed = 'move' },
            onDragOver: (e) => { if (!e.dataTransfer.types.includes('application/issue-idx')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(idx) },
            onDragLeave: () => setDragOver(null),
            onDrop: (e) => {
              const from = parseInt(e.dataTransfer.getData('application/issue-idx'), 10)
              if (!isNaN(from) && from !== idx) reorderActive(from, idx)
              setDragOver(null)
            },
            onDragEnd: () => setDragOver(null),
          }}
        />
      ))}
      {active.length === 0 && <p className="empty">미해결 쟁점이 없습니다.</p>}
      <button className="link-btn" onClick={() => setAdding(true)}>+ 쟁점 추가</button>

      {resolved.length > 0 && (
        <div className="resolved-section">
          <button className="link-btn" onClick={() => setShowResolved(!showResolved)}>
            ✓ 해결됨 {resolved.length}건 {showResolved ? '접기' : '보기'}
          </button>
          {showResolved && resolved.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onStatus={setStatus} onEdit={() => setEditing(issue)} onRemove={() => remove(issue)} />
          ))}
        </div>
      )}

      {(adding || editing) && (
        <IssueForm
          initial={editing}
          onSubmit={(form) => {
            if (editing) update(editing.id, form)
            else onChange([...issues, {
              id: crypto.randomUUID(), ...form,
              status: '열림', createdDate: todayStr(), resolvedDate: null,
            }])
            setAdding(false); setEditing(null)
          }}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </section>
  )
}

function IssueCard({ issue, onStatus, onEdit, onRemove, draggableProps }) {
  const cls = IMP_CLASS[issue.importance]
  return (
    <div
      className={`issue-card imp-${cls}${draggableProps?.dragOver ? ' drag-over' : ''}`}
      draggable={!!draggableProps}
      onDragStart={draggableProps?.onDragStart}
      onDragOver={draggableProps?.onDragOver}
      onDragLeave={draggableProps?.onDragLeave}
      onDrop={draggableProps?.onDrop}
      onDragEnd={draggableProps?.onDragEnd}
    >
      <div className="issue-card-head">
        {draggableProps && <span className="drag-handle" aria-hidden="true">⠿</span>}
        <span className={`badge imp-${cls}`}>{issue.importance}</span>
        <p className="issue-content">{issue.content}</p>
        <select value={issue.status} aria-label={`${issue.content} 상태`} onChange={(e) => onStatus(issue, e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="icon-btn" onClick={onEdit} aria-label={`${issue.content} 편집`}>✏</button>
        <button className="icon-btn" onClick={onRemove} aria-label={`${issue.content} 삭제`}>🗑️</button>
      </div>
      {issue.response && <p className="response">대응안: {issue.response}</p>}
      <p className="meta">등록 {issue.createdDate}{issue.resolvedDate ? ` · 해결 ${issue.resolvedDate}` : ''}</p>
    </div>
  )
}

function IssueForm({ initial, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({ content: f.get('content'), response: f.get('response'), importance: f.get('importance') })
  }
  return (
    <Modal title={initial ? '쟁점 편집' : '쟁점 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/issues.test.jsx`
Expected: PASS (전체 5건)

- [ ] **Step 5: 커밋**

```bash
git add src/components/IssueLog.jsx tests/components/issues.test.jsx
git commit -m "feat: 쟁점 관리 컴포넌트(IssueLog) 추가"
```

---

### Task 3: Initiatives.jsx에 IssueLog 통합

**Files:**
- Modify: `src/components/Initiatives.jsx`
- Test: `tests/components/initiatives.test.jsx` (현재 `items` 배열 구조 리팩터 이전 스타일(`tasks`/`milestones`)로 남아 있어 6건이 이미 실패 중 — 이번 태스크에서 현재 구조에 맞게 재작성하면서 쟁점 관련 검증을 추가한다)

**Interfaces:**
- Consumes: `IssueLog`(Task 2 완성, `{ issues, onChange }`), `initiativeOpenIssueCount`(Task 1 완성, `src/lib/calc.js`).
- Produces: 신규 과제 생성 시 객체 모양이 `{ id, name, description, owner, items: [], issues: [] }`로 바뀜 — Task 4/5에서 이 모양을 그대로 사용.

- [ ] **Step 1: 실패하는 테스트로 전체 재작성**

`tests/components/initiatives.test.jsx` 전체를 아래 내용으로 교체한다 (기존 `tasks`/`milestones` 분리 스키마 대신 실제 컴포넌트가 쓰는 `items` 배열 스키마로 맞추고, 쟁점 관련 테스트를 추가):

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Initiatives from '../../src/components/Initiatives.jsx'

const initiatives = [{
  id: 'i1', name: '인프라 전환', description: '', owner: '홍길동',
  items: [
    { id: 't1', type: 'task', name: '서버 이전', startDate: '2026-01-01', endDate: '2026-03-31', progress: 100, status: '완료' },
    { id: 't2', type: 'task', name: 'DB 이전', startDate: '2026-03-01', endDate: '2026-08-31', progress: 60, status: '진행중' },
    { id: 'm1', type: 'milestone', name: '시스템 오픈', date: '2026-09-01' },
  ],
  issues: [
    { id: 'is1', content: '벤더 리스크', response: '', importance: '상', status: '열림', createdDate: '2026-06-01', resolvedDate: null },
  ],
}]

it('과제명·자동 계산 진척률·담당자를 표시한다', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('인프라 전환')).toBeInTheDocument()
  expect(screen.getByText(/진척 80%/)).toBeInTheDocument() // (100+60)/2
  expect(screen.getByText(/담당 홍길동/)).toBeInTheDocument()
})

it('과제 추가 폼으로 새 과제를 추가한다 (items·issues 빈 배열 포함)', () => {
  const onChange = vi.fn()
  render(<Initiatives initiatives={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 과제 추가'))
  fireEvent.change(screen.getByLabelText(/과제명/), { target: { value: '데이터 표준화' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ name: '데이터 표준화', items: [], issues: [] })
})

it('태스크 추가 폼으로 과제에 태스크를 추가한다', () => {
  const onChange = vi.fn()
  render(<Initiatives initiatives={initiatives} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 태스크 추가'))
  fireEvent.change(screen.getByLabelText(/태스크명/), { target: { value: '모니터링' } })
  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-07-01' } })
  fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-09-30' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const updated = onChange.mock.calls[0][0][0]
  expect(updated.items).toHaveLength(4)
  expect(updated.items[3]).toMatchObject({ type: 'task', name: '모니터링', progress: 0, status: '예정' })
})

it('마일스톤 추가 폼으로 마일스톤을 추가한다', () => {
  const onChange = vi.fn()
  render(<Initiatives initiatives={initiatives} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 마일스톤 추가'))
  fireEvent.change(screen.getByLabelText(/마일스톤명/), { target: { value: '서비스 배포일' } })
  fireEvent.change(screen.getByLabelText(/날짜/), { target: { value: '2026-10-01' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const updated = onChange.mock.calls[0][0][0]
  expect(updated.items).toHaveLength(4)
  expect(updated.items[3]).toMatchObject({ type: 'milestone', name: '서비스 배포일', date: '2026-10-01' })
})

it('과제 헤더 클릭으로 접고 펼친다', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('서버 이전')).toBeInTheDocument()
  fireEvent.click(screen.getByText('인프라 전환'))
  expect(screen.queryByText('서버 이전')).not.toBeInTheDocument()
})

it('마일스톤이 있으면 헤더에 마일스톤 N건 표시', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText(/마일스톤 1건/)).toBeInTheDocument()
})

it('쟁점이 있으면 헤더에 쟁점 건수(미해결)를 표시한다', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText(/쟁점 1건\(미해결 1\)/)).toBeInTheDocument()
})

it('과제를 펼치면 쟁점 섹션이 보이고, 새 쟁점을 추가할 수 있다', () => {
  const onChange = vi.fn()
  render(<Initiatives initiatives={initiatives} onChange={onChange} />)
  expect(screen.getByText('벤더 리스크')).toBeInTheDocument()
  fireEvent.click(screen.getByText('+ 쟁점 추가'))
  fireEvent.change(screen.getByLabelText(/내용/), { target: { value: '신규 쟁점' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const updated = onChange.mock.calls[0][0][0]
  expect(updated.issues).toHaveLength(2)
  expect(updated.issues[1]).toMatchObject({ content: '신규 쟁점', status: '열림' })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/initiatives.test.jsx`
Expected: FAIL — 쟁점 건수 표시, "+ 쟁점 추가" 버튼, `issues` 빈 배열 관련 assertion들이 실패 (컴포넌트가 아직 issues를 모름)

- [ ] **Step 3: 최소 구현 작성**

`src/components/Initiatives.jsx` 수정 3곳.

(a) import 추가 (파일 상단, 기존 import 블록):

```jsx
import { initiativeProgress, initiativeOpenIssueCount } from '../lib/calc.js'
import IssueLog from './IssueLog.jsx'
```

(b) 헤더 메타 텍스트에 쟁점 건수 추가 — 기존:

```jsx
const taskCount = (init.items ?? []).filter(i => i.type === 'task').length
const msCount = (init.items ?? []).filter(i => i.type === 'milestone').length
```

바로 아래에 추가:

```jsx
const issueCount = (init.issues ?? []).length
const openIssueCount = initiativeOpenIssueCount(init)
```

그리고 `<span className="meta">` 내부, 기존:

```jsx
진척 {initiativeProgress(init)}% · 태스크 {taskCount}건
{msCount > 0 ? ` · 마일스톤 ${msCount}건` : ''}
{init.owner ? ` · 담당 ${init.owner}` : ''}
```

를 아래로 교체:

```jsx
진척 {initiativeProgress(init)}% · 태스크 {taskCount}건
{msCount > 0 ? ` · 마일스톤 ${msCount}건` : ''}
{issueCount > 0 ? ` · 쟁점 ${issueCount}건${openIssueCount > 0 ? `(미해결 ${openIssueCount})` : ''}` : ''}
{init.owner ? ` · 담당 ${init.owner}` : ''}
```

(c) `initiative-body` 안, `.initiative-add-btns` 다음에 `IssueLog` 렌더링 추가 — 기존:

```jsx
<div className="initiative-add-btns">
  <button className="link-btn" onClick={() => setTaskFormFor(init.id)}>+ 태스크 추가</button>
  <button className="link-btn" onClick={() => setMilestoneFormFor(init.id)}>+ 마일스톤 추가</button>
</div>
```

바로 아래에 추가:

```jsx
<IssueLog
  issues={init.issues ?? []}
  onChange={(issues) => updateInit(init.id, (i) => ({ ...i, issues }))}
/>
```

(d) 신규 과제 생성 시 `issues: []` 포함 — 기존:

```jsx
onChange([...initiatives, { id: crypto.randomUUID(), ...form, items: [] }])
```

를 아래로 교체:

```jsx
onChange([...initiatives, { id: crypto.randomUUID(), ...form, items: [], issues: [] }])
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/initiatives.test.jsx`
Expected: PASS (전체 8건)

- [ ] **Step 5: 전체 테스트 회귀 확인**

Run: `npm test`
Expected: 이전에 실패하던 `tests/components/initiatives.test.jsx`를 포함해 전체 PASS (단, `tests/pages/project.test.jsx`, `tests/pages/home.test.jsx`, `tests/components/considerations.test.jsx`는 Task 4·5에서 수정 예정이므로 아직 이 시점 기준으로는 영향 없이 그대로 통과해야 함 — 만약 실패한다면 (c)의 JSX 위치가 잘못된 것이니 초기 렌더 시 `+ 쟁점 추가` 텍스트가 다른 텍스트와 충돌하는지 확인)

- [ ] **Step 6: 커밋**

```bash
git add src/components/Initiatives.jsx tests/components/initiatives.test.jsx
git commit -m "feat: 중점수행과제 카드에 쟁점 섹션 통합"
```

---

### Task 4: Project.jsx — 고려사항 탭 제거, 쟁점 기반으로 전환

**Files:**
- Modify: `src/pages/Project.jsx`
- Test: `tests/pages/project.test.jsx`
- Delete: `src/components/ConsiderationLog.jsx`
- Delete: `tests/components/considerations.test.jsx`

**Interfaces:**
- Produces: `Project.jsx`는 더 이상 `ConsiderationLog`나 `project.considerations`를 참조하지 않음 — Task 5(Home.jsx)와 동일한 패턴(`initiatives.flatMap(i => i.issues ?? [])`)을 재사용. (`countOpenIssues`는 탭 카운트에 쓰이지 않으므로 이 파일에서는 import하지 않는다 — 미해결 쟁점 집계는 스냅샷/홈 카드에서 인라인으로 계산한다)

- [ ] **Step 1: 실패하는 테스트로 교체**

`tests/pages/project.test.jsx`에서 아래 3곳을 수정한다.

fixture의 `considerations` 필드를 지우고 initiative에 `issues`를 추가:

```jsx
const project = {
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
  initiatives: [{
    id: 'i1', name: '인프라 전환', description: '', owner: '',
    tasks: [],
    milestones: [{ id: 'm1', name: '시스템 오픈', date: '2026-09-01' }],
    issues: [{ id: 'is1', content: '계약 지연', response: '', importance: '상', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
  }],
  operations: [{ id: 'o1', name: '주간 보고', cycle: '주', owner: '', status: '정상', memo: '' }],
}
```

`탭 전환이 동작한다` 테스트를 아래로 교체 (더 이상 고려사항 탭이 없으므로 쟁점이 중점수행과제 탭에서 바로 보이는지 확인):

```jsx
it('탭 전환이 동작한다', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /운영업무/ }))
  expect(screen.getByDisplayValue('주간 보고')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /중점수행과제/ }))
  expect(screen.getAllByText('계약 지연')[0]).toBeInTheDocument()
})
```

`고려사항` 탭 버튼이 완전히 사라졌는지 확인하는 테스트를 추가:

```jsx
it('고려사항 탭이 더 이상 존재하지 않는다', () => {
  setup()
  expect(screen.queryByRole('button', { name: /고려사항/ })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/pages/project.test.jsx`
Expected: FAIL — `고려사항` 탭이 여전히 존재해 새 테스트가 실패하고, `project.considerations`가 `undefined`라서 스냅샷 렌더링 시 에러 발생

- [ ] **Step 3: 최소 구현 작성**

`src/pages/Project.jsx` 수정.

import 교체 — 기존:

```jsx
import ConsiderationLog from '../components/ConsiderationLog.jsx'
```

삭제. 그리고 기존:

```jsx
import { countOpenConsiderations, kpiRate, initiativeProgress } from '../lib/calc.js'
```

교체:

```jsx
import { kpiRate, initiativeProgress } from '../lib/calc.js'
```

`TABS` 교체:

```jsx
const TABS = ['중점수행과제', '운영업무']
```

`counts` 객체 교체:

```jsx
const counts = {
  중점수행과제: project.initiatives.length,
  운영업무: project.operations.length,
}
```

고려사항 탭 렌더 블록 삭제 — 기존:

```jsx
{tab === '고려사항' && (
  <ConsiderationLog considerations={project.considerations}
    onChange={(considerations) => onChange((p) => ({ ...p, considerations }))} />
)}
```

삭제.

`ProjectSnapshot` 내부, 기존:

```jsx
const openConsid = project.considerations.filter((c) => c.status !== '해결')
const sevDot = (s) => s === '높음' ? 'dot-red' : s === '중간' ? 'dot-amber' : 'dot-green'
```

교체:

```jsx
const openIssues = project.initiatives.flatMap((i) => i.issues ?? []).filter((iss) => iss.status !== '해결')
const impDot = (s) => s === '상' ? 'dot-red' : s === '중' ? 'dot-amber' : 'dot-green'
```

그리고 스냅샷의 고려사항 chip 블록, 기존:

```jsx
{openConsid.length > 0 && (
  <div className="card-chip">
    <div className="sec">고려사항</div>
    <div className="op-list">
      {openConsid.map((c) => (
        <div key={c.id} className="op-row">
          <span className={`dot ${sevDot(c.severity)}`} />
          <span className="op-item-name">{c.title}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

교체:

```jsx
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
```

`countOpenConsiderations`는 이 파일에서 더 이상 쓰이지 않으므로(Task 6에서 calc.js 자체에서도 제거), import에서 이미 뺐는지 재확인한다.

이제 더 이상 아무도 참조하지 않는 파일을 삭제한다:

```bash
rm src/components/ConsiderationLog.jsx tests/components/considerations.test.jsx
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/pages/project.test.jsx`
Expected: PASS (전체)

- [ ] **Step 5: 전체 회귀 확인**

Run: `npm test`
Expected: PASS (Task 5에서 다룰 `tests/pages/home.test.jsx`, `tests/app.test.jsx`는 fixture에 `considerations` 키가 남아있어도 단순히 무시되는 여분 필드라 계속 통과해야 함)

- [ ] **Step 6: 커밋**

```bash
git add src/pages/Project.jsx tests/pages/project.test.jsx
git rm src/components/ConsiderationLog.jsx tests/components/considerations.test.jsx
git commit -m "refactor: 프로젝트 상세에서 고려사항 탭을 쟁점 기반으로 대체"
```

---

### Task 5: Home.jsx — 홈 카드 쟁점 chip으로 전환

**Files:**
- Modify: `src/pages/Home.jsx`
- Test: `tests/pages/home.test.jsx`

**Interfaces:**
- Consumes: 없음 (순수 JSX 내 인라인 계산, Task 4와 동일 패턴).

- [ ] **Step 1: 실패하는 테스트로 교체**

`tests/pages/home.test.jsx`의 fixture 수정 — 기존:

```jsx
initiatives: [{ id: 'i1', name: '인프라 전환', description: '', owner: '', tasks: [] }],
operations: [
  { id: 'o1', name: '주간 보고', cycle: '주', owner: '', status: '정상', memo: '' },
  { id: 'o2', name: '이슈 대응', cycle: '일', owner: '', status: '이슈', memo: '' },
],
considerations: [{ id: 'c1', title: '계약 지연', content: '', response: '', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
```

교체:

```jsx
initiatives: [{
  id: 'i1', name: '인프라 전환', description: '', owner: '', tasks: [],
  issues: [{ id: 'is1', content: '계약 지연', response: '', importance: '상', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
}],
operations: [
  { id: 'o1', name: '주간 보고', cycle: '주', owner: '', status: '정상', memo: '' },
  { id: 'o2', name: '이슈 대응', cycle: '일', owner: '', status: '이슈', memo: '' },
],
```

파일 맨 아래에 테스트 추가:

```jsx
it('과제의 미해결 쟁점을 카드에 표시한다', () => {
  setup()
  expect(screen.getByText('계약 지연')).toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/pages/home.test.jsx`
Expected: FAIL — `project.considerations`를 읽던 코드가 `undefined.filter`로 TypeError

- [ ] **Step 3: 최소 구현 작성**

`src/pages/Home.jsx` 수정.

카드 렌더링 함수 내부, 기존:

```jsx
const openConsid = p.considerations.filter((c) => c.status !== '해결')
const sevDot = (s) => s === '높음' ? 'dot-red' : s === '중간' ? 'dot-amber' : 'dot-green'
```

교체:

```jsx
const openIssues = p.initiatives.flatMap((i) => i.issues ?? []).filter((iss) => iss.status !== '해결')
const impDot = (s) => s === '상' ? 'dot-red' : s === '중' ? 'dot-amber' : 'dot-green'
```

카드의 고려사항 chip 블록, 기존:

```jsx
{openConsid.length > 0 && (
  <div className="card-chip">
    <div className="sec">고려사항</div>
    <div className="op-list">
      {openConsid.map((c) => (
        <div key={c.id} className="op-row">
          <span className={`dot ${sevDot(c.severity)}`} />
          <span className="op-item-name">{c.title}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

교체:

```jsx
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
```

새 프로젝트 생성 객체에서 `considerations: []` 제거 — 기존:

```jsx
onChange([...projects, {
  id: crypto.randomUUID(), ...form,
  kpis: [], initiatives: [], operations: [], considerations: [],
}])
```

교체:

```jsx
onChange([...projects, {
  id: crypto.randomUUID(), ...form,
  kpis: [], initiatives: [], operations: [],
}])
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/pages/home.test.jsx`
Expected: PASS (전체)

- [ ] **Step 5: 전체 회귀 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/pages/Home.jsx tests/pages/home.test.jsx
git commit -m "refactor: 홈 카드의 고려사항 표시를 쟁점 기반으로 대체"
```

---

### Task 6: 레거시 정리 — calc.js / app.test.jsx / styles.css

**Files:**
- Modify: `src/lib/calc.js`
- Modify: `tests/calc.test.js`
- Modify: `tests/app.test.jsx`
- Modify: `src/styles.css`

**Interfaces:** 없음 (외부에서 참조하는 함수/컴포넌트 시그니처 변경 없음 — 죽은 코드·CSS 제거만 수행).

이 태스크는 신규 동작 추가가 아니라 죽은 코드 삭제이므로 RED→GREEN이 아니라 "삭제 후 전체 스위트로 회귀 없음을 확인"하는 순서로 진행한다.

- [ ] **Step 1: 테스트에서 참조 제거**

`tests/calc.test.js`에서 `countOpenConsiderations` describe 블록을 삭제하고, import에서도 제거:

```js
import {
  initiativeProgress, isTaskDelayed, kpiRate, projectKpiAverage,
  countDelayedTasks, initiativeOpenIssueCount, countOpenIssues, todayStr,
} from '../src/lib/calc.js'
```

(삭제 대상 블록)

```js
describe('countOpenConsiderations', () => {
  it('해결 상태가 아닌 건만 센다', () => {
    const p = { considerations: [
      { status: '열림' }, { status: '대응중' }, { status: '해결' },
    ] }
    expect(countOpenConsiderations(p)).toBe(2)
  })
})
```

`tests/app.test.jsx`의 fixture에서 `considerations: []` 제거 — 기존:

```js
const sample = {
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [], initiatives: [], operations: [], considerations: [],
}
```

교체:

```js
const sample = {
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [], initiatives: [], operations: [],
}
```

- [ ] **Step 2: 구현에서 죽은 코드 제거**

`src/lib/calc.js`에서 아래 함수를 삭제한다:

```js
export function countOpenConsiderations(project) {
  return (project.considerations ?? []).filter((c) => c.status !== '해결').length
}
```

`src/styles.css`에서 `/* ===== 고려사항 ===== */`로 시작하는 블록(약 350~370번째 줄, `.consideration`, `.consideration.sev-*`, `.consideration-head`, `.resolved-section` 정의 앞부분, `.badge.sev-*`까지)을 아래로 교체한다:

```css
/* ===== 쟁점 ===== */
.issue-log { margin-top: 16px; padding-top: 14px; border-top: 1px solid #f0f0f2; }
.issue-log-head { font-size: 9.5px; font-weight: 600; letter-spacing: 1.4px; text-transform: uppercase; color: #86868b; margin-bottom: 10px; }
.issue-card {
  background: #fff; border-left: 4px solid #d2d2d7;
  border-radius: 0 12px 12px 0; padding: 12px 16px; margin-bottom: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
  transition: outline .1s;
}
.issue-card.imp-high { border-left-color: #ff3b30; }
.issue-card.imp-mid  { border-left-color: #ff9f0a; }
.issue-card.imp-low  { border-left-color: #d2d2d7; }
.issue-card.drag-over { outline: 2px solid #0071e3; outline-offset: -2px; }
.issue-card-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.issue-content { margin: 0; flex: 1; font-size: 13px; font-weight: 600; color: #1d1d1f; }
.issue-card p { margin: 8px 0 0; font-size: 13px; color: #6e6e73; line-height: 1.6; }
.issue-card .response { color: #1d4ed8; }
.issue-card .meta { color: #86868b; font-size: 11px; }
.resolved-section { margin-top: 20px; opacity: .7; }

/* 중요도 badge */
.badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; border: 1px solid; flex-shrink: 0; }
.badge.imp-high { background: #fff1f0; color: #cf1124; border-color: #ffc9c9; }
.badge.imp-mid  { background: #fff8f0; color: #c05621; border-color: #ffd8a8; }
.badge.imp-low  { background: #f8f9fa; color: #495057; border-color: #dee2e6; }
```

(기존 `/* ===== 고려사항 ===== */`부터 `.badge.sev-low {...}`까지 전체를 위 블록으로 대체 — `.resolved-section`은 다른 곳에서 재사용되므로 유지)

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (전체)

- [ ] **Step 4: 참조 누락 확인**

Run: `grep -rn "consideration" src/ tests/ --include="*.jsx" --include="*.js" --include="*.css" -i`
Expected: 결과 없음 (문자열 "consideration" 관련 코드가 완전히 제거되었는지 최종 확인)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/calc.js tests/calc.test.js tests/app.test.jsx src/styles.css
git commit -m "chore: 고려사항 관련 죽은 코드·스타일 제거"
```

---

### Task 7: 빌드 및 최종 검증

**Files:** 없음 (코드 변경 없이 검증만 수행)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: PASS (전체)

- [ ] **Step 2: 프로덕션 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 `dist/` 생성 완료

- [ ] **Step 3: 로컬 서버로 수동 확인 (선택, 가능하면 수행)**

Run: `npm run dev` 로 서버 기동 후 브라우저에서:
1. 프로젝트 상세 진입 → 중점수행과제 탭에 "고려사항" 탭이 없는지 확인
2. 과제 카드를 펼쳐 "+ 쟁점 추가"로 쟁점을 추가하고 목록에 나타나는지 확인
3. 쟁점 카드를 드래그해 순서를 바꿔보고 새로고침 후에도 순서가 유지되는지 확인 (자동 저장 디바운스 0.5초 대기)
4. 상태를 "해결"로 바꾸면 목록에서 사라지고 "해결됨 N건 보기"에서 확인되는지 점검

Expected: 위 4가지 모두 스펙대로 동작

이 단계는 코드 변경이 없으므로 커밋하지 않는다.

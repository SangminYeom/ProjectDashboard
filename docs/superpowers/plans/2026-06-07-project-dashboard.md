# 프로젝트 대시보드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여러 프로젝트의 KPI·중점수행과제(간트)·운영업무·고려사항을 관리하는 개인용 로컬 웹 대시보드.

**Architecture:** React SPA(Vite 빌드)가 전체 데이터를 메모리에 보유하고, 변경 시 0.5초 디바운스 후 Express 서버의 `PUT /api/projects`로 전체 저장. 서버는 `data/projects.json`에 원자적으로 기록하고 일자별 백업(7일치)을 유지. 진척률·지연·달성률은 순수 함수(`src/lib/calc.js`)로 자동 계산.

**Tech Stack:** React 18, Vite 5, Express 4, Vitest + Testing Library + supertest. 간트차트는 라이브러리 없이 CSS 직접 렌더링.

**참고 스펙:** `docs/superpowers/specs/2026-06-07-project-dashboard-design.md`

---

## 파일 구조 (최종 목표)

```
ProjectDashboard/
├─ server.js                          Express: 정적 서빙 + API (포트 3000)
├─ server/storage.js                  원자적 저장·백업 로테이션·복구 로드
├─ data/                              (gitignore — 사용자 데이터, OneDrive 동기화)
│  ├─ projects.json
│  └─ backups/YYYY-MM-DD.json
├─ index.html / vite.config.js / package.json
├─ src/
│  ├─ main.jsx / App.jsx / styles.css / api.js
│  ├─ lib/calc.js                     순수 계산 함수
│  ├─ pages/Home.jsx                  프로젝트 카드 그리드
│  ├─ pages/Project.jsx               KPI 바 + 탭 3개
│  └─ components/
│     ├─ Modal.jsx / KpiBar.jsx / Gantt.jsx
│     ├─ Initiatives.jsx / OperationsTable.jsx / ConsiderationLog.jsx
└─ tests/ (구조 미러링)
```

데이터 모델은 스펙 문서의 "데이터 모델" 섹션 그대로. 모든 id는 `crypto.randomUUID()`.

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles.css`, `tests/setup.js`, `tests/app.test.jsx`
- Modify: `.gitignore`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "project-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "npm run build && node server.js",
    "serve": "node server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.19.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^24.0.0",
    "supertest": "^7.0.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: vite.config.js 작성**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
  },
})
```

- [ ] **Step 3: index.html 작성**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>프로젝트 대시보드</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 4: src/main.jsx, src/App.jsx(임시), src/styles.css(빈 파일), tests/setup.js 작성**

`src/main.jsx`:
```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)
```

`src/App.jsx` (Task 14에서 교체될 임시 버전):
```jsx
export default function App() {
  return <h1>프로젝트 대시보드</h1>
}
```

`src/styles.css`: 빈 파일로 생성 (Task 15에서 작성).

`tests/setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: 스모크 테스트 작성 — tests/app.test.jsx**

```jsx
import { render, screen } from '@testing-library/react'
import App from '../src/App.jsx'

it('앱이 렌더링된다', () => {
  render(<App />)
  expect(screen.getByText('프로젝트 대시보드')).toBeInTheDocument()
})
```

- [ ] **Step 6: .gitignore에 data/ 추가**

`.gitignore`를 아래 내용으로 교체:
```
node_modules/
dist/
.superpowers/
data/
```

- [ ] **Step 7: 설치 및 검증**

Run: `npm install`
Expected: 에러 없이 완료

Run: `npm test`
Expected: 1 passed

Run: `npm run build`
Expected: `dist/` 생성, 빌드 성공

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src tests .gitignore
git commit -m "chore: React+Vite+Express 프로젝트 스캐폴딩"
```

---

### Task 2: 계산 로직 (src/lib/calc.js)

**Files:**
- Create: `src/lib/calc.js`
- Test: `tests/calc.test.js`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/calc.test.js**

```js
import { describe, it, expect } from 'vitest'
import {
  initiativeProgress, isTaskDelayed, kpiRate, projectKpiAverage,
  countDelayedTasks, countOpenConsiderations, todayStr,
} from '../src/lib/calc.js'

describe('initiativeProgress', () => {
  it('태스크 진척률의 평균을 반올림해 반환한다', () => {
    const init = { tasks: [{ progress: 100 }, { progress: 60 }, { progress: 21 }] }
    expect(initiativeProgress(init)).toBe(60) // (100+60+21)/3 = 60.33 → 60
  })
  it('태스크가 없으면 0', () => {
    expect(initiativeProgress({ tasks: [] })).toBe(0)
  })
})

describe('isTaskDelayed', () => {
  const today = '2026-06-07'
  it('종료일이 지났고 진척률 < 100이면 지연', () => {
    expect(isTaskDelayed({ endDate: '2026-06-01', progress: 80 }, today)).toBe(true)
  })
  it('종료일이 지났어도 100%면 지연 아님', () => {
    expect(isTaskDelayed({ endDate: '2026-06-01', progress: 100 }, today)).toBe(false)
  })
  it('종료일이 오늘이면 지연 아님', () => {
    expect(isTaskDelayed({ endDate: '2026-06-07', progress: 0 }, today)).toBe(false)
  })
  it('종료일이 미래면 지연 아님', () => {
    expect(isTaskDelayed({ endDate: '2026-12-31', progress: 0 }, today)).toBe(false)
  })
})

describe('kpiRate', () => {
  it('수치형: current/target × 100 반올림', () => {
    expect(kpiRate({ type: 'numeric', target: 10, current: 7 })).toBe(70)
  })
  it('target이 0이면 null', () => {
    expect(kpiRate({ type: 'numeric', target: 0, current: 5 })).toBe(null)
  })
  it('정성형이면 null', () => {
    expect(kpiRate({ type: 'qualitative', status: '순항' })).toBe(null)
  })
})

describe('projectKpiAverage', () => {
  it('수치형 KPI만 평균 (정성형 제외)', () => {
    const p = { kpis: [
      { type: 'numeric', target: 10, current: 7 },   // 70
      { type: 'numeric', target: 100, current: 90 }, // 90
      { type: 'qualitative', status: '순항' },
    ] }
    expect(projectKpiAverage(p)).toBe(80)
  })
  it('수치형 KPI가 없으면 null', () => {
    expect(projectKpiAverage({ kpis: [{ type: 'qualitative', status: '달성' }] })).toBe(null)
    expect(projectKpiAverage({ kpis: [] })).toBe(null)
  })
})

describe('countDelayedTasks', () => {
  it('모든 과제의 지연 태스크 수를 합산', () => {
    const p = { initiatives: [
      { tasks: [{ endDate: '2026-01-01', progress: 50 }, { endDate: '2026-12-31', progress: 0 }] },
      { tasks: [{ endDate: '2026-02-01', progress: 99 }] },
    ] }
    expect(countDelayedTasks(p, '2026-06-07')).toBe(2)
  })
})

describe('countOpenConsiderations', () => {
  it('해결 상태가 아닌 건만 센다', () => {
    const p = { considerations: [
      { status: '열림' }, { status: '대응중' }, { status: '해결' },
    ] }
    expect(countOpenConsiderations(p)).toBe(2)
  })
})

describe('todayStr', () => {
  it('YYYY-MM-DD 형식으로 반환', () => {
    expect(todayStr(new Date('2026-06-07T10:30:00'))).toBe('2026-06-07')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/calc.test.js`
Expected: FAIL — "Failed to load ../src/lib/calc.js" (파일 없음)

- [ ] **Step 3: 구현 — src/lib/calc.js**

```js
// 진척률·지연·달성률 계산 (순수 함수)

export function initiativeProgress(initiative) {
  const tasks = initiative.tasks ?? []
  if (tasks.length === 0) return 0
  const sum = tasks.reduce((acc, t) => acc + (t.progress ?? 0), 0)
  return Math.round(sum / tasks.length)
}

export function isTaskDelayed(task, today) {
  return task.endDate < today && (task.progress ?? 0) < 100
}

export function kpiRate(kpi) {
  if (kpi.type !== 'numeric' || !kpi.target) return null
  return Math.round((kpi.current / kpi.target) * 100)
}

export function projectKpiAverage(project) {
  const rates = (project.kpis ?? []).map(kpiRate).filter((r) => r !== null)
  if (rates.length === 0) return null
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
}

export function countDelayedTasks(project, today) {
  return (project.initiatives ?? [])
    .flatMap((i) => i.tasks ?? [])
    .filter((t) => isTaskDelayed(t, today)).length
}

export function countOpenConsiderations(project) {
  return (project.considerations ?? []).filter((c) => c.status !== '해결').length
}

export function todayStr(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

(ISO `YYYY-MM-DD` 문자열은 사전순 비교 = 날짜순 비교이므로 `<` 비교가 안전하다.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/calc.test.js`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/calc.js tests/calc.test.js
git commit -m "feat: 진척률·지연·KPI 달성률 계산 함수"
```

---

### Task 3: 저장소 모듈 (server/storage.js)

**Files:**
- Create: `server/storage.js`
- Test: `tests/storage.test.js`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/storage.test.js**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadData, saveData, DEFAULT_DATA } from '../server/storage.js'

let dir, dataPath, backupDir

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-'))
  dataPath = path.join(dir, 'projects.json')
  backupDir = path.join(dir, 'backups')
})

const sample = { projects: [{ id: 'p1', name: '테스트' }] }

describe('saveData', () => {
  it('JSON을 저장하고 다시 읽을 수 있다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(JSON.parse(fs.readFileSync(dataPath, 'utf8'))).toEqual(sample)
  })
  it('임시 파일을 남기지 않는다 (원자적 저장)', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(fs.existsSync(dataPath + '.tmp')).toBe(false)
  })
  it('일자별 백업 파일을 만든다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(fs.existsSync(path.join(backupDir, '2026-06-07.json'))).toBe(true)
  })
  it('백업은 최근 7일치만 유지한다', () => {
    for (let d = 1; d <= 9; d++) {
      saveData(dataPath, sample, backupDir, `2026-06-0${d}`)
    }
    const files = fs.readdirSync(backupDir).sort()
    expect(files).toHaveLength(7)
    expect(files[0]).toBe('2026-06-03.json') // 01, 02는 삭제됨
  })
})

describe('loadData', () => {
  it('파일이 없으면 기본 데이터를 반환한다', () => {
    expect(loadData(dataPath, backupDir)).toEqual({ data: DEFAULT_DATA, recoveredFrom: null })
  })
  it('정상 파일을 읽는다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(loadData(dataPath, backupDir)).toEqual({ data: sample, recoveredFrom: null })
  })
  it('손상된 파일이면 최신 백업에서 복구한다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-06')
    fs.writeFileSync(dataPath, '{ 깨진 JSON')
    const result = loadData(dataPath, backupDir)
    expect(result.data).toEqual(sample)
    expect(result.recoveredFrom).toBe('2026-06-06.json')
  })
  it('손상됐고 백업도 없으면 기본 데이터', () => {
    fs.writeFileSync(dataPath, '{ 깨진 JSON')
    expect(loadData(dataPath, backupDir)).toEqual({ data: DEFAULT_DATA, recoveredFrom: null })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/storage.test.js`
Expected: FAIL — "Failed to load ../server/storage.js"

- [ ] **Step 3: 구현 — server/storage.js**

```js
import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_DATA = { projects: [] }

export function loadData(dataPath, backupDir) {
  if (!fs.existsSync(dataPath)) {
    return { data: structuredClone(DEFAULT_DATA), recoveredFrom: null }
  }
  try {
    return { data: JSON.parse(fs.readFileSync(dataPath, 'utf8')), recoveredFrom: null }
  } catch {
    const latest = latestBackup(backupDir)
    if (latest) {
      const data = JSON.parse(fs.readFileSync(path.join(backupDir, latest), 'utf8'))
      return { data, recoveredFrom: latest }
    }
    return { data: structuredClone(DEFAULT_DATA), recoveredFrom: null }
  }
}

function latestBackup(backupDir) {
  if (!backupDir || !fs.existsSync(backupDir)) return null
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).sort()
  return files.at(-1) ?? null
}

export function saveData(dataPath, data, backupDir, today) {
  const json = JSON.stringify(data, null, 2)
  const tmp = dataPath + '.tmp'
  fs.mkdirSync(path.dirname(dataPath), { recursive: true })
  fs.writeFileSync(tmp, json)
  fs.renameSync(tmp, dataPath) // 원자적 교체 — 쓰기 중 중단돼도 원본 보존
  writeBackup(backupDir, json, today)
}

function writeBackup(backupDir, json, today) {
  fs.mkdirSync(backupDir, { recursive: true })
  fs.writeFileSync(path.join(backupDir, `${today}.json`), json)
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).sort()
  for (const f of files.slice(0, Math.max(0, files.length - 7))) {
    fs.unlinkSync(path.join(backupDir, f))
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/storage.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add server/storage.js tests/storage.test.js
git commit -m "feat: 원자적 저장·일자별 백업(7일)·손상 복구 저장소 모듈"
```

---

### Task 4: Express 서버 (server.js)

**Files:**
- Create: `server.js`
- Test: `tests/server.test.js`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/server.test.js**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../server.js'

let app

beforeEach(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-srv-'))
  app = createApp({
    dataPath: path.join(dir, 'projects.json'),
    backupDir: path.join(dir, 'backups'),
  })
})

describe('GET /api/projects', () => {
  it('초기 상태: 빈 프로젝트 목록', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ projects: [], recoveredFrom: null })
  })
})

describe('PUT /api/projects', () => {
  it('저장 후 GET으로 동일 데이터 반환', async () => {
    const projects = [{ id: 'p1', name: '테스트 프로젝트' }]
    const put = await request(app).put('/api/projects').send({ projects })
    expect(put.status).toBe(204)
    const res = await request(app).get('/api/projects')
    expect(res.body.projects).toEqual(projects)
  })
  it('projects가 배열이 아니면 400', async () => {
    const res = await request(app).put('/api/projects').send({ projects: '엉뚱한 값' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/server.test.js`
Expected: FAIL — "Failed to load ../server.js"

- [ ] **Step 3: 구현 — server.js**

```js
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadData, saveData } from './server/storage.js'
import { todayStr } from './src/lib/calc.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp({ dataPath, backupDir }) {
  const app = express()
  app.use(express.json({ limit: '10mb' }))

  app.get('/api/projects', (req, res) => {
    const { data, recoveredFrom } = loadData(dataPath, backupDir)
    res.json({ ...data, recoveredFrom })
  })

  app.put('/api/projects', (req, res) => {
    const { projects } = req.body
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'projects 배열이 필요합니다' })
    }
    try {
      saveData(dataPath, { projects }, backupDir, todayStr())
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.use(express.static(path.join(__dirname, 'dist')))
  return app
}

// 직접 실행 시에만 서버 기동 (테스트에서 import하면 기동 안 함)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp({
    dataPath: path.join(__dirname, 'data', 'projects.json'),
    backupDir: path.join(__dirname, 'data', 'backups'),
  })
  app.listen(3000, () => console.log('대시보드 실행 중: http://localhost:3000'))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/server.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add server.js tests/server.test.js
git commit -m "feat: Express API 서버 (GET/PUT /api/projects + 정적 서빙)"
```

---

### Task 5: 프론트 API 클라이언트 (src/api.js)

**Files:**
- Create: `src/api.js`
- Test: `tests/api.test.js`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/api.test.js**

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadProjects, createDebouncedSave } from '../src/api.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('loadProjects', () => {
  it('GET /api/projects 응답을 반환한다', async () => {
    vi.useRealTimers()
    const payload = { projects: [{ id: 'p1' }], recoveredFrom: null }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) }))
    expect(await loadProjects()).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith('/api/projects')
  })
  it('응답 실패 시 throw', async () => {
    vi.useRealTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(loadProjects()).rejects.toThrow('500')
  })
})

describe('createDebouncedSave', () => {
  it('연속 호출은 마지막 데이터 한 번만 PUT한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const save = createDebouncedSave({ delay: 500 })
    save([{ id: 'a' }])
    save([{ id: 'b' }])
    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ projects: [{ id: 'b' }] })
  })
  it('성공 시 onError(null), 실패 시 onError(에러) 호출', async () => {
    const onError = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const save = createDebouncedSave({ delay: 100, onError })
    save([])
    await vi.advanceTimersByTimeAsync(100)
    expect(onError).toHaveBeenCalledWith(null)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('네트워크 오류')))
    save([])
    await vi.advanceTimersByTimeAsync(100)
    expect(onError.mock.calls.at(-1)[0]).toBeInstanceOf(Error)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/api.test.js`
Expected: FAIL — "Failed to load ../src/api.js"

- [ ] **Step 3: 구현 — src/api.js**

```js
export async function loadProjects() {
  const res = await fetch('/api/projects')
  if (!res.ok) throw new Error(`로드 실패: ${res.status}`)
  return res.json() // { projects, recoveredFrom }
}

// 변경 시마다 호출하면 delay 후 마지막 데이터만 저장
export function createDebouncedSave({ delay = 500, onError } = {}) {
  let timer = null
  return function save(projects) {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projects }),
        })
        if (!res.ok) throw new Error(`저장 실패: ${res.status}`)
        onError?.(null)
      } catch (err) {
        onError?.(err)
      }
    }, delay)
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/api.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/api.js tests/api.test.js
git commit -m "feat: API 클라이언트 (로드 + 디바운스 자동저장)"
```

---

### Task 6: Modal 컴포넌트

**Files:**
- Create: `src/components/Modal.jsx`
- Test: `tests/components/modal.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/components/modal.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Modal from '../../src/components/Modal.jsx'

it('제목과 내용을 렌더링한다', () => {
  render(<Modal title="테스트 모달" onClose={() => {}}><p>내용</p></Modal>)
  expect(screen.getByRole('dialog', { name: '테스트 모달' })).toBeInTheDocument()
  expect(screen.getByText('내용')).toBeInTheDocument()
})

it('배경 클릭 시 닫히고, 내부 클릭 시 닫히지 않는다', () => {
  const onClose = vi.fn()
  const { container } = render(<Modal title="t" onClose={onClose}><p>내용</p></Modal>)
  fireEvent.click(screen.getByText('내용'))
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(container.querySelector('.modal-backdrop'))
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('닫기 버튼으로 닫힌다', () => {
  const onClose = vi.fn()
  render(<Modal title="t" onClose={onClose}><p>내용</p></Modal>)
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/modal.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/components/Modal.jsx**

```jsx
export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/modal.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.jsx tests/components/modal.test.jsx
git commit -m "feat: Modal 컴포넌트"
```

---

### Task 7: KPI 바 (src/components/KpiBar.jsx)

**Files:**
- Create: `src/components/KpiBar.jsx`
- Test: `tests/components/kpibar.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/components/kpibar.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import KpiBar from '../../src/components/KpiBar.jsx'

const numericKpi = { id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }
const qualKpi = { id: 'k2', name: '품질', type: 'qualitative', status: '순항' }

it('수치형 KPI는 달성률을, 정성형은 상태를 표시한다', () => {
  render(<KpiBar kpis={[numericKpi, qualKpi]} onChange={() => {}} />)
  expect(screen.getByText('70%')).toBeInTheDocument()
  expect(screen.getByLabelText('품질 상태')).toHaveValue('순항')
})

it('현재값 인라인 수정 시 onChange가 호출된다', () => {
  const onChange = vi.fn()
  render(<KpiBar kpis={[numericKpi]} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('매출 현재값'), { target: { value: '8' } })
  expect(onChange).toHaveBeenCalledWith([{ ...numericKpi, current: 8 }])
})

it('KPI 추가 폼으로 수치형 KPI를 추가할 수 있다', () => {
  const onChange = vi.fn()
  render(<KpiBar kpis={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ KPI'))
  fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '신규고객' } })
  fireEvent.change(screen.getByLabelText(/목표값/), { target: { value: '100' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).toHaveBeenCalledTimes(1)
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ name: '신규고객', type: 'numeric', target: 100, current: 0 })
  expect(added.id).toBeTruthy()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/kpibar.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/components/KpiBar.jsx**

```jsx
import { useState } from 'react'
import Modal from './Modal.jsx'
import { kpiRate } from '../lib/calc.js'

const QUAL_STATUS = ['달성', '순항', '주의', '미달']
const QUAL_ICON = { 달성: '🏆', 순항: '🟢', 주의: '🟡', 미달: '🔴' }

export default function KpiBar({ kpis, onChange }) {
  const [adding, setAdding] = useState(false)

  function update(id, patch) {
    onChange(kpis.map((k) => (k.id === id ? { ...k, ...patch } : k)))
  }

  return (
    <section className="kpi-bar">
      {kpis.map((k) => (
        <div key={k.id} className="kpi-card">
          <div className="kpi-head">
            <strong>{k.name}</strong>
            <button className="icon-btn" aria-label={`${k.name} 삭제`}
              onClick={() => confirm(`KPI '${k.name}'을(를) 삭제할까요?`) && onChange(kpis.filter((x) => x.id !== k.id))}>✕</button>
          </div>
          {k.type === 'numeric' ? (
            <>
              <div className="kpi-rate">{kpiRate(k) ?? 0}%</div>
              <div className="kpi-detail">
                <input type="number" value={k.current} aria-label={`${k.name} 현재값`}
                  onChange={(e) => update(k.id, { current: Number(e.target.value) })} />
                <span>/ {k.target}{k.unit}</span>
              </div>
              <div className="gauge">
                <div className="gauge-fill" style={{ width: `${Math.min(100, kpiRate(k) ?? 0)}%` }} />
              </div>
            </>
          ) : (
            <select value={k.status} aria-label={`${k.name} 상태`}
              onChange={(e) => update(k.id, { status: e.target.value })}>
              {QUAL_STATUS.map((s) => <option key={s} value={s}>{QUAL_ICON[s]} {s}</option>)}
            </select>
          )}
        </div>
      ))}
      <button className="kpi-card add-card" onClick={() => setAdding(true)}>+ KPI</button>
      {adding && <KpiForm onSubmit={(kpi) => { onChange([...kpis, { id: crypto.randomUUID(), ...kpi }]); setAdding(false) }}
        onClose={() => setAdding(false)} />}
    </section>
  )
}

function KpiForm({ onSubmit, onClose }) {
  const [type, setType] = useState('numeric')
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit(type === 'numeric'
      ? { name: f.get('name'), type, target: Number(f.get('target')), current: Number(f.get('current')), unit: f.get('unit') }
      : { name: f.get('name'), type, status: f.get('status') })
  }
  return (
    <Modal title="KPI 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>이름 <input name="name" required /></label>
        <label>유형
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="numeric">수치형 (목표/현재)</option>
            <option value="qualitative">정성형 (상태)</option>
          </select>
        </label>
        {type === 'numeric' ? (
          <>
            <label>목표값 <input name="target" type="number" step="any" required /></label>
            <label>현재값 <input name="current" type="number" step="any" defaultValue="0" required /></label>
            <label>단위 <input name="unit" placeholder="억, %, 건 …" /></label>
          </>
        ) : (
          <label>상태
            <select name="status" defaultValue="순항">
              {QUAL_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/kpibar.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/KpiBar.jsx tests/components/kpibar.test.jsx
git commit -m "feat: KPI 바 (수치형 게이지 + 정성형 상태, 인라인 수정)"
```

---

### Task 8: 간트차트 (src/components/Gantt.jsx)

**Files:**
- Create: `src/components/Gantt.jsx`
- Test: `tests/components/gantt.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/components/gantt.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Gantt from '../../src/components/Gantt.jsx'

const tasks = [
  { id: 't1', name: '서버 이전', startDate: '2026-01-01', endDate: '2026-03-31', progress: 100, status: '완료' },
  { id: 't2', name: '모니터링 구축', startDate: '2026-04-01', endDate: '2026-05-31', progress: 20, status: '진행중' },
]

it('태스크가 없으면 안내 문구를 표시한다', () => {
  render(<Gantt tasks={[]} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />)
  expect(screen.getByText('태스크가 없습니다.')).toBeInTheDocument()
})

it('지연 태스크에 ⚠ 지연 표시, 완료 태스크는 상태 그대로', () => {
  render(<Gantt tasks={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />)
  expect(screen.getByText('⚠ 지연')).toBeInTheDocument()  // t2: 종료일 지남 + 20%
  expect(screen.getByText('완료')).toBeInTheDocument()     // t1
})

it('진척률 인라인 수정 시 onUpdate 호출 (0~100 범위로 보정)', () => {
  const onUpdate = vi.fn()
  render(<Gantt tasks={tasks} onUpdate={onUpdate} onRemove={() => {}} today="2026-06-07" />)
  fireEvent.change(screen.getByLabelText('모니터링 구축 진척률'), { target: { value: '150' } })
  expect(onUpdate).toHaveBeenCalledWith('t2', { progress: 100 })
})

it('막대 위치가 기간에 비례한다', () => {
  const { container } = render(
    <Gantt tasks={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  const bars = container.querySelectorAll('.gantt-bar')
  expect(bars[0].style.left).toBe('0%') // 첫 태스크는 범위 시작점
  expect(parseFloat(bars[1].style.left)).toBeGreaterThan(50) // 4월 시작은 중반 이후
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/gantt.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/components/Gantt.jsx**

```jsx
import { isTaskDelayed, todayStr } from '../lib/calc.js'

const toMs = (d) => new Date(d + 'T00:00:00').getTime()

export default function Gantt({ tasks, onUpdate, onRemove, today = todayStr() }) {
  if (tasks.length === 0) return <p className="empty">태스크가 없습니다.</p>

  const minMs = Math.min(...tasks.map((t) => toMs(t.startDate)))
  const maxMs = Math.max(...tasks.map((t) => toMs(t.endDate)), toMs(today))
  const span = Math.max(maxMs - minMs, 1)
  const leftPct = (d) => ((toMs(d) - minMs) / span) * 100
  const widthPct = (t) => Math.max(((toMs(t.endDate) - toMs(t.startDate)) / span) * 100, 1)

  return (
    <div className="gantt">
      {tasks.map((t) => {
        const delayed = isTaskDelayed(t, today)
        return (
          <div key={t.id} className="gantt-row">
            <span className="task-name">{t.name}</span>
            <span className="task-progress">
              <input type="number" min="0" max="100" value={t.progress} aria-label={`${t.name} 진척률`}
                onChange={(e) => onUpdate(t.id, { progress: Math.max(0, Math.min(100, Number(e.target.value))) })} />%
            </span>
            <span className="gantt-track">
              <span
                className={`gantt-bar ${t.progress === 100 ? 'done' : delayed ? 'delayed' : 'active'}`}
                style={{ left: `${leftPct(t.startDate)}%`, width: `${widthPct(t)}%` }}
                title={`${t.startDate} ~ ${t.endDate}`}
              />
              <span className="today-line" style={{ left: `${leftPct(today)}%` }} title={`오늘 ${today}`} />
            </span>
            <span className={`task-status ${delayed ? 'delayed' : ''}`}>{delayed ? '⚠ 지연' : t.status}</span>
            <button className="icon-btn" aria-label={`${t.name} 삭제`}
              onClick={() => confirm(`태스크 '${t.name}'을(를) 삭제할까요?`) && onRemove(t.id)}>✕</button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/gantt.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Gantt.jsx tests/components/gantt.test.jsx
git commit -m "feat: CSS 간트차트 (오늘 기준선·지연 경고·인라인 진척 수정)"
```

---

### Task 9: 중점수행과제 탭 (src/components/Initiatives.jsx)

**Files:**
- Create: `src/components/Initiatives.jsx`
- Test: `tests/components/initiatives.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/components/initiatives.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Initiatives from '../../src/components/Initiatives.jsx'

const initiatives = [{
  id: 'i1', name: '인프라 전환', description: '', owner: '홍길동',
  tasks: [
    { id: 't1', name: '서버 이전', startDate: '2026-01-01', endDate: '2026-03-31', progress: 100, status: '완료' },
    { id: 't2', name: 'DB 이전', startDate: '2026-03-01', endDate: '2026-08-31', progress: 60, status: '진행중' },
  ],
}]

it('과제명·자동 계산 진척률·담당자를 표시한다', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('인프라 전환')).toBeInTheDocument()
  expect(screen.getByText(/진척 80%/)).toBeInTheDocument() // (100+60)/2
  expect(screen.getByText(/담당 홍길동/)).toBeInTheDocument()
})

it('과제 추가 폼으로 새 과제를 추가한다', () => {
  const onChange = vi.fn()
  render(<Initiatives initiatives={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 과제 추가'))
  fireEvent.change(screen.getByLabelText(/과제명/), { target: { value: '데이터 표준화' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ name: '데이터 표준화', tasks: [] })
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
  expect(updated.tasks).toHaveLength(3)
  expect(updated.tasks[2]).toMatchObject({ name: '모니터링', progress: 0, status: '예정' })
})

it('과제 헤더 클릭으로 접고 펼친다', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('서버 이전')).toBeInTheDocument()
  fireEvent.click(screen.getByText('인프라 전환'))
  expect(screen.queryByText('서버 이전')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/initiatives.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/components/Initiatives.jsx**

```jsx
import { useState } from 'react'
import Modal from './Modal.jsx'
import Gantt from './Gantt.jsx'
import { initiativeProgress } from '../lib/calc.js'

const TASK_STATUS = ['예정', '진행중', '완료', '보류']

export default function Initiatives({ initiatives, onChange }) {
  const [addingInit, setAddingInit] = useState(false)
  const [taskFormFor, setTaskFormFor] = useState(null) // 과제 id
  const [collapsed, setCollapsed] = useState({})

  function updateInit(id, updater) {
    onChange(initiatives.map((i) => (i.id === id ? updater(i) : i)))
  }

  return (
    <section>
      {initiatives.map((init) => (
        <div key={init.id} className="initiative-card">
          <div className="initiative-head"
            onClick={() => setCollapsed({ ...collapsed, [init.id]: !collapsed[init.id] })}>
            <strong>{init.name}</strong>
            <span className="meta">
              진척 {initiativeProgress(init)}% · 태스크 {init.tasks.length}건
              {init.owner ? ` · 담당 ${init.owner}` : ''}
            </span>
            <button className="icon-btn" aria-label={`${init.name} 삭제`}
              onClick={(e) => {
                e.stopPropagation()
                confirm(`과제 '${init.name}'을(를) 삭제할까요?`) && onChange(initiatives.filter((x) => x.id !== init.id))
              }}>✕</button>
          </div>
          {!collapsed[init.id] && (
            <div className="initiative-body">
              <Gantt
                tasks={init.tasks}
                onUpdate={(taskId, patch) => updateInit(init.id,
                  (i) => ({ ...i, tasks: i.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }))}
                onRemove={(taskId) => updateInit(init.id,
                  (i) => ({ ...i, tasks: i.tasks.filter((t) => t.id !== taskId) }))}
              />
              <button className="link-btn" onClick={() => setTaskFormFor(init.id)}>+ 태스크 추가</button>
            </div>
          )}
        </div>
      ))}
      <button className="btn-primary" onClick={() => setAddingInit(true)}>+ 과제 추가</button>

      {addingInit && (
        <InitiativeForm
          onSubmit={(form) => {
            onChange([...initiatives, { id: crypto.randomUUID(), ...form, tasks: [] }])
            setAddingInit(false)
          }}
          onClose={() => setAddingInit(false)}
        />
      )}
      {taskFormFor && (
        <TaskForm
          onSubmit={(task) => {
            updateInit(taskFormFor, (i) => ({ ...i, tasks: [...i.tasks, { id: crypto.randomUUID(), ...task }] }))
            setTaskFormFor(null)
          }}
          onClose={() => setTaskFormFor(null)}
        />
      )}
    </section>
  )
}

function InitiativeForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({ name: f.get('name'), description: f.get('description'), owner: f.get('owner') })
  }
  return (
    <Modal title="과제 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>과제명 <input name="name" required /></label>
        <label>설명 <textarea name="description" /></label>
        <label>담당 <input name="owner" /></label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}

function TaskForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'),
      startDate: f.get('startDate'),
      endDate: f.get('endDate'),
      progress: 0,
      status: f.get('status'),
    })
  }
  return (
    <Modal title="태스크 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>태스크명 <input name="name" required /></label>
        <label>시작일 <input name="startDate" type="date" required /></label>
        <label>종료일 <input name="endDate" type="date" required /></label>
        <label>상태
          <select name="status" defaultValue="예정">
            {TASK_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/initiatives.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Initiatives.jsx tests/components/initiatives.test.jsx
git commit -m "feat: 중점수행과제 탭 (과제 카드 + 간트 + 태스크 추가)"
```

---

### Task 10: 운영업무 탭 (src/components/OperationsTable.jsx)

**Files:**
- Create: `src/components/OperationsTable.jsx`
- Test: `tests/components/operations.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/components/operations.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import OperationsTable from '../../src/components/OperationsTable.jsx'

const operations = [
  { id: 'o1', name: '주간 보고', cycle: '주', owner: '김OO', status: '정상', lastPerformed: '2026-06-05', memo: '' },
]

it('운영업무 행을 표시한다', () => {
  render(<OperationsTable operations={operations} onChange={() => {}} />)
  expect(screen.getByText('주간 보고')).toBeInTheDocument()
  expect(screen.getByText('2026-06-05')).toBeInTheDocument()
  expect(screen.getByLabelText('주간 보고 상태')).toHaveValue('정상')
})

it('상태 인라인 변경 시 onChange 호출', () => {
  const onChange = vi.fn()
  render(<OperationsTable operations={operations} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('주간 보고 상태'), { target: { value: '이슈' } })
  expect(onChange).toHaveBeenCalledWith([{ ...operations[0], status: '이슈' }])
})

it('"오늘 수행" 버튼이 최근 수행일을 갱신한다', () => {
  const onChange = vi.fn()
  render(<OperationsTable operations={operations} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '주간 보고 오늘 수행' }))
  const updated = onChange.mock.calls[0][0][0]
  expect(updated.lastPerformed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('추가 폼으로 새 운영업무를 추가한다', () => {
  const onChange = vi.fn()
  render(<OperationsTable operations={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 운영업무 추가'))
  fireEvent.change(screen.getByLabelText(/업무명/), { target: { value: '서버 점검' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange.mock.calls[0][0][0]).toMatchObject({ name: '서버 점검', status: '정상' })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/operations.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/components/OperationsTable.jsx**

```jsx
import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const CYCLES = ['일', '주', '월', '분기']
const OP_STATUS = ['정상', '주의', '이슈']
const OP_ICON = { 정상: '🟢', 주의: '🟡', 이슈: '🔴' }

export default function OperationsTable({ operations, onChange }) {
  const [adding, setAdding] = useState(false)

  function update(id, patch) {
    onChange(operations.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  return (
    <section>
      <table className="op-table">
        <thead>
          <tr><th>업무</th><th>주기</th><th>담당</th><th>상태</th><th>최근 수행</th><th>메모</th><th /></tr>
        </thead>
        <tbody>
          {operations.map((o) => (
            <tr key={o.id}>
              <td>{o.name}</td>
              <td>{o.cycle}</td>
              <td>{o.owner}</td>
              <td>
                <select value={o.status} aria-label={`${o.name} 상태`}
                  onChange={(e) => update(o.id, { status: e.target.value })}>
                  {OP_STATUS.map((s) => <option key={s} value={s}>{OP_ICON[s]} {s}</option>)}
                </select>
              </td>
              <td>
                <span>{o.lastPerformed || '—'}</span>
                <button className="link-btn" aria-label={`${o.name} 오늘 수행`}
                  onClick={() => update(o.id, { lastPerformed: todayStr() })}>오늘 수행</button>
              </td>
              <td>
                <input value={o.memo} aria-label={`${o.name} 메모`}
                  onChange={(e) => update(o.id, { memo: e.target.value })} />
              </td>
              <td>
                <button className="icon-btn" aria-label={`${o.name} 삭제`}
                  onClick={() => confirm(`업무 '${o.name}'을(를) 삭제할까요?`) && onChange(operations.filter((x) => x.id !== o.id))}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {operations.length === 0 && <p className="empty">등록된 운영업무가 없습니다.</p>}
      <button className="btn-primary" onClick={() => setAdding(true)}>+ 운영업무 추가</button>
      {adding && (
        <OperationForm
          onSubmit={(op) => { onChange([...operations, { id: crypto.randomUUID(), ...op }]); setAdding(false) }}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  )
}

function OperationForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'), cycle: f.get('cycle'), owner: f.get('owner'),
      status: '정상', lastPerformed: '', memo: f.get('memo'),
    })
  }
  return (
    <Modal title="운영업무 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>업무명 <input name="name" required /></label>
        <label>주기 <select name="cycle">{CYCLES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>담당 <input name="owner" /></label>
        <label>메모 <input name="memo" /></label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/operations.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/OperationsTable.jsx tests/components/operations.test.jsx
git commit -m "feat: 운영업무 테이블 (인라인 상태·수행일·메모 수정)"
```

---

### Task 11: 고려사항 탭 (src/components/ConsiderationLog.jsx)

**Files:**
- Create: `src/components/ConsiderationLog.jsx`
- Test: `tests/components/considerations.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/components/considerations.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ConsiderationLog from '../../src/components/ConsiderationLog.jsx'

const considerations = [
  { id: 'c1', title: '벤더 계약 지연', content: '', response: '대체 벤더 확보', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null },
  { id: 'c2', title: '인력 이탈 리스크', content: '', response: '', severity: '중간', status: '대응중', createdDate: '2026-05-01', resolvedDate: null },
  { id: 'c3', title: '예산 이슈', content: '', response: '', severity: '낮음', status: '해결', createdDate: '2026-04-01', resolvedDate: '2026-05-15' },
]

it('미해결 건은 표시하고 해결 건은 접어둔다', () => {
  render(<ConsiderationLog considerations={considerations} onChange={() => {}} />)
  expect(screen.getByText('벤더 계약 지연')).toBeInTheDocument()
  expect(screen.getByText('인력 이탈 리스크')).toBeInTheDocument()
  expect(screen.queryByText('예산 이슈')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText(/해결됨 1건 보기/))
  expect(screen.getByText('예산 이슈')).toBeInTheDocument()
})

it('상태를 해결로 바꾸면 resolvedDate가 기록된다', () => {
  const onChange = vi.fn()
  render(<ConsiderationLog considerations={considerations} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('벤더 계약 지연 상태'), { target: { value: '해결' } })
  const updated = onChange.mock.calls[0][0].find((c) => c.id === 'c1')
  expect(updated.status).toBe('해결')
  expect(updated.resolvedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('추가 폼으로 새 고려사항을 등록한다 (기본 상태: 열림)', () => {
  const onChange = vi.fn()
  render(<ConsiderationLog considerations={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 고려사항 추가'))
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '신규 리스크' } })
  fireEvent.change(screen.getByLabelText(/대응안/), { target: { value: '모니터링 강화' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ title: '신규 리스크', response: '모니터링 강화', status: '열림' })
  expect(added.createdDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('중요도 높은 순으로 정렬된다', () => {
  const reversed = [considerations[1], considerations[0]] // 중간, 높음 순으로 입력
  render(<ConsiderationLog considerations={reversed} onChange={() => {}} />)
  const titles = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
  expect(titles).toEqual(['벤더 계약 지연', '인력 이탈 리스크'])
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/components/considerations.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/components/ConsiderationLog.jsx**

```jsx
import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const SEVERITIES = ['높음', '중간', '낮음']
const STATUSES = ['열림', '대응중', '해결']
const SEV_CLASS = { 높음: 'high', 중간: 'mid', 낮음: 'low' }
const SEV_ORDER = { 높음: 0, 중간: 1, 낮음: 2 }

export default function ConsiderationLog({ considerations, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showResolved, setShowResolved] = useState(false)

  const active = considerations.filter((c) => c.status !== '해결')
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
  const resolved = considerations.filter((c) => c.status === '해결')

  function update(id, patch) {
    onChange(considerations.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function setStatus(c, status) {
    update(c.id, { status, resolvedDate: status === '해결' ? todayStr() : null })
  }
  function remove(c) {
    confirm(`'${c.title}'을(를) 삭제할까요?`) && onChange(considerations.filter((x) => x.id !== c.id))
  }

  const card = (c) => (
    <ConsiderationCard key={c.id} c={c} onStatus={setStatus} onEdit={() => setEditing(c)} onRemove={() => remove(c)} />
  )

  return (
    <section className="consideration-log">
      {active.map(card)}
      {active.length === 0 && <p className="empty">미해결 고려사항이 없습니다.</p>}
      <button className="btn-primary" onClick={() => setAdding(true)}>+ 고려사항 추가</button>

      {resolved.length > 0 && (
        <div className="resolved-section">
          <button className="link-btn" onClick={() => setShowResolved(!showResolved)}>
            ✓ 해결됨 {resolved.length}건 {showResolved ? '접기' : '보기'}
          </button>
          {showResolved && resolved.map(card)}
        </div>
      )}

      {(adding || editing) && (
        <ConsiderationForm
          initial={editing}
          onSubmit={(form) => {
            if (editing) update(editing.id, form)
            else onChange([...considerations, {
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

function ConsiderationCard({ c, onStatus, onEdit, onRemove }) {
  return (
    <div className={`consideration sev-${SEV_CLASS[c.severity]}`}>
      <div className="consideration-head">
        <span className={`badge sev-${SEV_CLASS[c.severity]}`}>{c.severity}</span>
        <h4>{c.title}</h4>
        <select value={c.status} aria-label={`${c.title} 상태`} onChange={(e) => onStatus(c, e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="icon-btn" onClick={onEdit} aria-label={`${c.title} 편집`}>✏️</button>
        <button className="icon-btn" onClick={onRemove} aria-label={`${c.title} 삭제`}>✕</button>
      </div>
      {c.content && <p>{c.content}</p>}
      {c.response && <p className="response">💡 대응안: {c.response}</p>}
      <p className="meta">등록 {c.createdDate}{c.resolvedDate ? ` · 해결 ${c.resolvedDate}` : ''}</p>
    </div>
  )
}

function ConsiderationForm({ initial, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      title: f.get('title'), content: f.get('content'),
      response: f.get('response'), severity: f.get('severity'),
    })
  }
  return (
    <Modal title={initial ? '고려사항 편집' : '고려사항 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>제목 <input name="title" defaultValue={initial?.title} required /></label>
        <label>내용 <textarea name="content" defaultValue={initial?.content} /></label>
        <label>대응안 <textarea name="response" defaultValue={initial?.response} /></label>
        <label>중요도
          <select name="severity" defaultValue={initial?.severity ?? '중간'}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">저장</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/components/considerations.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ConsiderationLog.jsx tests/components/considerations.test.jsx
git commit -m "feat: 고려사항 이슈 로그 (중요도 정렬·해결 이력 보관)"
```

---

### Task 12: 프로젝트 상세 페이지 (src/pages/Project.jsx)

**Files:**
- Create: `src/pages/Project.jsx`
- Test: `tests/pages/project.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/pages/project.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Project from '../../src/pages/Project.jsx'

const project = {
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
  initiatives: [{ id: 'i1', name: '인프라 전환', description: '', owner: '', tasks: [] }],
  operations: [{ id: 'o1', name: '주간 보고', cycle: '주', owner: '', status: '정상', lastPerformed: '', memo: '' }],
  considerations: [{ id: 'c1', title: '계약 지연', content: '', response: '', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
}

function setup() {
  const onChange = vi.fn()
  const onBack = vi.fn()
  render(<Project project={project} onChange={onChange} onDelete={() => {}} onBack={onBack} />)
  return { onChange, onBack }
}

it('프로젝트명·기간·KPI 바를 표시하고 기본 탭은 중점수행과제', () => {
  setup()
  expect(screen.getByText('차세대 시스템')).toBeInTheDocument()
  expect(screen.getByText('2026-01-01 ~ 2026-12-31')).toBeInTheDocument()
  expect(screen.getByText('70%')).toBeInTheDocument()      // KPI 바
  expect(screen.getByText('인프라 전환')).toBeInTheDocument() // 기본 탭 내용
})

it('탭 전환이 동작한다', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /운영업무/ }))
  expect(screen.getByText('주간 보고')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /고려사항/ }))
  expect(screen.getByText('계약 지연')).toBeInTheDocument()
})

it('뒤로 가기 버튼이 onBack을 호출한다', () => {
  const { onBack } = setup()
  fireEvent.click(screen.getByRole('button', { name: '← 홈' }))
  expect(onBack).toHaveBeenCalled()
})

it('하위 컴포넌트 변경이 onChange(updater)로 전파된다', () => {
  const { onChange } = setup()
  fireEvent.change(screen.getByLabelText('매출 현재값'), { target: { value: '8' } })
  expect(onChange).toHaveBeenCalledTimes(1)
  const updater = onChange.mock.calls[0][0]
  expect(updater(project).kpis[0].current).toBe(8)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/pages/project.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/pages/Project.jsx**

```jsx
import { useState } from 'react'
import KpiBar from '../components/KpiBar.jsx'
import Initiatives from '../components/Initiatives.jsx'
import OperationsTable from '../components/OperationsTable.jsx'
import ConsiderationLog from '../components/ConsiderationLog.jsx'
import { countOpenConsiderations } from '../lib/calc.js'

const TABS = ['중점수행과제', '운영업무', '고려사항']

export default function Project({ project, onChange, onDelete, onBack }) {
  const [tab, setTab] = useState(TABS[0])
  const counts = {
    중점수행과제: project.initiatives.length,
    운영업무: project.operations.length,
    고려사항: countOpenConsiderations(project),
  }

  return (
    <div className="project">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack}>← 홈</button>
        <h1>{project.name}</h1>
        <span className="period">{project.startDate} ~ {project.endDate}</span>
        <button className="icon-btn danger"
          onClick={() => confirm(`'${project.name}' 프로젝트를 삭제할까요?`) && onDelete()}>삭제</button>
      </header>

      <KpiBar kpis={project.kpis} onChange={(kpis) => onChange((p) => ({ ...p, kpis }))} />

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t} ({counts[t]})
          </button>
        ))}
      </nav>

      {tab === '중점수행과제' && (
        <Initiatives initiatives={project.initiatives}
          onChange={(initiatives) => onChange((p) => ({ ...p, initiatives }))} />
      )}
      {tab === '운영업무' && (
        <OperationsTable operations={project.operations}
          onChange={(operations) => onChange((p) => ({ ...p, operations }))} />
      )}
      {tab === '고려사항' && (
        <ConsiderationLog considerations={project.considerations}
          onChange={(considerations) => onChange((p) => ({ ...p, considerations }))} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/pages/project.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Project.jsx tests/pages/project.test.jsx
git commit -m "feat: 프로젝트 상세 페이지 (KPI 바 + 탭 3개)"
```

---

### Task 13: 홈 화면 (src/pages/Home.jsx)

**Files:**
- Create: `src/pages/Home.jsx`
- Test: `tests/pages/home.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성 — tests/pages/home.test.jsx**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Home from '../../src/pages/Home.jsx'

const projects = [{
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
  initiatives: [{ id: 'i1', name: '과제', description: '', owner: '', tasks: [
    { id: 't1', name: '지연 태스크', startDate: '2026-01-01', endDate: '2026-02-01', progress: 50, status: '진행중' },
  ] }],
  operations: [],
  considerations: [{ id: 'c1', title: 't', content: '', response: '', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
}]

it('전체 요약과 프로젝트 카드를 표시한다', () => {
  render(<Home projects={projects} onOpen={() => {}} onChange={() => {}} />)
  expect(screen.getByText(/프로젝트 1개 · 지연 태스크 1건 · 미해결 고려사항 1건/)).toBeInTheDocument()
  expect(screen.getByText('차세대 시스템')).toBeInTheDocument()
  expect(screen.getByText('KPI 70%')).toBeInTheDocument()
  expect(screen.getByText('지연 1')).toBeInTheDocument()
})

it('카드 클릭 시 onOpen(id) 호출', () => {
  const onOpen = vi.fn()
  render(<Home projects={projects} onOpen={onOpen} onChange={() => {}} />)
  fireEvent.click(screen.getByText('차세대 시스템'))
  expect(onOpen).toHaveBeenCalledWith('p1')
})

it('새 프로젝트 폼으로 프로젝트를 추가한다', () => {
  const onChange = vi.fn()
  render(<Home projects={[]} onOpen={() => {}} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 새 프로젝트'))
  fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '신규 프로젝트' } })
  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-07-01' } })
  fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({
    name: '신규 프로젝트', kpis: [], initiatives: [], operations: [], considerations: [],
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/pages/home.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 — src/pages/Home.jsx**

```jsx
import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import {
  projectKpiAverage, initiativeProgress, countDelayedTasks, countOpenConsiderations, todayStr,
} from '../lib/calc.js'

export default function Home({ projects, onOpen, onChange }) {
  const [adding, setAdding] = useState(false)
  const today = todayStr()
  const delayed = projects.reduce((n, p) => n + countDelayedTasks(p, today), 0)
  const open = projects.reduce((n, p) => n + countOpenConsiderations(p), 0)

  return (
    <div className="home">
      <header className="page-head">
        <h1>📊 프로젝트 대시보드</h1>
        <p className="summary">프로젝트 {projects.length}개 · 지연 태스크 {delayed}건 · 미해결 고려사항 {open}건</p>
      </header>

      <div className="card-grid">
        {projects.map((p) => {
          const kpi = projectKpiAverage(p)
          const avgProgress = p.initiatives.length
            ? Math.round(p.initiatives.reduce((s, i) => s + initiativeProgress(i), 0) / p.initiatives.length)
            : null
          const pDelayed = countDelayedTasks(p, today)
          const pOpen = countOpenConsiderations(p)
          return (
            <button key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
              <h2>{p.name}</h2>
              <p className="period">{p.startDate} ~ {p.endDate}</p>
              <p className="card-stats">
                <span>KPI {kpi === null ? '—' : `${kpi}%`}</span>
                <span>과제 진척 {avgProgress === null ? '—' : `${avgProgress}%`}</span>
              </p>
              <div className="badges">
                {pDelayed > 0 && <span className="badge badge-warn">지연 {pDelayed}</span>}
                {pOpen > 0 && <span className="badge badge-issue">⚠ {pOpen}</span>}
              </div>
            </button>
          )
        })}
        <button className="project-card add-card" onClick={() => setAdding(true)}>+ 새 프로젝트</button>
      </div>

      {adding && (
        <ProjectForm
          onSubmit={(form) => {
            onChange([...projects, {
              id: crypto.randomUUID(), ...form,
              kpis: [], initiatives: [], operations: [], considerations: [],
            }])
            setAdding(false)
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}

function ProjectForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'), description: f.get('description'),
      startDate: f.get('startDate'), endDate: f.get('endDate'),
    })
  }
  return (
    <Modal title="새 프로젝트" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>이름 <input name="name" required /></label>
        <label>설명 <textarea name="description" /></label>
        <label>시작일 <input name="startDate" type="date" required /></label>
        <label>종료일 <input name="endDate" type="date" required /></label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/pages/home.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.jsx tests/pages/home.test.jsx
git commit -m "feat: 홈 화면 (프로젝트 카드 그리드 + 전체 요약)"
```

---

### Task 14: App 통합 (라우팅·자동저장·알림 배너)

**Files:**
- Modify: `src/App.jsx` (Task 1의 임시 버전 교체)
- Modify: `tests/app.test.jsx` (스모크 테스트 교체)

- [ ] **Step 1: 실패하는 테스트 작성 — tests/app.test.jsx 전체 교체**

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const sample = {
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [], initiatives: [], operations: [], considerations: [],
}
const saveMock = vi.fn()

vi.mock('../src/api.js', () => ({
  loadProjects: vi.fn().mockResolvedValue({ projects: [sample], recoveredFrom: null }),
  createDebouncedSave: vi.fn(() => saveMock),
}))

import App from '../src/App.jsx'

it('로드 후 홈 화면을 보여준다', async () => {
  render(<App />)
  expect(await screen.findByText('차세대 시스템')).toBeInTheDocument()
})

it('카드 클릭 → 상세 → 뒤로 가기', async () => {
  render(<App />)
  fireEvent.click(await screen.findByText('차세대 시스템'))
  expect(screen.getByRole('button', { name: '← 홈' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '← 홈' }))
  expect(screen.getByText('📊 프로젝트 대시보드')).toBeInTheDocument()
})

it('데이터 변경 시 디바운스 저장이 호출된다', async () => {
  render(<App />)
  fireEvent.click(await screen.findByText('+ 새 프로젝트'))
  fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '신규' } })
  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-07-01' } })
  fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  await waitFor(() => expect(saveMock).toHaveBeenCalled())
  expect(saveMock.mock.calls.at(-1)[0]).toHaveLength(2)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/app.test.jsx`
Expected: FAIL — 임시 App에는 로드·카드가 없음

- [ ] **Step 3: 구현 — src/App.jsx 전체 교체**

```jsx
import { useEffect, useRef, useState } from 'react'
import { loadProjects, createDebouncedSave } from './api.js'
import Home from './pages/Home.jsx'
import Project from './pages/Project.jsx'

export default function App() {
  const [projects, setProjects] = useState(null) // null = 로딩 중
  const [view, setView] = useState({ page: 'home' })
  const [notice, setNotice] = useState(null) // { type: 'error' | 'info', text }
  const saveRef = useRef(null)

  useEffect(() => {
    saveRef.current = createDebouncedSave({
      onError: (err) => setNotice(err
        ? { type: 'error', text: '저장에 실패했습니다. 변경 내용은 화면에 유지되어 있으니 잠시 후 다시 수정해 보세요.' }
        : null),
    })
    loadProjects()
      .then(({ projects, recoveredFrom }) => {
        setProjects(projects)
        if (recoveredFrom) {
          setNotice({ type: 'info', text: `데이터 파일이 손상되어 백업(${recoveredFrom})에서 복구했습니다.` })
        }
      })
      .catch(() => setNotice({ type: 'error', text: '데이터를 불러오지 못했습니다. 서버 실행 상태를 확인하세요.' }))
  }, [])

  function updateProjects(next) {
    setProjects(next)
    saveRef.current?.(next)
  }

  function updateProject(id, updater) {
    updateProjects(projects.map((p) => (p.id === id ? updater(p) : p)))
  }

  if (projects === null) {
    return (
      <div className="app">
        {notice && <div className={`banner banner-${notice.type}`}>{notice.text}</div>}
        <div className="loading">불러오는 중…</div>
      </div>
    )
  }

  const current = view.page === 'project' ? projects.find((p) => p.id === view.id) : null

  return (
    <div className="app">
      {notice && <div className={`banner banner-${notice.type}`}>{notice.text}</div>}
      {current ? (
        <Project
          project={current}
          onChange={(updater) => updateProject(current.id, updater)}
          onDelete={() => {
            updateProjects(projects.filter((p) => p.id !== current.id))
            setView({ page: 'home' })
          }}
          onBack={() => setView({ page: 'home' })}
        />
      ) : (
        <Home projects={projects} onOpen={(id) => setView({ page: 'project', id })} onChange={updateProjects} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 전체 PASS (이전 태스크 테스트 포함)

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx tests/app.test.jsx
git commit -m "feat: App 통합 (홈↔상세 전환·자동저장·복구/오류 배너)"
```

---

### Task 15: 스타일시트 + 빌드 검증 + README

**Files:**
- Modify: `src/styles.css` (빈 파일 → 전체 작성)
- Create: `README.md`

- [ ] **Step 1: src/styles.css 작성**

```css
/* ===== 기본 ===== */
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Apple SD Gothic Neo', 'Pretendard', 'Malgun Gothic', sans-serif;
  background: #f4f6f9;
  color: #1f2937;
}
.app { max-width: 1100px; margin: 0 auto; padding: 24px 20px 80px; }
h1 { font-size: 22px; margin: 0; }
button { cursor: pointer; font-family: inherit; }
input, select, textarea { font-family: inherit; font-size: 14px; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.empty { color: #9ca3af; padding: 16px; text-align: center; }
.loading { padding: 60px; text-align: center; color: #6b7280; }

/* ===== 배너 ===== */
.banner { padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
.banner-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.banner-info { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }

/* ===== 페이지 헤더 ===== */
.page-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.page-head .summary { color: #6b7280; font-size: 14px; margin: 4px 0 0; width: 100%; }
.period { color: #6b7280; font-size: 13px; }

/* ===== 버튼 ===== */
.btn-primary {
  background: #2563eb; color: #fff; border: none; border-radius: 8px;
  padding: 9px 16px; font-size: 14px; margin-top: 12px;
}
.btn-primary:hover { background: #1d4ed8; }
.icon-btn { background: none; border: none; color: #6b7280; font-size: 13px; padding: 4px 6px; border-radius: 4px; }
.icon-btn:hover { background: #e5e7eb; }
.icon-btn.danger { color: #dc2626; margin-left: auto; }
.link-btn { background: none; border: none; color: #2563eb; font-size: 13px; padding: 4px 6px; }
.link-btn:hover { text-decoration: underline; }

/* ===== 홈: 카드 그리드 ===== */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.project-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px;
  text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,.06); transition: box-shadow .15s;
}
.project-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.project-card h2 { font-size: 17px; margin: 0 0 4px; }
.card-stats { display: flex; gap: 14px; font-size: 14px; color: #374151; margin: 10px 0 6px; }
.add-card {
  display: flex; align-items: center; justify-content: center;
  color: #6b7280; border-style: dashed; font-size: 15px; min-height: 120px;
}
.badges { display: flex; gap: 6px; }
.badge { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
.badge-warn { background: #fef3c7; color: #92400e; }
.badge-issue { background: #fee2e2; color: #991b1b; }

/* ===== KPI 바 ===== */
.kpi-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.kpi-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 12px 14px; min-width: 160px; flex: 1; max-width: 240px;
}
.kpi-head { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.kpi-rate { font-size: 24px; font-weight: 700; margin: 6px 0 2px; }
.kpi-detail { font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 4px; }
.kpi-detail input { width: 70px; padding: 3px 6px; }
.gauge { background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 8px; overflow: hidden; }
.gauge-fill { background: #2563eb; height: 100%; border-radius: 3px; }
.kpi-bar .add-card { min-height: auto; min-width: 90px; }

/* ===== 탭 ===== */
.tabs { display: flex; gap: 4px; border-bottom: 2px solid #e5e7eb; margin-bottom: 16px; }
.tab {
  background: none; border: none; padding: 10px 16px; font-size: 14px; color: #6b7280;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
}
.tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }

/* ===== 과제 / 간트 ===== */
.initiative-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 12px; }
.initiative-head { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; }
.initiative-head .meta { color: #6b7280; font-size: 13px; flex: 1; }
.initiative-body { padding: 0 16px 12px; }
.gantt { display: flex; flex-direction: column; gap: 6px; }
.gantt-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.task-name { width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-progress input { width: 54px; padding: 2px 4px; }
.gantt-track { position: relative; flex: 1; height: 18px; background: #f3f4f6; border-radius: 4px; }
.gantt-bar { position: absolute; top: 3px; height: 12px; border-radius: 3px; }
.gantt-bar.done { background: #34d399; }
.gantt-bar.active { background: #60a5fa; }
.gantt-bar.delayed { background: #fbbf24; }
.today-line { position: absolute; top: -2px; width: 2px; height: 22px; background: #ef4444; }
.task-status { width: 60px; color: #6b7280; }
.task-status.delayed { color: #d97706; font-weight: 600; }

/* ===== 운영업무 테이블 ===== */
.op-table { width: 100%; background: #fff; border-collapse: collapse; border-radius: 10px; overflow: hidden; }
.op-table th { text-align: left; font-size: 13px; color: #6b7280; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
.op-table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
.op-table input { width: 100%; border-color: transparent; background: transparent; }
.op-table input:focus { border-color: #d1d5db; background: #fff; }

/* ===== 고려사항 ===== */
.consideration { background: #fff; border: 1px solid #e5e7eb; border-left-width: 4px; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
.consideration.sev-high { border-left-color: #ef4444; }
.consideration.sev-mid { border-left-color: #f59e0b; }
.consideration.sev-low { border-left-color: #9ca3af; }
.consideration-head { display: flex; align-items: center; gap: 10px; }
.consideration-head h4 { margin: 0; flex: 1; font-size: 15px; }
.consideration p { margin: 8px 0 0; font-size: 14px; }
.consideration .response { color: #1e40af; }
.consideration .meta { color: #9ca3af; font-size: 12px; }
.badge.sev-high { background: #fee2e2; color: #991b1b; }
.badge.sev-mid { background: #fef3c7; color: #92400e; }
.badge.sev-low { background: #f3f4f6; color: #4b5563; }
.resolved-section { margin-top: 16px; opacity: .75; }

/* ===== 모달 / 폼 ===== */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal { background: #fff; border-radius: 12px; padding: 20px 24px; width: 420px; max-width: 92vw; max-height: 85vh; overflow-y: auto; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-head h3 { margin: 0; }
.form { display: flex; flex-direction: column; gap: 12px; }
.form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #374151; }
.form textarea { min-height: 64px; resize: vertical; }
```

- [ ] **Step 2: 전체 테스트·빌드 확인**

Run: `npm test`
Expected: 전체 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 3: 실제 실행 확인**

Run: `npm start` (백그라운드)
확인: `curl -s http://localhost:3000/api/projects` → `{"projects":[],"recoveredFrom":null}`
확인: 브라우저에서 http://localhost:3000 접속 → 홈 화면 렌더링, 새 프로젝트 추가 → `data/projects.json` 생성 확인
종료 후 다음 단계 진행.

- [ ] **Step 4: README.md 작성**

````markdown
# 프로젝트 대시보드

여러 프로젝트의 KPI · 중점수행과제(간트) · 운영업무 · 고려사항을 관리하는 개인용 로컬 대시보드.

## 실행

```bash
npm install   # 최초 1회
npm start     # 빌드 + 서버 실행 → http://localhost:3000
```

## 개발

```bash
npm run serve   # API 서버 (포트 3000)
npm run dev     # Vite 개발 서버 (API는 3000으로 프록시)
npm test        # 테스트
```

## 데이터

- `data/projects.json` — 전체 데이터 (이 폴더는 OneDrive로 자동 동기화됨)
- `data/backups/` — 일자별 자동 백업, 최근 7일치 유지
````

- [ ] **Step 5: Commit**

```bash
git add src/styles.css README.md
git commit -m "feat: 스타일시트 및 README"
```

---

## 완료 기준 (스펙 대비 체크)

- [ ] 홈: 카드 그리드 + 전체 요약(프로젝트/지연/미해결 수) — Task 13
- [ ] KPI 혼합형(수치 게이지 + 정성 뱃지) + 인라인 수정 — Task 7
- [ ] 과제 진척률 자동 계산(태스크 평균), 간트(오늘선·지연 경고) — Task 2, 8, 9
- [ ] 운영업무: 주기·담당·상태·최근수행·메모 — Task 10
- [ ] 고려사항: 이슈 로그, 중요도 정렬, 해결 이력 보관 — Task 11
- [ ] 자동저장(디바운스 0.5초) + 실패 배너 — Task 5, 14
- [ ] 원자적 저장 + 7일 백업 + 손상 복구 — Task 3, 4
- [ ] `npm start` 단일 명령 실행 — Task 1, 15

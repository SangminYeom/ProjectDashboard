# Vercel + Neon 마이그레이션 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 Express + JSON 파일 대시보드를 Vercel Functions + Neon PostgreSQL로 이전해 팀 공유 접근 가능하게 한다.

**Architecture:** Vercel Functions(`api/`)가 GET/PUT /api/projects 및 인증 엔드포인트를 처리하고, Neon PostgreSQL의 단일 JSONB 컬럼에 기존 데이터 구조를 그대로 저장한다. 공유 비밀번호 → httpOnly 쿠키로 인증하며, 로컬 개발은 Express + JSON 파일 방식을 그대로 유지한다.

**Tech Stack:** `@neondatabase/serverless`, `node:crypto` (HMAC-SHA256 쿠키 서명), React, Vite, Vercel Functions

---

## 파일 구조

```
추가:
  server/db.js                  ← Neon 읽기/쓰기 (readStore, writeStore)
  src/auth-error.js             ← AuthError 클래스 (프론트/백엔드 공유)
  api/_auth.js                  ← 토큰 생성/검증, requireAuth 미들웨어
  api/auth/login.js             ← POST /api/auth/login
  api/auth/logout.js            ← POST /api/auth/logout
  api/projects.js               ← GET/PUT /api/projects (Vercel Function)
  src/pages/Login.jsx           ← 비밀번호 입력 화면
  scripts/migrate-to-neon.js    ← 1회 마이그레이션 스크립트
  vercel.json                   ← SPA 라우팅 설정
  tests/db.test.js
  tests/api-functions/auth.test.js
  tests/api-functions/projects.test.js
  tests/pages/login.test.jsx

수정:
  src/api.js                    ← credentials 추가, AuthError 처리
  src/App.jsx                   ← authed 상태, Login 분기
  src/styles.css                ← 로그인 화면 스타일
  package.json                  ← @neondatabase/serverless 추가
  tests/api.test.js             ← credentials·AuthError 테스트 추가
  tests/app.test.jsx            ← 401 → Login 테스트 추가
```

---

### Task 1: Neon DB 클라이언트 (`server/db.js`)

**Files:**
- Create: `server/db.js`
- Create: `tests/db.test.js`
- Modify: `package.json`

- [ ] **Step 1: 패키지 추가**

`package.json`의 `"dependencies"` 섹션에 한 줄 추가:

```json
"@neondatabase/serverless": "^0.10.0",
```

결과:
```json
"dependencies": {
  "@neondatabase/serverless": "^0.10.0",
  "express": "^4.19.0",
  "html-to-image": "^1.11.13",
  "react": "^18.3.0",
  "react-dom": "^18.3.0"
},
```

- [ ] **Step 2: 패키지 설치**

```
npm install
```

Expected: `node_modules/@neondatabase/serverless` 생성됨

- [ ] **Step 3: 실패 테스트 작성**

`tests/db.test.js` 생성:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(),
}))

import { neon } from '@neondatabase/serverless'
import { readStore, writeStore } from '../server/db.js'

beforeEach(() => {
  neon.mockReset()
})

describe('readStore', () => {
  it('store 행이 있으면 payload를 반환한다', async () => {
    const payload = { projects: [{ id: 'p1' }] }
    const sqlFn = vi.fn().mockResolvedValue([{ payload }])
    neon.mockReturnValue(sqlFn)
    expect(await readStore()).toEqual(payload)
    expect(neon).toHaveBeenCalledWith(process.env.DATABASE_URL)
  })

  it('행이 없으면 { projects: [] }를 반환한다', async () => {
    const sqlFn = vi.fn().mockResolvedValue([])
    neon.mockReturnValue(sqlFn)
    expect(await readStore()).toEqual({ projects: [] })
  })
})

describe('writeStore', () => {
  it('neon upsert 쿼리를 한 번 호출한다', async () => {
    const sqlFn = vi.fn().mockResolvedValue([])
    neon.mockReturnValue(sqlFn)
    await writeStore({ projects: [{ id: 'p1' }] })
    expect(sqlFn).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 4: 테스트 실행 — FAIL 확인**

```
npm test -- tests/db.test.js
```

Expected: `Cannot find module '../server/db.js'`

- [ ] **Step 5: `server/db.js` 구현**

```js
import { neon } from '@neondatabase/serverless'

export async function readStore() {
  const db = neon(process.env.DATABASE_URL)
  const rows = await db`SELECT payload FROM store WHERE id = 1`
  return rows[0]?.payload ?? { projects: [] }
}

export async function writeStore(payload) {
  const db = neon(process.env.DATABASE_URL)
  await db`
    INSERT INTO store (id, payload, updated_at)
    VALUES (1, ${JSON.stringify(payload)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
      SET payload = ${JSON.stringify(payload)}::jsonb, updated_at = now()
  `
}
```

- [ ] **Step 6: 테스트 실행 — PASS 확인**

```
npm test -- tests/db.test.js
```

Expected: 3 tests passed

- [ ] **Step 7: 커밋**

```
git add server/db.js tests/db.test.js package.json package-lock.json
git commit -m "feat: Neon DB 클라이언트 추가 (readStore, writeStore)"
```

---

### Task 2: AuthError + 인증 유틸리티 (`src/auth-error.js`, `api/_auth.js`)

**Files:**
- Create: `src/auth-error.js`
- Create: `api/_auth.js`
- Create: `tests/api-functions/auth.test.js`

- [ ] **Step 1: 실패 테스트 작성**

`tests/api-functions/auth.test.js` 생성:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-secret-32chars-padded-here!!')
  vi.stubEnv('ACCESS_CODE', 'team-password')
})
afterEach(() => vi.unstubAllEnvs())

import { createToken, verifyToken, parseCookie, requireAuth } from '../../api/_auth.js'
import { AuthError } from '../../src/auth-error.js'

describe('AuthError', () => {
  it('Error의 서브클래스이다', () => {
    expect(new AuthError()).toBeInstanceOf(Error)
    expect(new AuthError().message).toBe('unauthorized')
  })
})

describe('createToken / verifyToken', () => {
  it('생성한 토큰이 검증 통과한다', () => {
    const token = createToken('test-secret-32chars-padded-here!!')
    expect(verifyToken(token, 'test-secret-32chars-padded-here!!')).toBe(true)
  })

  it('다른 secret으로 생성한 토큰은 검증 실패한다', () => {
    const token = createToken('other-secret')
    expect(verifyToken(token, 'test-secret-32chars-padded-here!!')).toBe(false)
  })

  it('잘못된 형식의 토큰은 검증 실패한다', () => {
    expect(verifyToken('garbage!!', 'test-secret-32chars-padded-here!!')).toBe(false)
  })
})

describe('parseCookie', () => {
  it('쿠키 문자열을 객체로 파싱한다', () => {
    expect(parseCookie('auth_token=abc; other=xyz')).toEqual({ auth_token: 'abc', other: 'xyz' })
  })

  it('빈 문자열에서 빈 객체를 반환한다', () => {
    expect(parseCookie('')).toEqual({})
  })

  it('undefined에서 빈 객체를 반환한다', () => {
    expect(parseCookie(undefined)).toEqual({})
  })
})

describe('requireAuth', () => {
  it('유효한 쿠키면 true를 반환한다', () => {
    const token = createToken(process.env.SESSION_SECRET)
    const req = { headers: { cookie: `auth_token=${token}` } }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    expect(requireAuth(req, res)).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('쿠키가 없으면 false를 반환하고 401을 응답한다', () => {
    const req = { headers: {} }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    expect(requireAuth(req, res)).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' })
  })

  it('토큰이 유효하지 않으면 false를 반환하고 401을 응답한다', () => {
    const req = { headers: { cookie: 'auth_token=invalid-token' } }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    expect(requireAuth(req, res)).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```
npm test -- tests/api-functions/auth.test.js
```

Expected: `Cannot find module '../../api/_auth.js'`

- [ ] **Step 3: `src/auth-error.js` 구현**

```js
export class AuthError extends Error {
  constructor() {
    super('unauthorized')
  }
}
```

- [ ] **Step 4: `api/_auth.js` 구현**

```js
import { createHmac, timingSafeEqual } from 'node:crypto'

function sign(secret) {
  return createHmac('sha256', secret).update('auth').digest('base64url')
}

export function createToken(secret) {
  return sign(secret)
}

export function verifyToken(token, secret) {
  const expected = sign(secret)
  try {
    return timingSafeEqual(
      Buffer.from(token, 'base64url'),
      Buffer.from(expected, 'base64url'),
    )
  } catch {
    return false
  }
}

export function parseCookie(str) {
  if (!str) return {}
  return Object.fromEntries(
    str.split(';')
      .map((c) => c.trim().split('='))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())]),
  )
}

export function requireAuth(req, res) {
  const cookies = parseCookie(req.headers.cookie)
  const token = cookies['auth_token']
  if (!token || !verifyToken(token, process.env.SESSION_SECRET)) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}
```

- [ ] **Step 5: 테스트 실행 — PASS 확인**

```
npm test -- tests/api-functions/auth.test.js
```

Expected: 9 tests passed

- [ ] **Step 6: 커밋**

```
git add src/auth-error.js api/_auth.js tests/api-functions/auth.test.js
git commit -m "feat: AuthError 클래스 및 인증 유틸리티 추가"
```

---

### Task 3: Vercel Functions (`api/projects.js`, `api/auth/login.js`, `api/auth/logout.js`)

**Files:**
- Create: `api/projects.js`
- Create: `api/auth/login.js`
- Create: `api/auth/logout.js`
- Create: `tests/api-functions/projects.test.js`

- [ ] **Step 1: 실패 테스트 작성**

`tests/api-functions/projects.test.js` 생성:

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
import handler from '../../api/projects.js'

function req(method, body = null) {
  return { method, body, headers: {} }
}
function res() {
  const r = { _status: 200, status: vi.fn(), json: vi.fn(), end: vi.fn() }
  r.status.mockReturnValue(r)
  return r
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAuth.mockReturnValue(true)
})

describe('GET /api/projects', () => {
  it('store의 payload를 반환하고 recoveredFrom: null을 포함한다', async () => {
    readStore.mockResolvedValue({ projects: [{ id: 'p1' }] })
    const r = res()
    await handler(req('GET'), r)
    expect(r.status).toHaveBeenCalledWith(200)
    expect(r.json).toHaveBeenCalledWith({ projects: [{ id: 'p1' }], recoveredFrom: null })
  })
})

describe('PUT /api/projects', () => {
  it('projects를 저장하고 204를 반환한다', async () => {
    writeStore.mockResolvedValue(undefined)
    const r = res()
    await handler(req('PUT', { projects: [{ id: 'p1' }] }), r)
    expect(writeStore).toHaveBeenCalledWith({ projects: [{ id: 'p1' }] })
    expect(r.status).toHaveBeenCalledWith(204)
    expect(r.end).toHaveBeenCalled()
  })

  it('projects가 배열이 아니면 400을 반환한다', async () => {
    const r = res()
    await handler(req('PUT', { projects: 'not-array' }), r)
    expect(r.status).toHaveBeenCalledWith(400)
    expect(r.json).toHaveBeenCalledWith({ error: 'projects 배열이 필요합니다' })
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
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```
npm test -- tests/api-functions/projects.test.js
```

Expected: `Cannot find module '../../api/projects.js'`

- [ ] **Step 3: `api/projects.js` 구현**

```js
import { readStore, writeStore } from '../server/db.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    const data = await readStore()
    return res.status(200).json({ ...data, recoveredFrom: null })
  }

  if (req.method === 'PUT') {
    const { projects } = req.body ?? {}
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'projects 배열이 필요합니다' })
    }
    await writeStore({ projects })
    return res.status(204).end()
  }

  res.status(405).end()
}
```

- [ ] **Step 4: `api/auth/login.js` 구현**

```js
import { createToken } from '../_auth.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body ?? {}
  if (!password || password !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const token = createToken(process.env.SESSION_SECRET)
  res.setHeader(
    'Set-Cookie',
    `auth_token=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`,
  )
  res.status(200).json({ ok: true })
}
```

- [ ] **Step 5: `api/auth/logout.js` 구현**

```js
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  res.status(200).json({ ok: true })
}
```

- [ ] **Step 6: 테스트 실행 — PASS 확인**

```
npm test -- tests/api-functions/projects.test.js
```

Expected: 5 tests passed

- [ ] **Step 7: 전체 테스트 확인 (기존 테스트 깨지지 않음)**

```
npm test
```

Expected: 모든 기존 테스트 통과 (새 테스트 포함)

- [ ] **Step 8: 커밋**

```
git add api/projects.js api/auth/login.js api/auth/logout.js tests/api-functions/projects.test.js
git commit -m "feat: Vercel Functions 추가 (projects, auth/login, auth/logout)"
```

---

### Task 4: `src/api.js` — credentials + AuthError 처리

**Files:**
- Modify: `src/api.js`
- Modify: `tests/api.test.js`

- [ ] **Step 1: `tests/api.test.js`에 실패 테스트 추가**

기존 `tests/api.test.js` 파일의 마지막에 다음 describe 블록을 추가:

```js
import { AuthError } from '../src/auth-error.js'

describe('loadProjects — credentials & AuthError', () => {
  it('credentials: include를 포함해 fetch한다', async () => {
    vi.useRealTimers()
    const payload = { projects: [], recoveredFrom: null }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) })
    vi.stubGlobal('fetch', fetchMock)
    await loadProjects()
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', { credentials: 'include' })
  })

  it('401 응답 시 AuthError를 throw한다', async () => {
    vi.useRealTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(loadProjects()).rejects.toBeInstanceOf(AuthError)
  })
})

describe('createDebouncedSave — 401 처리', () => {
  it('PUT 401 시 onError에 AuthError를 전달한다', async () => {
    const onError = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const save = createDebouncedSave({ delay: 100, onError })
    save([])
    await vi.advanceTimersByTimeAsync(100)
    expect(onError.mock.calls.at(-1)[0]).toBeInstanceOf(AuthError)
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```
npm test -- tests/api.test.js
```

Expected: 새로 추가한 테스트 FAIL (credentials 없음, AuthError 없음)

- [ ] **Step 3: `src/api.js` 수정**

파일 전체를 다음으로 교체:

```js
import { AuthError } from './auth-error.js'

export { AuthError }

export async function loadProjects() {
  const res = await fetch('/api/projects', { credentials: 'include' })
  if (res.status === 401) throw new AuthError()
  if (!res.ok) throw new Error(`로드 실패: ${res.status}`)
  return res.json()
}

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

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```
npm test -- tests/api.test.js
```

Expected: 전체 7 tests passed

- [ ] **Step 5: 커밋**

```
git add src/api.js src/auth-error.js tests/api.test.js
git commit -m "feat: api.js에 credentials, AuthError 처리 추가"
```

---

### Task 5: 프론트엔드 인증 (`Login.jsx`, `App.jsx`, `styles.css`)

**Files:**
- Create: `src/pages/Login.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Create: `tests/pages/login.test.jsx`
- Modify: `tests/app.test.jsx`

- [ ] **Step 1: Login 컴포넌트 실패 테스트 작성**

`tests/pages/login.test.jsx` 생성:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Login from '../../src/pages/Login.jsx'

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

it('비밀번호 입력 폼을 표시한다', () => {
  render(<Login onSuccess={vi.fn()} />)
  expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
})

it('로그인 성공 시 onSuccess를 호출한다', async () => {
  fetch.mockResolvedValue({ ok: true })
  const onSuccess = vi.fn()
  render(<Login onSuccess={onSuccess} />)
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'correct' } })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
  await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
    method: 'POST',
    credentials: 'include',
  }))
})

it('비밀번호 오류 시 에러 메시지를 표시한다', async () => {
  fetch.mockResolvedValue({ ok: false, status: 401 })
  render(<Login onSuccess={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
  expect(await screen.findByText('비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
})
```

- [ ] **Step 2: App 401 테스트 추가**

`tests/app.test.jsx`를 다음과 같이 수정:

1. `import App from '../src/App.jsx'` 줄 **바로 아래** 두 줄 추가:
```js
import { loadProjects } from '../src/api.js'
import { AuthError } from '../src/auth-error.js'
```
(`vi.mock`이 Vitest에 의해 호이스팅되므로 `loadProjects`는 자동으로 모킹된 버전이 된다)

2. 파일 **끝에** 새 테스트 추가:
```js
it('loadProjects가 AuthError를 throw하면 로그인 화면을 표시한다', async () => {
  loadProjects.mockRejectedValueOnce(new AuthError())
  render(<App />)
  expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
})
```

- [ ] **Step 3: 테스트 실행 — FAIL 확인**

```
npm test -- tests/pages/login.test.jsx tests/app.test.jsx
```

Expected: `Cannot find module '../../src/pages/Login.jsx'`

- [ ] **Step 4: `src/pages/Login.jsx` 구현**

```jsx
import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const password = e.target.elements.password.value
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      })
      if (res.ok) {
        onSuccess()
      } else {
        setError('비밀번호가 올바르지 않습니다.')
      }
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">'26년 Project 목표 관리</h1>
        <p className="login-subtitle">고객가치혁신유닛</p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            비밀번호
            <input name="password" type="password" aria-label="비밀번호" required autoFocus />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '확인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: `src/App.jsx` 수정**

파일 전체를 다음으로 교체:

```jsx
import { useEffect, useRef, useState } from 'react'
import { loadProjects, createDebouncedSave } from './api.js'
import { AuthError } from './auth-error.js'
import Home from './pages/Home.jsx'
import Project from './pages/Project.jsx'
import Login from './pages/Login.jsx'

export default function App() {
  const [projects, setProjects] = useState(null)
  const [view, setView] = useState({ page: 'home' })
  const [notice, setNotice] = useState(null)
  const [authed, setAuthed] = useState(null) // null=확인중, false=미인증, true=인증됨
  const saveRef = useRef(null)

  useEffect(() => {
    saveRef.current = createDebouncedSave({
      onError: (err) => {
        if (err instanceof AuthError) { setAuthed(false); return }
        setNotice(err
          ? { type: 'error', text: '저장에 실패했습니다. 변경 내용은 화면에 유지되어 있으니 잠시 후 다시 수정해 보세요.' }
          : null)
      },
    })
    loadProjects()
      .then(({ projects, recoveredFrom }) => {
        setAuthed(true)
        setProjects(projects)
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

  if (authed === null) {
    return <div className="app"><div className="loading">불러오는 중…</div></div>
  }

  if (!authed) {
    return <Login onSuccess={() => window.location.reload()} />
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
        <Home projects={projects} onOpen={(id) => setView({ page: 'project', id })} onChange={updateProjects} />
      )}
    </div>
  )
}
```

- [ ] **Step 6: `src/styles.css`에 로그인 스타일 추가**

`src/styles.css` 파일 **끝에** 다음을 추가:

```css
/* ── Login ── */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f7; }
.login-card { background: #fff; border-radius: 18px; padding: 40px 48px; box-shadow: 0 4px 24px rgba(0,0,0,.08); min-width: 320px; }
.login-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
.login-subtitle { font-size: 13px; color: #86868b; margin: 0 0 24px; }
.login-error { color: #d70015; font-size: 13px; margin: -8px 0 8px; }
```

- [ ] **Step 7: 테스트 실행 — PASS 확인**

```
npm test -- tests/pages/login.test.jsx tests/app.test.jsx
```

Expected: 전체 통과 (login 3개, app 4개)

- [ ] **Step 8: 전체 테스트 확인**

```
npm test
```

Expected: 모든 테스트 통과

- [ ] **Step 9: 커밋**

```
git add src/pages/Login.jsx src/App.jsx src/styles.css tests/pages/login.test.jsx tests/app.test.jsx
git commit -m "feat: 로그인 화면 및 인증 상태 관리 추가"
```

---

### Task 6: Vercel 설정 + 마이그레이션 스크립트

**Files:**
- Create: `vercel.json`
- Create: `scripts/migrate-to-neon.js`

- [ ] **Step 1: `vercel.json` 생성**

```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

`handle: filesystem`은 Vercel에게 정적 파일과 API Functions를 먼저 처리하고, 그 외 모든 경로는 `index.html`로 보내 SPA 라우팅을 지원하도록 한다.

- [ ] **Step 2: `scripts/migrate-to-neon.js` 생성**

```js
import fs from 'node:fs'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 환경변수가 필요합니다.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// 테이블 생성 (없으면)
await sql`
  CREATE TABLE IF NOT EXISTS store (
    id         INTEGER PRIMARY KEY DEFAULT 1,
    payload    JSONB NOT NULL DEFAULT '{"projects":[]}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
  )
`

// 기존 데이터 마이그레이션
const raw = fs.readFileSync('data/projects.json', 'utf8')
const data = JSON.parse(raw)

await sql`
  INSERT INTO store (id, payload, updated_at)
  VALUES (1, ${JSON.stringify(data)}::jsonb, now())
  ON CONFLICT (id) DO UPDATE
    SET payload = ${JSON.stringify(data)}::jsonb,
        updated_at = now()
`

console.log(`마이그레이션 완료 — 프로젝트 ${data.projects?.length ?? 0}개`)
```

- [ ] **Step 3: 전체 테스트 최종 확인**

```
npm test
```

Expected: 모든 테스트 통과

- [ ] **Step 4: 커밋**

```
git add vercel.json scripts/migrate-to-neon.js
git commit -m "feat: vercel.json 및 Neon 마이그레이션 스크립트 추가"
```

---

## 배포 체크리스트 (구현 완료 후)

1. **Neon 계정** → 프로젝트 생성 → `DATABASE_URL` 복사
2. **마이그레이션 실행**: `DATABASE_URL=<neon-url> node scripts/migrate-to-neon.js`
3. **Vercel 연결**: GitHub 레포 → Framework: Vite 자동 감지
4. **환경 변수 등록** (Vercel 대시보드 → Settings → Environment Variables):
   - `DATABASE_URL` = Neon connection string
   - `ACCESS_CODE` = 팀 공유 비밀번호
   - `SESSION_SECRET` = 랜덤 32자 이상 문자열 (예: `openssl rand -base64 32`로 생성)
5. **배포 확인**: `https://<app>.vercel.app` → 로그인 화면 → 비밀번호 입력 → 기존 데이터 확인

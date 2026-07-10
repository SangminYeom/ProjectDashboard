# Vercel + Neon 마이그레이션 설계서

- 날짜: 2026-06-10
- 상태: 승인

## 개요

현재 로컬 Express + JSON 파일 기반 대시보드를 Vercel + Neon(PostgreSQL)으로 이전하여 팀원 누구나 외부에서 접근 가능한 서비스로 전환한다.

- 사용자: 팀 다수 (공유 비밀번호로 접근)
- 실행: Vercel 배포 URL (`https://<app>.vercel.app`)
- 저장: Neon PostgreSQL JSONB 컬럼 (기존 데이터 구조 그대로 유지)
- 로컬 개발: 기존 방식 유지 (`npm run dev` → Express + `data/projects.json`)

## 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 호스팅 | Vercel | 정적 사이트 + Serverless Functions 통합 |
| 데이터베이스 | Neon PostgreSQL | Serverless 친화적, 무료 티어, JSONB 지원 |
| DB 클라이언트 | `@neondatabase/serverless` | HTTP 기반, Vercel Functions와 궁합 |
| 인증 | 공유 비밀번호 + httpOnly 쿠키 | 팀 규모에 적합, 구현 단순 |

## 아키텍처

```
현재:  브라우저 → Express(3000) → projects.json

배포후: 브라우저 → Vercel CDN(정적)
                 → Vercel Functions(/api/*) → Neon PostgreSQL
```

### 파일 구조 변화

```
추가:
  api/
    projects.js          ← GET /api/projects, PUT /api/projects
    auth/
      login.js           ← POST /api/auth/login
      logout.js          ← POST /api/auth/logout
  server/
    db.js                ← Neon 클라이언트 + CRUD (읽기/쓰기)
  src/pages/
    Login.jsx            ← 비밀번호 입력 화면
  scripts/
    migrate-to-neon.js   ← 1회 마이그레이션 스크립트
  vercel.json            ← SPA 라우팅 + 빌드 설정

수정:
  src/api.js             ← 401 감지 → 로그인 이동, credentials 포함
  src/App.jsx            ← isLoggedIn 상태, Login 화면 분기
  package.json           ← @neondatabase/serverless 추가

유지 (로컬/테스트 전용):
  server.js              ← 로컬 npm run dev
  server/storage.js      ← 로컬 파일 기반 저장
```

## 데이터베이스 스키마

```sql
CREATE TABLE IF NOT EXISTS store (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  payload    JSONB NOT NULL DEFAULT '{"projects":[]}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

단일 테이블, 단일 행. `payload` 컬럼은 기존 `projects.json` 내용과 동일한 구조(`{ projects: [...] }`)를 그대로 저장한다.

### 읽기 / 쓰기

```js
// 읽기
SELECT payload FROM store WHERE id = 1

// 쓰기 (upsert)
INSERT INTO store (id, payload, updated_at)
VALUES (1, $1, now())
ON CONFLICT (id) DO UPDATE SET payload = $1, updated_at = now()
```

## 인증 설계

### 환경 변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Neon connection string |
| `ACCESS_CODE` | 팀 공유 비밀번호 |
| `SESSION_SECRET` | 쿠키 서명용 랜덤 32자 문자열 |

### 인증 흐름

```
미로그인 사용자
  → /login 화면 (비밀번호 입력)
  → POST /api/auth/login { password }
  → ACCESS_CODE 일치 → HMAC-SHA256 서명된 httpOnly 쿠키 발급 (30일)
  → / 로 이동

API 호출
  → 쿠키 검증 (api/projects.js 내 헬퍼)
  → 유효 → 정상 처리
  → 무효/없음 → 401 반환
  → 프론트엔드 401 감지 → /login 이동
```

**쿠키 서명:** Web Crypto API(Node.js 내장) — `HMAC-SHA256(ACCESS_CODE, SESSION_SECRET)` → base64. 별도 세션 DB 불필요.

### API 응답 코드

| 상황 | 응답 |
|------|------|
| 인증 성공 (로그인) | 200 + Set-Cookie |
| 비밀번호 불일치 | 401 `{ error: 'unauthorized' }` |
| 쿠키 없음/만료 | 401 `{ error: 'unauthorized' }` |
| 로그아웃 | 200 + Clear-Cookie |

## API 엔드포인트

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/projects` | 필요 | `{ projects: [...] }` 반환 |
| PUT | `/api/projects` | 필요 | `{ projects: [...] }` 전체 저장 |
| POST | `/api/auth/login` | 불필요 | 비밀번호 검증 → 쿠키 발급 |
| POST | `/api/auth/logout` | 불필요 | 쿠키 제거 |

GET `/api/projects` 응답에는 `recoveredFrom: null` 포함 (기존 프론트엔드 호환).

## 프론트엔드 변경

### `src/api.js`
- 모든 fetch에 `credentials: 'include'` 추가
- 401 응답 시 `window.location.href = '/login'` 이동

### `src/App.jsx`
- `isLoggedIn` 상태 (초기값: `null` — 확인 중)
- 앱 마운트 시 GET `/api/projects` 호출:
  - 200 → 정상 렌더
  - 401 → `<Login />` 렌더

### `src/pages/Login.jsx`
- 비밀번호 입력 폼
- POST `/api/auth/login` → 성공 시 `window.location.reload()`

## Vercel 설정 (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 데이터 마이그레이션

`scripts/migrate-to-neon.js` — 1회 실행 스크립트:

```js
import fs from 'fs'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)
const data = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'))
await sql`
  INSERT INTO store (id, payload)
  VALUES (1, ${JSON.stringify(data)}::jsonb)
  ON CONFLICT (id) DO UPDATE SET payload = ${JSON.stringify(data)}::jsonb
`
console.log('마이그레이션 완료')
```

실행: `DATABASE_URL=<neon-url> node scripts/migrate-to-neon.js`

## 배포 절차

1. **Neon 설정** — neon.tech 프로젝트 생성 → `DATABASE_URL` 복사 → 마이그레이션 스크립트 실행
2. **Vercel 설정** — GitHub 연결 → Framework: Vite → Build: `npm run build` → Output: `dist`
3. **환경 변수 등록** — `DATABASE_URL`, `ACCESS_CODE`, `SESSION_SECRET`
4. **배포 확인** — 로그인 화면 → 비밀번호 입력 → 기존 데이터 확인

## 로컬 개발

변경 없음. `npm run dev` → Express + `data/projects.json`.

로컬에서 Vercel Functions 테스트가 필요한 경우: `vercel dev` (Vercel CLI 설치 필요).

## 테스트 전략

- 기존 테스트: 변경 없음 (Express + 파일 기반)
- 신규 단위 테스트:
  - `server/db.js` — Neon 읽기/쓰기 mock
  - `api/projects.js` — 인증 미들웨어 (쿠키 유효/무효)
  - `src/pages/Login.jsx` — 폼 제출, 오류 표시

## 제외 범위

- 사용자별 계정/권한 관리 (공유 비밀번호로 충분)
- 낙관적 잠금 / 동시 편집 충돌 처리 (팀 규모상 불필요)
- 백업 기능 (Neon 자동 백업으로 대체)
- 로컬 `data/projects.json` 삭제 (로컬 개발용으로 유지)

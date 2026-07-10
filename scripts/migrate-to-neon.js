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
const jsonPath = new URL('../data/projects.json', import.meta.url)
const raw = fs.readFileSync(jsonPath, 'utf8')
const data = JSON.parse(raw)

await sql`
  INSERT INTO store (id, payload, updated_at)
  VALUES (1, ${JSON.stringify(data)}::jsonb, now())
  ON CONFLICT (id) DO UPDATE
    SET payload = ${JSON.stringify(data)}::jsonb,
        updated_at = now()
`

console.log(`마이그레이션 완료 — 프로젝트 ${data.projects?.length ?? 0}개`)

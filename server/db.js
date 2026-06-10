import { neon } from '@neondatabase/serverless'

// NOTE: neon() is called per-function (not at module scope) because:
// 1. Serverless compatibility: Vercel Functions lack persistent state; per-request is idiomatic
// 2. Test isolation: Vitest mocks applied per-test via neon.mockReturnValue() require fresh calls
export async function readStore() {
  const db = neon(process.env.DATABASE_URL)
  const rows = await db`SELECT payload FROM store WHERE id = 1`
  return rows[0]?.payload ?? { projects: [] }
}

export async function writeStore(payload) {
  const db = neon(process.env.DATABASE_URL)
  const json = JSON.stringify(payload)
  await db`
    INSERT INTO store (id, payload, updated_at)
    VALUES (1, ${json}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
      SET payload = ${json}::jsonb, updated_at = now()
  `
}

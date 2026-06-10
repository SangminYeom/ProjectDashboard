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

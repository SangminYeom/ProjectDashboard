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

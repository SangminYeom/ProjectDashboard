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

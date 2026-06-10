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
  const r = { status: vi.fn(), json: vi.fn(), end: vi.fn() }
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

describe('DB 오류 처리', () => {
  it('readStore 오류 시 500을 반환한다', async () => {
    readStore.mockRejectedValue(new Error('db down'))
    const r = res()
    await handler(req('GET'), r)
    expect(r.status).toHaveBeenCalledWith(500)
    expect(r.json).toHaveBeenCalledWith({ error: 'internal' })
  })

  it('writeStore 오류 시 500을 반환한다', async () => {
    writeStore.mockRejectedValue(new Error('db down'))
    const r = res()
    await handler(req('PUT', { projects: [] }), r)
    expect(r.status).toHaveBeenCalledWith(500)
    expect(r.json).toHaveBeenCalledWith({ error: 'internal' })
  })
})

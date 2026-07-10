// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../api/_auth.js', () => ({
  createToken: vi.fn().mockReturnValue('mock-token'),
}))

import handler from '../../api/auth/login.js'

function req(method, body = null) {
  return { method, body: body ?? {} }
}
function res() {
  const r = { status: vi.fn(), json: vi.fn(), end: vi.fn(), setHeader: vi.fn() }
  r.status.mockReturnValue(r)
  return r
}

beforeEach(() => {
  vi.stubEnv('ACCESS_CODE', 'correct-password')
  vi.stubEnv('SESSION_SECRET', 'test-secret')
})
afterEach(() => vi.unstubAllEnvs())

describe('POST /api/auth/login', () => {
  it('올바른 비밀번호로 로그인하면 쿠키를 설정하고 200을 반환한다', () => {
    const r = res()
    handler(req('POST', { password: 'correct-password' }), r)
    expect(r.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('auth_token=mock-token'))
    expect(r.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('HttpOnly'))
    expect(r.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Secure'))
    expect(r.status).toHaveBeenCalledWith(200)
    expect(r.json).toHaveBeenCalledWith({ ok: true })
  })

  it('잘못된 비밀번호는 401을 반환한다', () => {
    const r = res()
    handler(req('POST', { password: 'wrong' }), r)
    expect(r.status).toHaveBeenCalledWith(401)
    expect(r.json).toHaveBeenCalledWith({ error: 'unauthorized' })
  })

  it('ACCESS_CODE가 설정되지 않으면 500을 반환한다', () => {
    vi.unstubAllEnvs()
    const r = res()
    handler(req('POST', { password: 'anything' }), r)
    expect(r.status).toHaveBeenCalledWith(500)
  })

  it('body 없이 POST하면 401을 반환한다', () => {
    const r = res()
    handler({ method: 'POST', body: null }, r)
    expect(r.status).toHaveBeenCalledWith(401)
    expect(r.json).toHaveBeenCalledWith({ error: 'unauthorized' })
  })

  it('GET 요청은 405를 반환한다', () => {
    const r = res()
    handler(req('GET'), r)
    expect(r.status).toHaveBeenCalledWith(405)
  })
})

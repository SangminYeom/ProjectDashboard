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
    expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' })
  })

  it('SESSION_SECRET이 없으면 false를 반환하고 401을 응답한다', () => {
    vi.unstubAllEnvs()  // remove SESSION_SECRET set in beforeEach
    const req = { headers: { cookie: 'auth_token=some-token' } }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    expect(requireAuth(req, res)).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

// @vitest-environment node
import { it, expect, vi } from 'vitest'
import handler from '../../api/auth/logout.js'

function res() {
  const r = { status: vi.fn(), json: vi.fn(), end: vi.fn(), setHeader: vi.fn() }
  r.status.mockReturnValue(r)
  return r
}

it('POST 로그아웃은 쿠키를 지우고 200을 반환한다', () => {
  const r = res()
  handler({ method: 'POST' }, r)
  expect(r.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Max-Age=0'))
  expect(r.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Secure'))
  expect(r.status).toHaveBeenCalledWith(200)
  expect(r.json).toHaveBeenCalledWith({ ok: true })
})

it('GET 요청은 405를 반환한다', () => {
  const r = res()
  handler({ method: 'GET' }, r)
  expect(r.status).toHaveBeenCalledWith(405)
})

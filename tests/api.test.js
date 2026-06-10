import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadProjects, createDebouncedSave } from '../src/api.js'
import { AuthError } from '../src/auth-error.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('loadProjects', () => {
  it('GET /api/projects 응답을 반환한다', async () => {
    vi.useRealTimers()
    const payload = { projects: [{ id: 'p1' }], recoveredFrom: null }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) }))
    expect(await loadProjects()).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith('/api/projects', { credentials: 'include' })
  })
  it('응답 실패 시 throw', async () => {
    vi.useRealTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(loadProjects()).rejects.toThrow('500')
  })
})

describe('createDebouncedSave', () => {
  it('연속 호출은 마지막 데이터 한 번만 PUT한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const save = createDebouncedSave({ delay: 500 })
    save([{ id: 'a' }])
    save([{ id: 'b' }])
    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ projects: [{ id: 'b' }] })
  })
  it('성공 시 onError(null), 실패 시 onError(에러) 호출', async () => {
    const onError = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const save = createDebouncedSave({ delay: 100, onError })
    save([])
    await vi.advanceTimersByTimeAsync(100)
    expect(onError).toHaveBeenCalledWith(null)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('네트워크 오류')))
    save([])
    await vi.advanceTimersByTimeAsync(100)
    expect(onError.mock.calls.at(-1)[0]).toBeInstanceOf(Error)
  })
})

describe('loadProjects — credentials & AuthError', () => {
  it('credentials: include를 포함해 fetch한다', async () => {
    vi.useRealTimers()
    const payload = { projects: [], recoveredFrom: null }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) })
    vi.stubGlobal('fetch', fetchMock)
    await loadProjects()
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', { credentials: 'include' })
  })

  it('401 응답 시 AuthError를 throw한다', async () => {
    vi.useRealTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(loadProjects()).rejects.toBeInstanceOf(AuthError)
  })
})

describe('createDebouncedSave — 401 처리', () => {
  it('PUT 401 시 onError에 AuthError를 전달한다', async () => {
    const onError = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const save = createDebouncedSave({ delay: 100, onError })
    save([])
    await vi.advanceTimersByTimeAsync(100)
    expect(onError.mock.calls.at(-1)[0]).toBeInstanceOf(AuthError)
  })
})

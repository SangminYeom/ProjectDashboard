import { AuthError } from './auth-error.js'

export { AuthError }

export async function loadProjects() {
  const res = await fetch('/api/projects', { credentials: 'include' })
  if (res.status === 401) throw new AuthError()
  if (!res.ok) throw new Error(`로드 실패: ${res.status}`)
  return res.json()
}

export async function loadSchedules() {
  const res = await fetch('/api/schedules', { credentials: 'include' })
  if (res.status === 401) throw new AuthError()
  if (!res.ok) throw new Error(`로드 실패: ${res.status}`)
  return res.json()
}

export function createDebouncedSave({ endpoint = '/api/projects', bodyKey = 'projects', delay = 500, onError } = {}) {
  let timer = null
  return function save(items) {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [bodyKey]: items }),
          credentials: 'include',
        })
        if (res.status === 401) { onError?.(new AuthError()); return }
        if (!res.ok) throw new Error(`저장 실패: ${res.status}`)
        onError?.(null)
      } catch (err) {
        onError?.(err)
      }
    }, delay)
  }
}

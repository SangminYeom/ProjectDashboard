export async function loadProjects() {
  const res = await fetch('/api/projects')
  if (!res.ok) throw new Error(`로드 실패: ${res.status}`)
  return res.json() // { projects, recoveredFrom }
}

// 변경 시마다 호출하면 delay 후 마지막 데이터만 저장
export function createDebouncedSave({ delay = 500, onError } = {}) {
  let timer = null
  return function save(projects) {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projects }),
        })
        if (!res.ok) throw new Error(`저장 실패: ${res.status}`)
        onError?.(null)
      } catch (err) {
        onError?.(err)
      }
    }, delay)
  }
}

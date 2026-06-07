// 진척률·지연·달성률 계산 (순수 함수)

export function initiativeProgress(initiative) {
  const tasks = initiative.tasks ?? []
  if (tasks.length === 0) return 0
  const sum = tasks.reduce((acc, t) => acc + (t.progress ?? 0), 0)
  return Math.round(sum / tasks.length)
}

export function isTaskDelayed(task, today) {
  return task.endDate < today && (task.progress ?? 0) < 100
}

export function kpiRate(kpi) {
  if (kpi.type !== 'numeric' || !kpi.target || kpi.target < 0) return null
  return Math.round(((kpi.current ?? 0) / kpi.target) * 100)
}

export function projectKpiAverage(project) {
  const rates = (project.kpis ?? []).map(kpiRate).filter((r) => r !== null)
  if (rates.length === 0) return null
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
}

export function countDelayedTasks(project, today) {
  return (project.initiatives ?? [])
    .flatMap((i) => i.tasks ?? [])
    .filter((t) => isTaskDelayed(t, today)).length
}

export function countOpenConsiderations(project) {
  return (project.considerations ?? []).filter((c) => c.status !== '해결').length
}

export function todayStr(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

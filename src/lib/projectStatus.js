import { countOpenIssues, initiativeProgress } from './calc.js'

export function projectProgress(project) {
  const inits = project.initiatives ?? []
  if (inits.length === 0) return 0
  const sum = inits.reduce((acc, i) => acc + initiativeProgress(i), 0)
  return Math.round(sum / inits.length)
}

export function projectSidebarStatus(project) {
  const open = countOpenIssues(project)
  if (open > 0) return { kind: 'issue', text: `쟁점 ${open}`, tone: 'danger' }
  const ops = project.operations ?? []
  if (ops.some((o) => o.status === '이슈')) return { kind: 'op', text: '이슈', tone: 'danger' }
  if (ops.some((o) => o.status === '주의')) return { kind: 'op', text: '주의', tone: 'warning' }
  return { kind: 'progress', text: `${projectProgress(project)}%`, tone: 'muted' }
}

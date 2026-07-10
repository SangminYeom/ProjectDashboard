import { describe, it, expect } from 'vitest'
import { projectProgress, projectSidebarStatus } from '../src/lib/projectStatus.js'

const base = { kpis: [], operations: [], initiatives: [] }

describe('projectProgress', () => {
  it('과제 진척의 평균을 반올림한다', () => {
    const p = { ...base, initiatives: [
      { id: 'a', items: [{ type: 'task', progress: 100 }] },
      { id: 'b', items: [{ type: 'task', progress: 50 }] },
    ] }
    expect(projectProgress(p)).toBe(75)
  })
  it('과제가 없으면 0', () => {
    expect(projectProgress(base)).toBe(0)
  })
})

describe('projectSidebarStatus', () => {
  it('미해결 쟁점이 있으면 쟁점 배지(danger)', () => {
    const p = { ...base, initiatives: [
      { id: 'a', items: [], issues: [{ status: '열림' }, { status: '대응중' }, { status: '해결' }] },
    ] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'issue', text: '쟁점 2', tone: 'danger' })
  })
  it('쟁점이 없고 운영에 이슈가 있으면 이슈 배지(danger)', () => {
    const p = { ...base, operations: [{ status: '이슈' }] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'op', text: '이슈', tone: 'danger' })
  })
  it('쟁점이 없고 운영에 주의가 있으면 주의 배지(warning)', () => {
    const p = { ...base, operations: [{ status: '주의' }] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'op', text: '주의', tone: 'warning' })
  })
  it('그 외에는 진척률 배지(muted)', () => {
    const p = { ...base, initiatives: [{ id: 'a', items: [{ type: 'task', progress: 40 }] }] }
    expect(projectSidebarStatus(p)).toEqual({ kind: 'progress', text: '40%', tone: 'muted' })
  })
})

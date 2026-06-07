import { describe, it, expect } from 'vitest'
import {
  initiativeProgress, isTaskDelayed, kpiRate, projectKpiAverage,
  countDelayedTasks, countOpenConsiderations, todayStr,
} from '../src/lib/calc.js'

describe('initiativeProgress', () => {
  it('태스크 진척률의 평균을 반올림해 반환한다', () => {
    const init = { tasks: [{ progress: 100 }, { progress: 60 }, { progress: 21 }] }
    expect(initiativeProgress(init)).toBe(60) // (100+60+21)/3 = 60.33 → 60
  })
  it('태스크가 없으면 0', () => {
    expect(initiativeProgress({ tasks: [] })).toBe(0)
  })
  it('tasks 키가 없으면 0', () => {
    expect(initiativeProgress({})).toBe(0)
  })
})

describe('isTaskDelayed', () => {
  const today = '2026-06-07'
  it('종료일이 지났고 진척률 < 100이면 지연', () => {
    expect(isTaskDelayed({ endDate: '2026-06-01', progress: 80 }, today)).toBe(true)
  })
  it('종료일이 지났어도 100%면 지연 아님', () => {
    expect(isTaskDelayed({ endDate: '2026-06-01', progress: 100 }, today)).toBe(false)
  })
  it('종료일이 오늘이면 지연 아님', () => {
    expect(isTaskDelayed({ endDate: '2026-06-07', progress: 0 }, today)).toBe(false)
  })
  it('종료일이 미래면 지연 아님', () => {
    expect(isTaskDelayed({ endDate: '2026-12-31', progress: 0 }, today)).toBe(false)
  })
})

describe('kpiRate', () => {
  it('수치형: current/target × 100 반올림', () => {
    expect(kpiRate({ type: 'numeric', target: 10, current: 7 })).toBe(70)
  })
  it('target이 0이면 null', () => {
    expect(kpiRate({ type: 'numeric', target: 0, current: 5 })).toBe(null)
  })
  it('정성형이면 null', () => {
    expect(kpiRate({ type: 'qualitative', status: '순항' })).toBe(null)
  })
  it('target이 음수면 null', () => {
    expect(kpiRate({ type: 'numeric', target: -10, current: 5 })).toBe(null)
  })
  it('current가 없으면 0으로 계산', () => {
    expect(kpiRate({ type: 'numeric', target: 10 })).toBe(0)
  })
})

describe('projectKpiAverage', () => {
  it('수치형 KPI만 평균 (정성형 제외)', () => {
    const p = { kpis: [
      { type: 'numeric', target: 10, current: 7 },   // 70
      { type: 'numeric', target: 100, current: 90 }, // 90
      { type: 'qualitative', status: '순항' },
    ] }
    expect(projectKpiAverage(p)).toBe(80)
  })
  it('수치형 KPI가 없으면 null', () => {
    expect(projectKpiAverage({ kpis: [{ type: 'qualitative', status: '달성' }] })).toBe(null)
    expect(projectKpiAverage({ kpis: [] })).toBe(null)
  })
})

describe('countDelayedTasks', () => {
  it('모든 과제의 지연 태스크 수를 합산', () => {
    const p = { initiatives: [
      { tasks: [{ endDate: '2026-01-01', progress: 50 }, { endDate: '2026-12-31', progress: 0 }] },
      { tasks: [{ endDate: '2026-02-01', progress: 99 }] },
    ] }
    expect(countDelayedTasks(p, '2026-06-07')).toBe(2)
  })
  it('initiatives나 tasks 키가 없어도 0', () => {
    expect(countDelayedTasks({}, '2026-06-07')).toBe(0)
    expect(countDelayedTasks({ initiatives: [{}] }, '2026-06-07')).toBe(0)
  })
})

describe('countOpenConsiderations', () => {
  it('해결 상태가 아닌 건만 센다', () => {
    const p = { considerations: [
      { status: '열림' }, { status: '대응중' }, { status: '해결' },
    ] }
    expect(countOpenConsiderations(p)).toBe(2)
  })
})

describe('todayStr', () => {
  it('YYYY-MM-DD 형식으로 반환', () => {
    expect(todayStr(new Date('2026-06-07T10:30:00'))).toBe('2026-06-07')
  })
})

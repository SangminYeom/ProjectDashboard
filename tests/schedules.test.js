import { describe, it, expect } from 'vitest'
import { groupSchedules, isPastSchedule } from '../src/lib/schedules.js'

describe('groupSchedules', () => {
  it('date가 없는 항목을 undated로 분리한다', () => {
    const schedules = [
      { id: 's1', title: 'A', date: null },
      { id: 's2', title: 'B', date: '2026-08-01' },
    ]
    const { undated, dated } = groupSchedules(schedules)
    expect(undated).toEqual([schedules[0]])
    expect(dated).toEqual([schedules[1]])
  })

  it('dated 항목을 날짜 오름차순으로 정렬한다', () => {
    const schedules = [
      { id: 's1', title: 'A', date: '2026-09-01' },
      { id: 's2', title: 'B', date: '2026-07-01' },
      { id: 's3', title: 'C', date: '2026-08-01' },
    ]
    const { dated } = groupSchedules(schedules)
    expect(dated.map((s) => s.id)).toEqual(['s2', 's3', 's1'])
  })

  it('빈 배열이면 둘 다 빈 배열', () => {
    expect(groupSchedules([])).toEqual({ undated: [], dated: [] })
  })
})

describe('isPastSchedule', () => {
  it('날짜가 오늘보다 이전이면 true', () => {
    expect(isPastSchedule({ date: '2026-07-01' }, '2026-07-15')).toBe(true)
  })
  it('날짜가 오늘 이후면 false', () => {
    expect(isPastSchedule({ date: '2026-08-01' }, '2026-07-15')).toBe(false)
  })
  it('날짜가 오늘이면 false', () => {
    expect(isPastSchedule({ date: '2026-07-15' }, '2026-07-15')).toBe(false)
  })
  it('date가 null이면 false', () => {
    expect(isPastSchedule({ date: null }, '2026-07-15')).toBe(false)
  })
})

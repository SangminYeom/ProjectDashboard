import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Gantt from '../../src/components/Gantt.jsx'

const tasks = [
  { id: 't1', type: 'task', name: '서버 이전', startDate: '2026-01-01', endDate: '2026-03-31', progress: 100, status: '완료' },
  { id: 't2', type: 'task', name: '모니터링 구축', startDate: '2026-04-01', endDate: '2026-05-31', progress: 20, status: '진행중' },
]

const milestone = { id: 'm1', type: 'milestone', name: '서비스 배포일', date: '2026-06-15' }

it('태스크가 없으면 안내 문구를 표시한다', () => {
  render(<Gantt items={[]} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />)
  expect(screen.getByText('태스크가 없습니다.')).toBeInTheDocument()
})

it('지연 태스크에 ⚠ 지연 표시, 완료 태스크는 상태 그대로', () => {
  render(<Gantt items={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />)
  expect(screen.getByText('⚠ 지연')).toBeInTheDocument()  // t2: 종료일 지남 + 20%
  expect(screen.getByText('완료')).toBeInTheDocument()     // t1
})

it('진척률 인라인 수정 시 onUpdate 호출 (0~100 범위로 보정)', () => {
  const onUpdate = vi.fn()
  render(<Gantt items={tasks} onUpdate={onUpdate} onRemove={() => {}} today="2026-06-07" />)
  fireEvent.change(screen.getByLabelText('모니터링 구축 진척률'), { target: { value: '150' } })
  expect(onUpdate).toHaveBeenCalledWith('t2', { progress: 100 })
})

it('막대 위치가 기간에 비례한다', () => {
  const { container } = render(
    <Gantt items={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  const bars = container.querySelectorAll('.gantt-bar')
  expect(bars[0].style.left).toBe('0%') // 첫 태스크는 범위 시작점
  expect(parseFloat(bars[1].style.left)).toBeGreaterThan(50) // 4월 시작은 중반 이후
})

it('모든 태스크가 미래여도 오늘 라벨이 0% 이상에 위치한다', () => {
  const future = [{ id: 'f1', type: 'task', name: '미래 태스크', startDate: '2026-07-01', endDate: '2026-08-31', progress: 0, status: '예정' }]
  const { container } = render(
    <Gantt items={future} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  const todayPill = container.querySelector('.today-marker-pill')
  expect(parseFloat(todayPill.style.left)).toBeGreaterThanOrEqual(0)
})

it('오늘 표시는 세로선 없이 헤더의 라벨(화살표 포함) 하나로만 간략히 표시된다', () => {
  const { container } = render(
    <Gantt items={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  // 행을 관통하는 세로선은 없다
  expect(container.querySelectorAll('.today-marker')).toHaveLength(0)
  // '오늘' 라벨은 헤더에 하나만
  expect(container.querySelectorAll('.today-marker-pill')).toHaveLength(1)
})

it('마일스톤 행이 렌더링된다', () => {
  render(
    <Gantt
      items={[...tasks, milestone]}
      onUpdate={() => {}} onRemove={() => {}} onReorder={() => {}}
      today="2026-06-07"
    />
  )
  expect(screen.getByText('서비스 배포일')).toBeInTheDocument()
  expect(screen.getByText('◆ 마일스톤')).toBeInTheDocument()
})

it('마일스톤만 있고 tasks가 없어도 렌더링된다', () => {
  render(
    <Gantt
      items={[milestone]}
      onUpdate={() => {}} onRemove={() => {}} onReorder={() => {}}
      today="2026-06-07"
    />
  )
  expect(screen.getByText('서비스 배포일')).toBeInTheDocument()
})

it('마일스톤 date가 Gantt min/max 범위에 포함된다', () => {
  const futureMilestone = { id: 'm2', type: 'milestone', name: '최종완료', date: '2027-01-01' }
  const { container } = render(
    <Gantt
      items={[...tasks, futureMilestone]}
      onUpdate={() => {}} onRemove={() => {}} onReorder={() => {}}
      today="2026-06-07"
    />
  )
  const bars = container.querySelectorAll('.gantt-bar')
  expect(parseFloat(bars[0].style.left)).toBeGreaterThanOrEqual(0)
  expect(container.querySelector('.milestone-diamond')).toBeInTheDocument()
})

it('막대 안에 진척률만큼 채워지는 fill이 렌더링된다 (지라식 진척 표시)', () => {
  const { container } = render(
    <Gantt items={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  const fills = container.querySelectorAll('.gantt-bar-fill')
  expect(fills).toHaveLength(2)
  expect(fills[0].style.width).toBe('100%') // t1: progress 100
  expect(fills[1].style.width).toBe('20%')  // t2: progress 20
})

it('타임라인 배경에 격자선이 렌더링된다 (헤더·태스크 트랙 공통)', () => {
  const { container } = render(
    <Gantt items={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  // 트랙 3개(헤더 1 + 태스크 2) × 격자선 5개
  expect(container.querySelectorAll('.gantt-gridline')).toHaveLength(15)
})

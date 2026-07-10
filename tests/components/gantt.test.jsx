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

it('모든 태스크가 미래여도 오늘선이 0% 이상에 위치한다', () => {
  const future = [{ id: 'f1', type: 'task', name: '미래 태스크', startDate: '2026-07-01', endDate: '2026-08-31', progress: 0, status: '예정' }]
  const { container } = render(
    <Gantt items={future} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  const todayMarker = container.querySelector('.today-marker')
  expect(parseFloat(todayMarker.style.left)).toBeGreaterThanOrEqual(0)
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

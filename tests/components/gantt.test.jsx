import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Gantt from '../../src/components/Gantt.jsx'

const tasks = [
  { id: 't1', name: '서버 이전', startDate: '2026-01-01', endDate: '2026-03-31', progress: 100, status: '완료' },
  { id: 't2', name: '모니터링 구축', startDate: '2026-04-01', endDate: '2026-05-31', progress: 20, status: '진행중' },
]

it('태스크가 없으면 안내 문구를 표시한다', () => {
  render(<Gantt tasks={[]} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />)
  expect(screen.getByText('태스크가 없습니다.')).toBeInTheDocument()
})

it('지연 태스크에 ⚠ 지연 표시, 완료 태스크는 상태 그대로', () => {
  render(<Gantt tasks={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />)
  expect(screen.getByText('⚠ 지연')).toBeInTheDocument()  // t2: 종료일 지남 + 20%
  expect(screen.getByText('완료')).toBeInTheDocument()     // t1
})

it('진척률 인라인 수정 시 onUpdate 호출 (0~100 범위로 보정)', () => {
  const onUpdate = vi.fn()
  render(<Gantt tasks={tasks} onUpdate={onUpdate} onRemove={() => {}} today="2026-06-07" />)
  fireEvent.change(screen.getByLabelText('모니터링 구축 진척률'), { target: { value: '150' } })
  expect(onUpdate).toHaveBeenCalledWith('t2', { progress: 100 })
})

it('막대 위치가 기간에 비례한다', () => {
  const { container } = render(
    <Gantt tasks={tasks} onUpdate={() => {}} onRemove={() => {}} today="2026-06-07" />
  )
  const bars = container.querySelectorAll('.gantt-bar')
  expect(bars[0].style.left).toBe('0%') // 첫 태스크는 범위 시작점
  expect(parseFloat(bars[1].style.left)).toBeGreaterThan(50) // 4월 시작은 중반 이후
})

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Schedules from '../../src/pages/Schedules.jsx'

const schedules = [
  { id: 's1', title: '워크샵', date: '2026-08-01', memo: '', createdAt: '', updatedAt: '' },
  { id: 's2', title: '임원 보고', date: null, memo: '분기별', createdAt: '', updatedAt: '' },
]

it('제목, 날짜 미정 그룹, 날짜 항목을 렌더한다', () => {
  render(<Schedules schedules={schedules} onChange={() => {}} />)
  expect(screen.getByRole('heading', { name: '주요 일정' })).toBeInTheDocument()
  expect(screen.getByText('날짜 미정')).toBeInTheDocument()
  expect(screen.getByText('워크샵')).toBeInTheDocument()
  expect(screen.getByText('임원 보고')).toBeInTheDocument()
})

it('일정이 없으면 안내 문구를 보여준다', () => {
  render(<Schedules schedules={[]} onChange={() => {}} />)
  expect(screen.getByText('등록된 일정이 없습니다.')).toBeInTheDocument()
})

it('일정 추가 버튼 → 폼 제출 시 onChange가 새 항목을 포함해 호출된다', () => {
  const onChange = vi.fn()
  render(<Schedules schedules={schedules} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '+ 일정 추가' }))
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '신규 일정' } })
  fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-09-01' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ title: '신규 일정', date: '2026-09-01' })]),
  )
  expect(onChange.mock.calls[0][0]).toHaveLength(3)
})

it('수정 버튼 → 폼 제출 시 onChange가 해당 항목만 변경해 호출된다', () => {
  const onChange = vi.fn()
  render(<Schedules schedules={schedules} onChange={onChange} />)
  // '워크샵'(s1)의 수정 버튼만 정확히 지정 — 목록 순서(미정 그룹이 먼저 렌더)에 의존하지 않도록 aria-label로 선택
  fireEvent.click(screen.getByRole('button', { name: '워크샵 수정' }))
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '워크샵(변경)' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const updated = onChange.mock.calls[0][0]
  expect(updated).toHaveLength(2)
  expect(updated.find((s) => s.id === 's1').title).toBe('워크샵(변경)')
})

it('삭제 버튼 클릭 시 confirm 후 onChange가 해당 항목 제외하고 호출된다', () => {
  const onChange = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<Schedules schedules={schedules} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '워크샵 삭제' }))
  const remaining = onChange.mock.calls[0][0]
  expect(remaining).toEqual([schedules[1]])
})

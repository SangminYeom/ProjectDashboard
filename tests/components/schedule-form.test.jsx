import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ScheduleForm from '../../src/components/ScheduleForm.jsx'

it('제목과 날짜를 입력해 onSubmit을 호출한다', () => {
  const onSubmit = vi.fn()
  render(<ScheduleForm onSubmit={onSubmit} onClose={() => {}} />)
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '워크샵' } })
  fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-08-01' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onSubmit).toHaveBeenCalledWith({ title: '워크샵', date: '2026-08-01', memo: '' })
})

it('날짜 미정 체크 시 date는 null로 제출되고 날짜 입력은 비활성화된다', () => {
  const onSubmit = vi.fn()
  render(<ScheduleForm onSubmit={onSubmit} onClose={() => {}} />)
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '임원 보고' } })
  fireEvent.click(screen.getByLabelText('날짜 미정'))
  expect(screen.getByLabelText('날짜')).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onSubmit).toHaveBeenCalledWith({ title: '임원 보고', date: null, memo: '' })
})

it('initial 값이 있으면 수정 폼(저장 버튼)으로 표시되고 값이 채워진다', () => {
  const initial = { id: 's1', title: '워크샵', date: '2026-08-01', memo: '메모' }
  render(<ScheduleForm initial={initial} onSubmit={() => {}} onClose={() => {}} />)
  expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  expect(screen.getByLabelText('제목')).toHaveValue('워크샵')
  expect(screen.getByLabelText('날짜 미정')).not.toBeChecked()
})

it('initial의 date가 null이면 날짜 미정이 체크된 채로 표시된다', () => {
  const initial = { id: 's2', title: '임원 보고', date: null, memo: '' }
  render(<ScheduleForm initial={initial} onSubmit={() => {}} onClose={() => {}} />)
  expect(screen.getByLabelText('날짜 미정')).toBeChecked()
  expect(screen.getByLabelText('날짜')).toBeDisabled()
})

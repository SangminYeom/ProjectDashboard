import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ProjectForm from '../../src/components/ProjectForm.jsx'

it('입력한 값으로 onSubmit을 호출한다', () => {
  const onSubmit = vi.fn()
  render(<ProjectForm onSubmit={onSubmit} onClose={() => {}} />)
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '신규 과제' } })
  fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-01-01' } })
  fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: '신규 과제', startDate: '2026-01-01', endDate: '2026-12-31' }),
  )
})

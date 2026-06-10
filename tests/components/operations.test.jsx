import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import OperationsTable from '../../src/components/OperationsTable.jsx'

const operations = [
  { id: 'o1', name: '주간 보고', cycle: '주', owner: '김OO', status: '정상', memo: '' },
]

it('운영업무 행을 표시한다', () => {
  render(<OperationsTable operations={operations} onChange={() => {}} />)
  expect(screen.getByDisplayValue('주간 보고')).toBeInTheDocument()
  expect(screen.getByLabelText('주간 보고 상태')).toHaveValue('정상')
})

it('상태 인라인 변경 시 onChange 호출', () => {
  const onChange = vi.fn()
  render(<OperationsTable operations={operations} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('주간 보고 상태'), { target: { value: '이슈' } })
  expect(onChange).toHaveBeenCalledWith([{ ...operations[0], status: '이슈' }])
})

it('추가 폼으로 새 운영업무를 추가한다', () => {
  const onChange = vi.fn()
  render(<OperationsTable operations={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 운영업무 추가'))
  fireEvent.change(screen.getByLabelText(/업무명/), { target: { value: '서버 점검' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange.mock.calls[0][0][0]).toMatchObject({ name: '서버 점검', status: '정상' })
})

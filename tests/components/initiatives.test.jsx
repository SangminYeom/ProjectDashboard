import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Initiatives from '../../src/components/Initiatives.jsx'

const initiatives = [{
  id: 'i1', name: '인프라 전환', description: '', owner: '홍길동',
  tasks: [
    { id: 't1', name: '서버 이전', startDate: '2026-01-01', endDate: '2026-03-31', progress: 100, status: '완료' },
    { id: 't2', name: 'DB 이전', startDate: '2026-03-01', endDate: '2026-08-31', progress: 60, status: '진행중' },
  ],
}]

it('과제명·자동 계산 진척률·담당자를 표시한다', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('인프라 전환')).toBeInTheDocument()
  expect(screen.getByText(/진척 80%/)).toBeInTheDocument() // (100+60)/2
  expect(screen.getByText(/담당 홍길동/)).toBeInTheDocument()
})

it('과제 추가 폼으로 새 과제를 추가한다', () => {
  const onChange = vi.fn()
  render(<Initiatives initiatives={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 과제 추가'))
  fireEvent.change(screen.getByLabelText(/과제명/), { target: { value: '데이터 표준화' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ name: '데이터 표준화', tasks: [] })
})

it('태스크 추가 폼으로 과제에 태스크를 추가한다', () => {
  const onChange = vi.fn()
  render(<Initiatives initiatives={initiatives} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 태스크 추가'))
  fireEvent.change(screen.getByLabelText(/태스크명/), { target: { value: '모니터링' } })
  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-07-01' } })
  fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-09-30' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const updated = onChange.mock.calls[0][0][0]
  expect(updated.tasks).toHaveLength(3)
  expect(updated.tasks[2]).toMatchObject({ name: '모니터링', progress: 0, status: '예정' })
})

it('과제 헤더 클릭으로 접고 펼친다', () => {
  render(<Initiatives initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('서버 이전')).toBeInTheDocument()
  fireEvent.click(screen.getByText('인프라 전환'))
  expect(screen.queryByText('서버 이전')).not.toBeInTheDocument()
})

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ProjectIssues from '../../src/components/ProjectIssues.jsx'

const initiatives = [
  { id: 'i1', name: '인프라 전환', items: [], issues: [
    { id: 'a', content: '계약 지연', importance: '상', status: '열림', response: '', createdDate: '2026-06-01', resolvedDate: null },
  ] },
  { id: 'i2', name: '보안 강화', items: [], issues: [
    { id: 'b', content: '점검 지연', importance: '중', status: '해결', response: '', createdDate: '2026-06-02', resolvedDate: '2026-06-10' },
  ] },
]

it('여러 과제의 미해결 쟁점을 소속 과제명과 함께 보여준다', () => {
  render(<ProjectIssues initiatives={initiatives} onChange={() => {}} />)
  expect(screen.getByText('계약 지연')).toBeInTheDocument()
  expect(screen.getByText('인프라 전환')).toBeInTheDocument()
  expect(screen.queryByText('점검 지연')).not.toBeInTheDocument()
})

it('상태를 해결로 바꾸면 해당 과제의 issue만 갱신해 onChange 호출', () => {
  const onChange = vi.fn()
  render(<ProjectIssues initiatives={initiatives} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('계약 지연 상태'), { target: { value: '해결' } })
  const next = onChange.mock.calls[0][0]
  const i1 = next.find((i) => i.id === 'i1')
  expect(i1.issues[0].status).toBe('해결')
  expect(i1.issues[0].resolvedDate).toBeTruthy()
})

it('추가 폼에서 소속 과제를 골라 쟁점을 추가한다', () => {
  const onChange = vi.fn()
  render(<ProjectIssues initiatives={initiatives} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /쟁점 추가/ }))
  fireEvent.change(screen.getByLabelText('소속 과제'), { target: { value: 'i2' } })
  fireEvent.change(screen.getByLabelText('내용'), { target: { value: '신규 쟁점' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const next = onChange.mock.calls[0][0]
  const i2 = next.find((i) => i.id === 'i2')
  expect(i2.issues.some((x) => x.content === '신규 쟁점' && x.status === '열림')).toBe(true)
})

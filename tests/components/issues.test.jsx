import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import IssueLog from '../../src/components/IssueLog.jsx'

const issues = [
  { id: 'i1', content: '벤더 계약 지연', response: '대체 벤더 확보', importance: '상', status: '열림', createdDate: '2026-06-01', resolvedDate: null },
  { id: 'i2', content: '인력 이탈 리스크', response: '', importance: '중', status: '대응중', createdDate: '2026-05-01', resolvedDate: null },
  { id: 'i3', content: '예산 이슈', response: '', importance: '하', status: '해결', createdDate: '2026-04-01', resolvedDate: '2026-05-15' },
]

it('미해결 건은 표시하고 해결 건은 접어둔다', () => {
  render(<IssueLog issues={issues} onChange={() => {}} />)
  expect(screen.getByText('벤더 계약 지연')).toBeInTheDocument()
  expect(screen.getByText('인력 이탈 리스크')).toBeInTheDocument()
  expect(screen.queryByText('예산 이슈')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText(/해결됨 1건 보기/))
  expect(screen.getByText('예산 이슈')).toBeInTheDocument()
})

it('상태를 해결로 바꾸면 resolvedDate가 기록된다', () => {
  const onChange = vi.fn()
  render(<IssueLog issues={issues} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('벤더 계약 지연 상태'), { target: { value: '해결' } })
  const updated = onChange.mock.calls[0][0].find((i) => i.id === 'i1')
  expect(updated.status).toBe('해결')
  expect(updated.resolvedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('추가 폼으로 새 쟁점을 등록한다 (기본 상태: 열림, 기본 중요도: 중)', () => {
  const onChange = vi.fn()
  render(<IssueLog issues={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 쟁점 추가'))
  fireEvent.change(screen.getByLabelText(/내용/), { target: { value: '신규 리스크' } })
  fireEvent.change(screen.getByLabelText(/대응안/), { target: { value: '모니터링 강화' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ content: '신규 리스크', response: '모니터링 강화', importance: '중', status: '열림' })
  expect(added.createdDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('드래그로 미해결 쟁점의 순서를 바꾼다 (해결 건은 그대로 뒤에 유지)', () => {
  const onChange = vi.fn()
  render(<IssueLog issues={issues} onChange={onChange} />)
  const dt = { types: ['application/issue-idx'], setData: vi.fn(), getData: vi.fn().mockReturnValue('0'), dropEffect: null }
  const firstCard = screen.getByText('벤더 계약 지연').closest('.issue-card')
  const secondCard = screen.getByText('인력 이탈 리스크').closest('.issue-card')
  fireEvent.dragStart(firstCard, { dataTransfer: dt })
  fireEvent.dragOver(secondCard, { dataTransfer: dt })
  fireEvent.drop(secondCard, { dataTransfer: dt })
  const result = onChange.mock.calls[0][0]
  expect(result.map((i) => i.id)).toEqual(['i2', 'i1', 'i3'])
})

it('쟁점을 삭제할 수 있다', () => {
  const onChange = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<IssueLog issues={issues} onChange={onChange} />)
  fireEvent.click(screen.getByLabelText('벤더 계약 지연 삭제'))
  expect(onChange.mock.calls[0][0].map((i) => i.id)).toEqual(['i2', 'i3'])
})

it('대응안이 있으면 접힌 상태로 표시되고, 클릭하면 등록일이 펼쳐진다', () => {
  render(<IssueLog issues={issues} onChange={() => {}} />)
  expect(screen.getByText('대체 벤더 확보')).toBeInTheDocument()
  expect(screen.queryByText(/등록 2026-06-01/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('벤더 계약 지연 대응안 펼치기'))
  expect(screen.getByText(/등록 2026-06-01/)).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('벤더 계약 지연 대응안 접기'))
  expect(screen.queryByText(/등록 2026-06-01/)).not.toBeInTheDocument()
})

it('대응안이 없으면 대응안 버튼이 렌더링되지 않는다', () => {
  render(<IssueLog issues={issues} onChange={() => {}} />)
  expect(screen.queryByLabelText('인력 이탈 리스크 대응안 펼치기')).not.toBeInTheDocument()
})

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ConsiderationLog from '../../src/components/ConsiderationLog.jsx'

const considerations = [
  { id: 'c1', title: '벤더 계약 지연', content: '', response: '대체 벤더 확보', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null },
  { id: 'c2', title: '인력 이탈 리스크', content: '', response: '', severity: '중간', status: '대응중', createdDate: '2026-05-01', resolvedDate: null },
  { id: 'c3', title: '예산 이슈', content: '', response: '', severity: '낮음', status: '해결', createdDate: '2026-04-01', resolvedDate: '2026-05-15' },
]

it('미해결 건은 표시하고 해결 건은 접어둔다', () => {
  render(<ConsiderationLog considerations={considerations} onChange={() => {}} />)
  expect(screen.getByText('벤더 계약 지연')).toBeInTheDocument()
  expect(screen.getByText('인력 이탈 리스크')).toBeInTheDocument()
  expect(screen.queryByText('예산 이슈')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText(/해결됨 1건 보기/))
  expect(screen.getByText('예산 이슈')).toBeInTheDocument()
})

it('상태를 해결로 바꾸면 resolvedDate가 기록된다', () => {
  const onChange = vi.fn()
  render(<ConsiderationLog considerations={considerations} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('벤더 계약 지연 상태'), { target: { value: '해결' } })
  const updated = onChange.mock.calls[0][0].find((c) => c.id === 'c1')
  expect(updated.status).toBe('해결')
  expect(updated.resolvedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('추가 폼으로 새 고려사항을 등록한다 (기본 상태: 열림)', () => {
  const onChange = vi.fn()
  render(<ConsiderationLog considerations={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 고려사항 추가'))
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '신규 리스크' } })
  fireEvent.change(screen.getByLabelText(/대응안/), { target: { value: '모니터링 강화' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ title: '신규 리스크', response: '모니터링 강화', status: '열림' })
  expect(added.createdDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

it('중요도 높은 순으로 정렬된다', () => {
  const reversed = [considerations[1], considerations[0]] // 중간, 높음 순으로 입력
  render(<ConsiderationLog considerations={reversed} onChange={() => {}} />)
  const titles = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
  expect(titles).toEqual(['벤더 계약 지연', '인력 이탈 리스크'])
})

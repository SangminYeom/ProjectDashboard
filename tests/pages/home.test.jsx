import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Home from '../../src/pages/Home.jsx'

const projects = [{
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
  initiatives: [{ id: 'i1', name: '과제', description: '', owner: '', tasks: [
    { id: 't1', name: '지연 태스크', startDate: '2026-01-01', endDate: '2026-02-01', progress: 50, status: '진행중' },
  ] }],
  operations: [],
  considerations: [{ id: 'c1', title: 't', content: '', response: '', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
}]

it('전체 요약과 프로젝트 카드를 표시한다', () => {
  render(<Home projects={projects} onOpen={() => {}} onChange={() => {}} />)
  expect(screen.getByText(/프로젝트 1개 · 지연 태스크 1건 · 미해결 고려사항 1건/)).toBeInTheDocument()
  expect(screen.getByText('차세대 시스템')).toBeInTheDocument()
  expect(screen.getByText('KPI 70%')).toBeInTheDocument()
  expect(screen.getByText('지연 1')).toBeInTheDocument()
})

it('카드 클릭 시 onOpen(id) 호출', () => {
  const onOpen = vi.fn()
  render(<Home projects={projects} onOpen={onOpen} onChange={() => {}} />)
  fireEvent.click(screen.getByText('차세대 시스템'))
  expect(onOpen).toHaveBeenCalledWith('p1')
})

it('새 프로젝트 폼으로 프로젝트를 추가한다', () => {
  const onChange = vi.fn()
  render(<Home projects={[]} onOpen={() => {}} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ 새 프로젝트'))
  fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '신규 프로젝트' } })
  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-07-01' } })
  fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({
    name: '신규 프로젝트', kpis: [], initiatives: [], operations: [], considerations: [],
  })
})

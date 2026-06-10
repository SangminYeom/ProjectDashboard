import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Home from '../../src/pages/Home.jsx'

const projects = [
  {
    id: 'p1', name: '차세대 시스템', description: '',
    startDate: '2026-01-01', endDate: '2026-12-31',
    kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
    initiatives: [{ id: 'i1', name: '인프라 전환', description: '', owner: '', tasks: [] }],
    operations: [
      { id: 'o1', name: '주간 보고', cycle: '주', owner: '', status: '정상', memo: '' },
      { id: 'o2', name: '이슈 대응', cycle: '일', owner: '', status: '이슈', memo: '' },
    ],
    considerations: [{ id: 'c1', title: '계약 지연', content: '', response: '', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
  },
]

function setup() {
  const onOpen = vi.fn()
  const onChange = vi.fn()
  render(<Home projects={projects} onOpen={onOpen} onChange={onChange} />)
  return { onOpen, onChange }
}

it('페이지 제목과 요약 통계를 표시한다', () => {
  setup()
  expect(screen.getByText('고객가치혁신유닛 Project Dashboard')).toBeInTheDocument()
  expect(screen.getByText('1개')).toBeInTheDocument()
})

it('카드에 이름·과제명·KPI 수치 포맷을 표시한다', () => {
  setup()
  expect(screen.getByText('차세대 시스템')).toBeInTheDocument()
  expect(screen.getByText('인프라 전환')).toBeInTheDocument()
  expect(screen.getByText('매출')).toBeInTheDocument()
  expect(screen.getByText(/7 \/ 10억/)).toBeInTheDocument()
})

it('카드 클릭 시 onOpen을 호출한다', () => {
  const { onOpen } = setup()
  fireEvent.click(screen.getByText('차세대 시스템').closest('button'))
  expect(onOpen).toHaveBeenCalledWith('p1')
})

it('새 프로젝트 추가 폼을 열 수 있다', () => {
  setup()
  fireEvent.click(screen.getByText('+ 새 프로젝트'))
  expect(screen.getByRole('heading', { name: '새 프로젝트' })).toBeInTheDocument()
})

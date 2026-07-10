import { render, screen } from '@testing-library/react'
import ProjectOverview from '../../src/components/ProjectOverview.jsx'

const project = {
  id: 'p1', name: 'X', kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
  initiatives: [
    { id: 'i1', name: '인프라 전환', items: [{ type: 'task', progress: 50 }],
      issues: [{ id: 'is1', content: '계약 지연', importance: '상', status: '열림' }] },
  ],
  operations: [],
}

it('KPI·과제 진척·주요 쟁점(소속 과제명 포함)을 보여준다', () => {
  render(<ProjectOverview project={project} onChange={() => {}} />)
  expect(screen.getByText('매출')).toBeInTheDocument()
  expect(screen.getAllByText('인프라 전환')[0]).toBeInTheDocument()
  expect(screen.getByText('계약 지연')).toBeInTheDocument()
  expect(screen.getAllByText('인프라 전환').length).toBeGreaterThan(0)
})

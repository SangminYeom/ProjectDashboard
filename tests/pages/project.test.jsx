import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,test'),
}))

import Project from '../../src/pages/Project.jsx'

const project = {
  id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
  kpis: [{ id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }],
  initiatives: [{ id: 'i1', name: '인프라 전환', description: '', owner: '', tasks: [] }],
  operations: [{ id: 'o1', name: '주간 보고', cycle: '주', owner: '', status: '정상', memo: '' }],
  considerations: [{ id: 'c1', title: '계약 지연', content: '', response: '', severity: '높음', status: '열림', createdDate: '2026-06-01', resolvedDate: null }],
}

function setup() {
  const onChange = vi.fn()
  const onBack = vi.fn()
  render(<Project project={project} onChange={onChange} onDelete={() => {}} onBack={onBack} />)
  return { onChange, onBack }
}

it('프로젝트명·기간·KPI 바를 표시하고 기본 탭은 중점수행과제', () => {
  setup()
  expect(screen.getAllByText('차세대 시스템')[0]).toBeInTheDocument()
  expect(screen.getAllByText(/2026-01-01\s*–\s*2026-12-31/)[0]).toBeInTheDocument()
  expect(screen.getByText('70%')).toBeInTheDocument()              // KPI 바 (snapshot은 '진척 70%'로 다름)
  expect(screen.getAllByText('인프라 전환')[0]).toBeInTheDocument()  // 기본 탭 내용
})

it('탭 전환이 동작한다', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /운영업무/ }))
  expect(screen.getByDisplayValue('주간 보고')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /고려사항/ }))
  expect(screen.getAllByText('계약 지연')[0]).toBeInTheDocument()
})

it('뒤로 가기 버튼이 onBack을 호출한다', () => {
  const { onBack } = setup()
  fireEvent.click(screen.getByRole('button', { name: '← 홈' }))
  expect(onBack).toHaveBeenCalled()
})

it('하위 컴포넌트 변경이 onChange(updater)로 전파된다', () => {
  const { onChange } = setup()
  fireEvent.change(screen.getByLabelText('매출 현재값'), { target: { value: '8' } })
  expect(onChange).toHaveBeenCalledTimes(1)
  const updater = onChange.mock.calls[0][0]
  expect(updater(project).kpis[0].current).toBe(8)
})

it('PNG 내보내기 버튼이 존재한다', () => {
  setup()
  expect(screen.getByRole('button', { name: 'PNG 내보내기' })).toBeInTheDocument()
})

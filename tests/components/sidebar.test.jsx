import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Sidebar from '../../src/components/Sidebar.jsx'

const projects = [
  { id: 'p1', name: 'DUR 고도화', kpis: [], operations: [],
    initiatives: [{ id: 'i1', items: [], issues: [{ status: '열림' }] }] },
  { id: 'p2', name: '청구 시스템', kpis: [], operations: [],
    initiatives: [{ id: 'i2', items: [{ type: 'task', progress: 80 }], issues: [] }] },
]

it('전체 개요·프로젝트 목록·새 프로젝트를 렌더한다', () => {
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={() => {}} onAddProject={() => {}} />)
  expect(screen.getByRole('button', { name: /전체 개요/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /DUR 고도화/ })).toBeInTheDocument()
  expect(screen.getByText('쟁점 1')).toBeInTheDocument()
  expect(screen.getByText('80%')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /새 프로젝트/ })).toBeInTheDocument()
})

it('프로젝트 클릭 시 onNavigate가 해당 id로 호출된다', () => {
  const onNavigate = vi.fn()
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={onNavigate} onAddProject={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /DUR 고도화/ }))
  expect(onNavigate).toHaveBeenCalledWith({ page: 'project', id: 'p1' })
})

it('새 프로젝트 클릭 시 onAddProject 호출', () => {
  const onAddProject = vi.fn()
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={() => {}} onAddProject={onAddProject} />)
  fireEvent.click(screen.getByRole('button', { name: /새 프로젝트/ }))
  expect(onAddProject).toHaveBeenCalled()
})

it('주요 일정 메뉴 클릭 시 onNavigate가 호출된다', () => {
  const onNavigate = vi.fn()
  render(<Sidebar projects={projects} view={{ page: 'home' }} onNavigate={onNavigate} onAddProject={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /주요 일정/ }))
  expect(onNavigate).toHaveBeenCalledWith({ page: 'schedules' })
})

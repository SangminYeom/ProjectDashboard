import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const { sample, saveMock } = vi.hoisted(() => {
  const sample = {
    id: 'p1', name: '차세대 시스템', description: '', startDate: '2026-01-01', endDate: '2026-12-31',
    kpis: [], initiatives: [], operations: [], considerations: [],
  }
  const saveMock = vi.fn()
  return { sample, saveMock }
})

vi.mock('../src/api.js', () => ({
  loadProjects: vi.fn().mockResolvedValue({ projects: [sample], recoveredFrom: null }),
  createDebouncedSave: vi.fn(() => saveMock),
}))

import App from '../src/App.jsx'
import { loadProjects } from '../src/api.js'
import { AuthError } from '../src/auth-error.js'

it('로드 후 홈 화면을 보여준다', async () => {
  render(<App />)
  expect(await screen.findByText('차세대 시스템')).toBeInTheDocument()
})

it('카드 클릭 → 상세 → 뒤로 가기', async () => {
  render(<App />)
  fireEvent.click(await screen.findByText('차세대 시스템'))
  expect(screen.getByRole('button', { name: '← 홈' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '← 홈' }))
  expect(screen.getByText("'26년 Project 목표 관리")).toBeInTheDocument()
})

it('데이터 변경 시 디바운스 저장이 호출된다', async () => {
  render(<App />)
  fireEvent.click(await screen.findByText('+ 새 프로젝트'))
  fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '신규' } })
  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-07-01' } })
  fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  await waitFor(() => expect(saveMock).toHaveBeenCalled())
  expect(saveMock.mock.calls.at(-1)[0]).toHaveLength(2)
})

it('loadProjects가 AuthError를 throw하면 로그인 화면을 표시한다', async () => {
  loadProjects.mockRejectedValueOnce(new AuthError())
  render(<App />)
  expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Login from '../../src/pages/Login.jsx'

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

it('비밀번호 입력 폼을 표시한다', () => {
  render(<Login onSuccess={vi.fn()} />)
  expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
})

it('로그인 성공 시 onSuccess를 호출한다', async () => {
  fetch.mockResolvedValue({ ok: true })
  const onSuccess = vi.fn()
  render(<Login onSuccess={onSuccess} />)
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'correct' } })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
  await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
    method: 'POST',
    credentials: 'include',
  }))
})

it('비밀번호 오류 시 에러 메시지를 표시한다', async () => {
  fetch.mockResolvedValue({ ok: false, status: 401 })
  render(<Login onSuccess={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
  expect(await screen.findByText('비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
})

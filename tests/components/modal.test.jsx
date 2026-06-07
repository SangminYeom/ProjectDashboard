import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Modal from '../../src/components/Modal.jsx'

it('제목과 내용을 렌더링한다', () => {
  render(<Modal title="테스트 모달" onClose={() => {}}><p>내용</p></Modal>)
  expect(screen.getByRole('dialog', { name: '테스트 모달' })).toBeInTheDocument()
  expect(screen.getByText('내용')).toBeInTheDocument()
})

it('배경 클릭 시 닫히고, 내부 클릭 시 닫히지 않는다', () => {
  const onClose = vi.fn()
  const { container } = render(<Modal title="t" onClose={onClose}><p>내용</p></Modal>)
  fireEvent.click(screen.getByText('내용'))
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(container.querySelector('.modal-backdrop'))
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('닫기 버튼으로 닫힌다', () => {
  const onClose = vi.fn()
  render(<Modal title="t" onClose={onClose}><p>내용</p></Modal>)
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

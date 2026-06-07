import { render, screen } from '@testing-library/react'
import App from '../src/App.jsx'

it('앱이 렌더링된다', () => {
  render(<App />)
  expect(screen.getByText('프로젝트 대시보드')).toBeInTheDocument()
})

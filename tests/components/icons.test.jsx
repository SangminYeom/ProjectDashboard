import { render } from '@testing-library/react'
import { EditIcon, TrashIcon } from '../../src/components/icons.jsx'

it('EditIcon과 TrashIcon은 currentColor를 쓰는 장식용 svg를 렌더링한다', () => {
  const { container: c1 } = render(<EditIcon />)
  const { container: c2 } = render(<TrashIcon />)
  const svg1 = c1.querySelector('svg')
  const svg2 = c2.querySelector('svg')
  expect(svg1).toBeInTheDocument()
  expect(svg1).toHaveAttribute('aria-hidden', 'true')
  expect(svg1.getAttribute('stroke')).toBe('currentColor')
  expect(svg2).toBeInTheDocument()
  expect(svg2).toHaveAttribute('aria-hidden', 'true')
  expect(svg2.getAttribute('stroke')).toBe('currentColor')
})

import { render, screen } from '@testing-library/react'
import ProgressRing from '../../src/components/ProgressRing.jsx'

it('진행률 텍스트와 원형 stroke-dashoffset을 올바르게 계산한다', () => {
  const { container } = render(<ProgressRing pct={50} size={36} stroke={4} />)
  expect(screen.getByText('50%')).toBeInTheDocument()
  const circles = container.querySelectorAll('circle')
  expect(circles).toHaveLength(2)
  const radius = (36 - 4) / 2
  const circumference = 2 * Math.PI * radius
  const expectedOffset = circumference * (1 - 50 / 100)
  expect(parseFloat(circles[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(expectedOffset, 5)
})

it('0%와 100%의 stroke-dashoffset이 각각 전체 둘레/0에 가깝다', () => {
  const { container: c0 } = render(<ProgressRing pct={0} size={36} stroke={4} />)
  const { container: c100 } = render(<ProgressRing pct={100} size={36} stroke={4} />)
  const radius = (36 - 4) / 2
  const circumference = 2 * Math.PI * radius
  const offset0 = parseFloat(c0.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'))
  const offset100 = parseFloat(c100.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'))
  expect(offset0).toBeCloseTo(circumference, 5)
  expect(offset100).toBeCloseTo(0, 5)
})

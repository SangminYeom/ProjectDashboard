import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import KpiBar from '../../src/components/KpiBar.jsx'

const numericKpi = { id: 'k1', name: '매출', type: 'numeric', target: 10, current: 7, unit: '억' }
const qualKpi = { id: 'k2', name: '품질', type: 'qualitative', status: '순항' }

it('수치형 KPI는 달성률을, 정성형은 상태를 표시한다', () => {
  render(<KpiBar kpis={[numericKpi, qualKpi]} onChange={() => {}} />)
  expect(screen.getByText('70%')).toBeInTheDocument()
  expect(screen.getByLabelText('품질 상태')).toHaveValue('순항')
})

it('현재값 인라인 수정 시 onChange가 호출된다', () => {
  const onChange = vi.fn()
  render(<KpiBar kpis={[numericKpi]} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('매출 현재값'), { target: { value: '8' } })
  expect(onChange).toHaveBeenCalledWith([{ ...numericKpi, current: 8 }])
})

it('KPI 추가 폼으로 수치형 KPI를 추가할 수 있다', () => {
  const onChange = vi.fn()
  render(<KpiBar kpis={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('+ KPI'))
  fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '신규고객' } })
  fireEvent.change(screen.getByLabelText(/목표값/), { target: { value: '100' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).toHaveBeenCalledTimes(1)
  const added = onChange.mock.calls[0][0][0]
  expect(added).toMatchObject({ name: '신규고객', type: 'numeric', target: 100, current: 0 })
  expect(added.id).toBeTruthy()
})

it('잘못된 숫자 입력은 0으로 보정한다', () => {
  const onChange = vi.fn()
  render(<KpiBar kpis={[numericKpi]} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('매출 현재값'), { target: { value: '' } })
  expect(onChange).toHaveBeenCalledWith([{ ...numericKpi, current: 0 }])
})

it('수치형 KPI는 진행률만큼 채워지는 게이지 바를 표시한다', () => {
  const { container } = render(<KpiBar kpis={[numericKpi]} onChange={() => {}} />)
  const fill = container.querySelector('.gauge-fill')
  expect(fill.style.width).toBe('70%') // 7/10 = 70%
})

it('진행률이 100%를 넘으면 게이지 바는 100%에서 시각적으로 멈춘다 (숫자는 그대로)', () => {
  const over = { id: 'k3', name: '초과달성', type: 'numeric', target: 10, current: 15, unit: '건' }
  const { container } = render(<KpiBar kpis={[over]} onChange={() => {}} />)
  expect(screen.getByText('150%')).toBeInTheDocument()
  expect(container.querySelector('.gauge-fill').style.width).toBe('100%')
})

it('정성형 KPI의 상태값에 따라 색상 클래스가 다르게 붙는다 (아사나식 상태 표시)', () => {
  render(<KpiBar kpis={[qualKpi]} onChange={() => {}} />)
  expect(screen.getByLabelText('품질 상태')).toHaveClass('kpi-qual-select--accent') // 순항
})

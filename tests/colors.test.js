import { describe, it, expect } from 'vitest'
import { projectColor, PROJECT_PALETTE } from '../src/lib/colors.js'

describe('projectColor', () => {
  it('같은 id에는 항상 같은 색을 돌려준다', () => {
    expect(projectColor('abc')).toBe(projectColor('abc'))
  })
  it('팔레트 안의 값만 돌려준다', () => {
    expect(PROJECT_PALETTE).toContain(projectColor('p1'))
    expect(PROJECT_PALETTE).toContain(projectColor('another-id'))
  })
})

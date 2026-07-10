// 프로젝트별 색점: id로부터 안정적으로 팔레트 색을 고른다.
export const PROJECT_PALETTE = [
  '#7F77DD', // purple
  '#1D9E75', // teal
  '#D85A30', // coral
  '#378ADD', // blue
  '#D4537E', // pink
  '#BA7517', // amber
  '#0F6E56', // deep teal
  '#534AB7', // deep purple
]

export function projectColor(id) {
  const s = String(id)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PROJECT_PALETTE[h % PROJECT_PALETTE.length]
}

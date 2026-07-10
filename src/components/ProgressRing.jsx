export default function ProgressRing({ pct, size = 36, stroke = 3.5, color = 'var(--accent)' }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring" role="img" aria-label={`진행률 ${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-sunk)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="progress-ring-text">{pct}%</text>
    </svg>
  )
}

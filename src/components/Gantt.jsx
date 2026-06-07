import { isTaskDelayed, todayStr } from '../lib/calc.js'

const toMs = (d) => new Date(d + 'T00:00:00').getTime()

export default function Gantt({ tasks, onUpdate, onRemove, today = todayStr() }) {
  if (tasks.length === 0) return <p className="empty">태스크가 없습니다.</p>

  const minMs = Math.min(...tasks.map((t) => toMs(t.startDate)), toMs(today))
  const maxMs = Math.max(...tasks.map((t) => toMs(t.endDate)), toMs(today))
  const span = Math.max(maxMs - minMs, 1)
  const leftPct = (d) => ((toMs(d) - minMs) / span) * 100
  const widthPct = (t) => Math.max(((toMs(t.endDate) - toMs(t.startDate)) / span) * 100, 1)

  return (
    <div className="gantt">
      {tasks.map((t) => {
        const delayed = isTaskDelayed(t, today)
        return (
          <div key={t.id} className="gantt-row">
            <span className="task-name">{t.name}</span>
            <span className="task-progress">
              <input type="number" min="0" max="100" value={t.progress} aria-label={`${t.name} 진척률`}
                onChange={(e) => onUpdate(t.id, { progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />%
            </span>
            <span className="gantt-track">
              <span
                className={`gantt-bar ${t.progress === 100 ? 'done' : delayed ? 'delayed' : 'active'}`}
                style={{ left: `${leftPct(t.startDate)}%`, width: `${widthPct(t)}%` }}
                title={`${t.startDate} ~ ${t.endDate}`}
              />
              <span className="today-line" style={{ left: `${leftPct(today)}%` }} title={`오늘 ${today}`} />
            </span>
            <span className={`task-status ${delayed ? 'delayed' : ''}`}>{delayed ? '⚠ 지연' : t.status}</span>
            <button className="icon-btn" aria-label={`${t.name} 삭제`}
              onClick={() => confirm(`태스크 '${t.name}'을(를) 삭제할까요?`) && onRemove(t.id)}>✕</button>
          </div>
        )
      })}
    </div>
  )
}

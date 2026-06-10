import { useState, useRef } from 'react'
import Modal from './Modal.jsx'
import { isTaskDelayed, todayStr } from '../lib/calc.js'

const TASK_STATUS = ['예정', '진행중', '완료', '보류']
const toMs = (d) => new Date(d + 'T00:00:00').getTime()

const N_TICKS = 5

function buildTicks(minMs, maxMs) {
  return Array.from({ length: N_TICKS }, (_, i) => {
    const ms = minMs + Math.round((maxMs - minMs) * i / (N_TICKS - 1))
    const d = new Date(ms)
    return { ms, label: `${d.getMonth() + 1}월${Math.ceil(d.getDate() / 7)}주` }
  })
}

const hasDate = (t) => t.startDate && t.endDate

export default function Gantt({ tasks, onUpdate, onRemove, onReorder, milestones = [], onMilestoneUpdate, onMilestoneRemove, onMilestoneReorder, today = todayStr() }) {
  const [editingTask, setEditingTask] = useState(null)
  const [editingMilestone, setEditingMilestone] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [dragOverMs, setDragOverMs] = useState(null)
  const dragIdx = useRef(null)
  const dragMsIdx = useRef(null)

  if (tasks.length === 0 && milestones.length === 0) return <p className="empty">태스크가 없습니다.</p>

  const dated = tasks.filter(hasDate)
  const msDates = milestones.filter((m) => m.date).map((m) => toMs(m.date))
  const minMs = (dated.length || msDates.length)
    ? Math.min(...dated.map((t) => toMs(t.startDate)), ...msDates, toMs(today))
    : toMs(today)
  const maxMs = (dated.length || msDates.length)
    ? Math.max(...dated.map((t) => toMs(t.endDate)), ...msDates, toMs(today))
    : toMs(today) + 86400000 * 30
  const span = Math.max(maxMs - minMs, 1)
  const leftPct = (d) => ((toMs(d) - minMs) / span) * 100
  const widthPct = (t) => Math.max(((toMs(t.endDate) - toMs(t.startDate)) / span) * 100, 1)
  const ticks = buildTicks(minMs, maxMs)

  return (
    <>
      <div className="gantt">
        <div className="gantt-row gantt-header-row" aria-hidden="true">
          <span className="drag-handle-col" />
          <span className="task-name" />
          <span className="task-progress" />
          <span className="gantt-track gantt-track--header">
            {ticks.map(({ label }, i) => (
              <span
                key={i}
                className={`gantt-axis-cell${i === 0 ? ' gantt-axis-first' : i === ticks.length - 1 ? ' gantt-axis-last' : ''}`}
              >
                {label}
              </span>
            ))}
            <span className="today-marker" style={{ left: `${leftPct(today)}%` }}>
              <span className="today-marker-pill">오늘</span>
            </span>
          </span>
          <span className="task-status" />
          <span className="gantt-btn-spacer" />
        </div>

        {tasks.map((t, idx) => {
          const delayed = hasDate(t) && isTaskDelayed(t, today)
          return (
            <div key={t.id}
              className={`gantt-row${dragOver === idx ? ' drag-over' : ''}${!hasDate(t) ? ' unscheduled' : ''}`}
              draggable
              onDragStart={(e) => { dragIdx.current = idx; e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(idx) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragIdx.current !== null && dragIdx.current !== idx) onReorder(dragIdx.current, idx)
                setDragOver(null)
                dragIdx.current = null
              }}
              onDragEnd={() => { setDragOver(null); dragIdx.current = null }}
            >
              <span className="drag-handle" aria-hidden="true">⠿</span>
              <span className="task-name">
                <span className="task-name-text">{t.name}</span>
              </span>
              <span className="task-progress">
                <input type="number" min="0" max="100" value={t.progress} aria-label={`${t.name} 진척률`}
                  onChange={(e) => onUpdate(t.id, { progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />%
              </span>
              <span className="gantt-track">
                {hasDate(t) ? (
                  <span
                    className={`gantt-bar ${t.progress === 100 ? 'done' : delayed ? 'delayed' : t.progress > 0 ? 'active' : 'scheduled'}`}
                    style={{ left: `${leftPct(t.startDate)}%`, width: `${widthPct(t)}%` }}
                    title={`${t.startDate} ~ ${t.endDate}`}
                  />
                ) : (
                  <span className="gantt-bar unscheduled" title="일정미정" />
                )}
              </span>
              <span className={`task-status ${delayed ? 'delayed' : ''}`}>{delayed ? '⚠ 지연' : hasDate(t) ? t.status : '일정미정'}</span>
              <button className="icon-btn" aria-label={`${t.name} 수정`}
                onClick={() => setEditingTask(t)}>✏</button>
              <button className="icon-btn" aria-label={`${t.name} 삭제`}
                onClick={() => confirm(`태스크 '${t.name}'을(를) 삭제할까요?`) && onRemove(t.id)}>✕</button>
            </div>
          )
        })}

        {milestones.map((m, idx) => (
          <div key={m.id}
            className={`gantt-row milestone-row${dragOverMs === idx ? ' drag-over' : ''}`}
            draggable
            onDragStart={(e) => { dragMsIdx.current = idx; e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverMs(idx) }}
            onDragLeave={() => setDragOverMs(null)}
            onDrop={() => {
              if (dragMsIdx.current !== null && dragMsIdx.current !== idx) onMilestoneReorder(dragMsIdx.current, idx)
              setDragOverMs(null)
              dragMsIdx.current = null
            }}
            onDragEnd={() => { setDragOverMs(null); dragMsIdx.current = null }}
          >
            <span className="drag-handle" aria-hidden="true">⠿</span>
            <span className="task-name">
              <span className="milestone-icon" aria-hidden="true">◆</span>
              <span className="task-name-text milestone-name">{m.name}</span>
            </span>
            <span className="task-progress">—</span>
            <span className="gantt-track gantt-track--milestone">
              {m.date && (
                <span
                  className="milestone-diamond"
                  style={{ left: `${leftPct(m.date)}%` }}
                  title={m.date}
                />
              )}
            </span>
            <span className="milestone-badge">◆ 마일스톤</span>
            <button className="icon-btn" aria-label={`${m.name} 수정`}
              onClick={() => setEditingMilestone(m)}>✏</button>
            <button className="icon-btn" aria-label={`${m.name} 삭제`}
              onClick={() => confirm(`마일스톤 '${m.name}'을(를) 삭제할까요?`) && onMilestoneRemove(m.id)}>✕</button>
          </div>
        ))}
      </div>

      {editingTask && (
        <TaskEditForm
          task={editingTask}
          onSubmit={(patch) => { onUpdate(editingTask.id, patch); setEditingTask(null) }}
          onClose={() => setEditingTask(null)}
        />
      )}
      {editingMilestone && (
        <MilestoneEditForm
          milestone={editingMilestone}
          onSubmit={(patch) => { onMilestoneUpdate(editingMilestone.id, patch); setEditingMilestone(null) }}
          onClose={() => setEditingMilestone(null)}
        />
      )}
    </>
  )
}

function TaskEditForm({ task, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'),
      startDate: f.get('startDate'),
      endDate: f.get('endDate'),
      status: f.get('status'),
      progress: Math.max(0, Math.min(100, Number(f.get('progress')) || 0)),
    })
  }
  return (
    <Modal title="태스크 수정" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>태스크명 <input name="name" defaultValue={task.name} required /></label>
        <label>시작일 <input name="startDate" type="date" defaultValue={task.startDate} /></label>
        <label>종료일 <input name="endDate" type="date" defaultValue={task.endDate} /></label>
        <label>상태
          <select name="status" defaultValue={task.status}>
            {TASK_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>진척률 <input name="progress" type="number" min="0" max="100" defaultValue={task.progress} /></label>
        <button type="submit" className="btn-primary">저장</button>
      </form>
    </Modal>
  )
}

function MilestoneEditForm({ milestone, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({ name: f.get('name'), date: f.get('date') })
  }
  return (
    <Modal title="마일스톤 수정" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>마일스톤명 <input name="name" defaultValue={milestone.name} required /></label>
        <label>날짜 <input name="date" type="date" defaultValue={milestone.date} required /></label>
        <button type="submit" className="btn-primary">저장</button>
      </form>
    </Modal>
  )
}

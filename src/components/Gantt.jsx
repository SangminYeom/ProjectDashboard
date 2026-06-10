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

export default function Gantt({ tasks, onUpdate, onRemove, onReorder, today = todayStr() }) {
  const [editingTask, setEditingTask] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const dragIdx = useRef(null)

  if (tasks.length === 0) return <p className="empty">태스크가 없습니다.</p>

  const minMs = Math.min(...tasks.map((t) => toMs(t.startDate)), toMs(today))
  const maxMs = Math.max(...tasks.map((t) => toMs(t.endDate)), toMs(today))
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
            <span className="today-line gantt-today-header" style={{ left: `${leftPct(today)}%` }} />
          </span>
          <span className="task-status" />
          <span className="gantt-btn-spacer" />
        </div>

        {tasks.map((t, idx) => {
          const delayed = isTaskDelayed(t, today)
          return (
            <div key={t.id}
              className={`gantt-row${dragOver === idx ? ' drag-over' : ''}`}
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
                <span
                  className={`gantt-bar ${t.progress === 100 ? 'done' : delayed ? 'delayed' : t.progress > 0 ? 'active' : 'scheduled'}`}
                  style={{ left: `${leftPct(t.startDate)}%`, width: `${widthPct(t)}%` }}
                  title={`${t.startDate} ~ ${t.endDate}`}
                />
                <span className="today-line" style={{ left: `${leftPct(today)}%` }} title={`오늘 ${today}`} />
              </span>
              <span className={`task-status ${delayed ? 'delayed' : ''}`}>{delayed ? '⚠ 지연' : t.status}</span>
              <button className="icon-btn" aria-label={`${t.name} 수정`}
                onClick={() => setEditingTask(t)}>✏</button>
              <button className="icon-btn" aria-label={`${t.name} 삭제`}
                onClick={() => confirm(`태스크 '${t.name}'을(를) 삭제할까요?`) && onRemove(t.id)}>✕</button>
            </div>
          )
        })}
      </div>

      {editingTask && (
        <TaskEditForm
          task={editingTask}
          onSubmit={(patch) => { onUpdate(editingTask.id, patch); setEditingTask(null) }}
          onClose={() => setEditingTask(null)}
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
        <label>시작일 <input name="startDate" type="date" defaultValue={task.startDate} required /></label>
        <label>종료일 <input name="endDate" type="date" defaultValue={task.endDate} required /></label>
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

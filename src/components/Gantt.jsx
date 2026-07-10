import { useState } from 'react'
import Modal from './Modal.jsx'
import { isTaskDelayed, todayStr } from '../lib/calc.js'

const TASK_STATUS = ['예정', '진행중', '완료', '보류']
const toMs = (d) => new Date(d + 'T00:00:00').getTime()

const N_TICKS = 5
const fmtDate = (d) => { const [, m, day] = d.split('-'); return `${+m}.${day}` }

function countWorkdaysBefore(fromMs, targetMs) {
  const start = new Date(fromMs); start.setHours(0, 0, 0, 0)
  const end = new Date(targetMs); end.setHours(0, 0, 0, 0)
  let count = 0
  const d = new Date(start)
  while (d.getTime() < end.getTime()) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

function countWorkdaysInRange(fromMs, toMs) {
  const start = new Date(fromMs); start.setHours(0, 0, 0, 0)
  const end = new Date(toMs); end.setHours(0, 0, 0, 0)
  let count = 0
  const d = new Date(start)
  while (d.getTime() <= end.getTime()) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return Math.max(count, 1)
}

function buildTicks(minMs, maxMs) {
  const total = countWorkdaysInRange(minMs, maxMs)
  return Array.from({ length: N_TICKS }, (_, i) => {
    const targetIdx = Math.round((total - 1) * i / (N_TICKS - 1))
    const d = new Date(minMs); d.setHours(0, 0, 0, 0)
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
    let found = 0
    while (found < targetIdx) {
      d.setDate(d.getDate() + 1)
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
      found++
    }
    return { label: `${d.getMonth() + 1}월${Math.ceil(d.getDate() / 7)}주` }
  })
}

const hasDate = (t) => t.startDate && t.endDate

const GRID_TICKS = [0, 25, 50, 75, 100]

function GridLines() {
  return GRID_TICKS.map((pct, i) => (
    <span key={i} className="gantt-gridline" style={{ left: `${pct}%` }} aria-hidden="true" />
  ))
}

function TodayLine({ pct }) {
  return <span className="today-marker" style={{ left: `${pct}%` }} aria-hidden="true" />
}

export default function Gantt({ items = [], onUpdate, onRemove, onReorder, today = todayStr() }) {
  const [editingItem, setEditingItem] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  if (items.length === 0) return <p className="empty">태스크가 없습니다.</p>

  const tasks = items.filter(i => i.type === 'task')
  const milestones = items.filter(i => i.type === 'milestone')
  const dated = tasks.filter(hasDate)
  const msDates = milestones.filter(m => m.date).map(m => toMs(m.date))
  const minMs = (dated.length || msDates.length)
    ? Math.min(...dated.map(t => toMs(t.startDate)), ...msDates, toMs(today))
    : toMs(today)
  const maxMs = (dated.length || msDates.length)
    ? Math.max(...dated.map(t => toMs(t.endDate)), ...msDates, toMs(today))
    : toMs(today) + 86400000 * 30
  const totalWorkdays = countWorkdaysInRange(minMs, maxMs)
  const leftPct = (d) => (countWorkdaysBefore(minMs, toMs(d)) / totalWorkdays) * 100
  const widthPct = (t) => Math.max((countWorkdaysInRange(toMs(t.startDate), toMs(t.endDate)) / totalWorkdays) * 100, 1)
  const ticks = buildTicks(minMs, maxMs)

  function makeRowHandlers(idx) {
    return {
      draggable: true,
      onDragStart: (e) => { e.stopPropagation(); e.dataTransfer.setData('application/item-idx', String(idx)); e.dataTransfer.effectAllowed = 'move' },
      onDragOver: (e) => { if (!e.dataTransfer.types.includes('application/item-idx')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(idx) },
      onDragLeave: () => setDragOver(null),
      onDrop: (e) => {
        if (!e.dataTransfer.types.includes('application/item-idx')) return
        e.stopPropagation()
        const from = parseInt(e.dataTransfer.getData('application/item-idx'), 10)
        if (!isNaN(from) && from !== idx) onReorder(from, idx)
        setDragOver(null)
      },
      onDragEnd: () => setDragOver(null),
    }
  }

  return (
    <>
      <div className="gantt">
        <div className="gantt-row gantt-header-row" aria-hidden="true">
          <span className="drag-handle-col" />
          <span className="task-name" />
          <span className="task-progress" />
          <span className="task-date task-date--header">기간</span>
          <span className="gantt-track gantt-track--header">
            <GridLines />
            {ticks.map(({ label }, i) => (
              <span
                key={i}
                className={`gantt-axis-cell${i === 0 ? ' gantt-axis-first' : i === ticks.length - 1 ? ' gantt-axis-last' : ''}`}
              >
                {label}
              </span>
            ))}
            <TodayLine pct={leftPct(today)} />
            <span className="today-marker-pill" style={{ left: `${leftPct(today)}%` }}>오늘</span>
          </span>
          <span className="task-status" />
          <span className="gantt-btn-spacer" />
        </div>

        {items.map((item, idx) => {
          if (item.type === 'milestone') {
            return (
              <div key={item.id}
                className={`gantt-row milestone-row${dragOver === idx ? ' drag-over' : ''}`}
                {...makeRowHandlers(idx)}
              >
                <span className="drag-handle" aria-hidden="true">⠿</span>
                <span className="task-name">
                  <span className="milestone-icon" aria-hidden="true">◆</span>
                  <span className="task-name-text milestone-name">{item.name}</span>
                </span>
                <span className="task-progress">—</span>
                <span className="task-date">{item.date ? fmtDate(item.date) : '—'}</span>
                <span className="gantt-track gantt-track--milestone">
                  <GridLines />
                  <TodayLine pct={leftPct(today)} />
                  {item.date && (
                    <span
                      className="milestone-diamond"
                      style={{ left: `${leftPct(item.date)}%` }}
                      title={item.date}
                    />
                  )}
                </span>
                <span className="milestone-badge">◆ 마일스톤</span>
                <button className="icon-btn" aria-label={`${item.name} 수정`}
                  onClick={() => setEditingItem(item)}>✏</button>
                <button className="icon-btn" aria-label={`${item.name} 삭제`}
                  onClick={() => confirm(`마일스톤 '${item.name}'을(를) 삭제할까요?`) && onRemove(item.id)}>🗑️</button>
              </div>
            )
          }

          // type === 'task' (or legacy items without type)
          const delayed = hasDate(item) && isTaskDelayed(item, today)
          return (
            <div key={item.id}
              className={`gantt-row${dragOver === idx ? ' drag-over' : ''}${!hasDate(item) ? ' unscheduled' : ''}`}
              {...makeRowHandlers(idx)}
            >
              <span className="drag-handle" aria-hidden="true">⠿</span>
              <span className="task-name">
                <span className="task-name-text">{item.name}</span>
              </span>
              <span className="task-progress">
                <input type="number" min="0" max="100" value={item.progress} aria-label={`${item.name} 진척률`}
                  onChange={(e) => onUpdate(item.id, { progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />%
              </span>
              <span className="task-date">
                {hasDate(item) ? `${fmtDate(item.startDate)}~${fmtDate(item.endDate)}` : '—'}
              </span>
              <span className="gantt-track">
                <GridLines />
                <TodayLine pct={leftPct(today)} />
                {hasDate(item) ? (
                  <span
                    className={`gantt-bar ${item.progress === 100 ? 'done' : delayed ? 'delayed' : item.progress > 0 ? 'active' : 'scheduled'}`}
                    style={{ left: `${leftPct(item.startDate)}%`, width: `${widthPct(item)}%` }}
                    title={`${item.startDate} ~ ${item.endDate} · 진척 ${item.progress}%`}
                  >
                    <span className="gantt-bar-fill" style={{ width: `${item.progress}%` }} />
                  </span>
                ) : (
                  <span className="gantt-bar unscheduled" title="일정미정" />
                )}
              </span>
              <span className={`task-status ${delayed ? 'delayed' : ''}`}>{delayed ? '⚠ 지연' : hasDate(item) ? item.status : '일정미정'}</span>
              <button className="icon-btn" aria-label={`${item.name} 수정`}
                onClick={() => setEditingItem(item)}>✏</button>
              <button className="icon-btn" aria-label={`${item.name} 삭제`}
                onClick={() => confirm(`태스크 '${item.name}'을(를) 삭제할까요?`) && onRemove(item.id)}>🗑️</button>
            </div>
          )
        })}
      </div>

      {editingItem && editingItem.type === 'milestone' && (
        <MilestoneEditForm
          milestone={editingItem}
          onSubmit={(patch) => { onUpdate(editingItem.id, patch); setEditingItem(null) }}
          onClose={() => setEditingItem(null)}
        />
      )}
      {editingItem && editingItem.type !== 'milestone' && (
        <TaskEditForm
          task={editingItem}
          onSubmit={(patch) => { onUpdate(editingItem.id, patch); setEditingItem(null) }}
          onClose={() => setEditingItem(null)}
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

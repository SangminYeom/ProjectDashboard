import { useState } from 'react'
import ScheduleForm from '../components/ScheduleForm.jsx'
import { groupSchedules, isPastSchedule } from '../lib/schedules.js'
import { todayStr } from '../lib/calc.js'
import { EditIcon, TrashIcon } from '../components/icons.jsx'

export default function Schedules({ schedules, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const today = todayStr()
  const { undated, dated } = groupSchedules(schedules)

  function addSchedule(form) {
    const now = new Date().toISOString()
    onChange([...schedules, { id: crypto.randomUUID(), ...form, createdAt: now, updatedAt: now }])
  }
  function updateSchedule(id, form) {
    onChange(schedules.map((s) => (s.id === id ? { ...s, ...form, updatedAt: new Date().toISOString() } : s)))
  }
  function removeSchedule(schedule) {
    if (!confirm(`'${schedule.title}' 일정을 삭제할까요?`)) return
    onChange(schedules.filter((s) => s.id !== schedule.id))
  }
  function toggleDone(schedule, done) {
    onChange(schedules.map((s) => (s.id === schedule.id ? { ...s, done, updatedAt: new Date().toISOString() } : s)))
  }

  return (
    <div className="schedules-page">
      <header className="page-head">
        <div className="page-head-row">
          <div>
            <h1 className="home-title">주요 일정</h1>
            <p className="home-subtitle">보고, 의사결정 등 주요 일정</p>
          </div>
          <div className="page-head-actions">
            <button className="btn-primary" onClick={() => setAdding(true)}>+ 일정 추가</button>
          </div>
        </div>
      </header>

      {undated.length === 0 && dated.length === 0 && <p className="empty">등록된 일정이 없습니다.</p>}

      {undated.length > 0 && (
        <section className="schedule-group">
          <div className="schedule-group-label">날짜 미정</div>
          <div className="schedule-list">
            {undated.map((s) => (
              <ScheduleRow key={s.id} schedule={s}
                onToggleDone={(done) => toggleDone(s, done)}
                onEdit={() => setEditing(s)} onRemove={() => removeSchedule(s)} />
            ))}
          </div>
        </section>
      )}

      {dated.length > 0 && (
        <section className="schedule-group">
          <div className="schedule-group-label">예정된 일정</div>
          <div className="schedule-list">
            {dated.map((s) => (
              <ScheduleRow key={s.id} schedule={s} isPast={isPastSchedule(s, today)}
                onToggleDone={(done) => toggleDone(s, done)}
                onEdit={() => setEditing(s)} onRemove={() => removeSchedule(s)} />
            ))}
          </div>
        </section>
      )}

      {(adding || editing) && (
        <ScheduleForm
          initial={editing}
          onSubmit={(form) => {
            if (editing) updateSchedule(editing.id, form)
            else addSchedule(form)
            setAdding(false)
            setEditing(null)
          }}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function ScheduleRow({ schedule, isPast, onToggleDone, onEdit, onRemove }) {
  return (
    <div className={`schedule-row${isPast ? ' is-past' : ''}${schedule.done ? ' is-done' : ''}`}>
      <input type="checkbox" className="schedule-check" checked={!!schedule.done}
        onChange={(e) => onToggleDone(e.target.checked)} aria-label={`${schedule.title} 완료 여부`} />
      {schedule.date
        ? <span className="schedule-date">{schedule.date}</span>
        : <span className="schedule-badge schedule-badge--undated">미정</span>}
      <span className="schedule-title">{schedule.title}</span>
      {schedule.memo && <span className="schedule-memo">{schedule.memo}</span>}
      <span className="schedule-actions">
        <button className="icon-btn" onClick={onEdit} aria-label={`${schedule.title} 수정`}><EditIcon /></button>
        <button className="icon-btn" onClick={onRemove} aria-label={`${schedule.title} 삭제`}><TrashIcon /></button>
      </span>
    </div>
  )
}

import { useState } from 'react'
import Modal from './Modal.jsx'
import Gantt from './Gantt.jsx'
import { initiativeProgress } from '../lib/calc.js'

const TASK_STATUS = ['예정', '진행중', '완료', '보류']

export default function Initiatives({ initiatives, onChange }) {
  const [addingInit, setAddingInit] = useState(false)
  const [taskFormFor, setTaskFormFor] = useState(null) // 과제 id
  const [collapsed, setCollapsed] = useState({})

  function updateInit(id, updater) {
    onChange(initiatives.map((i) => (i.id === id ? updater(i) : i)))
  }

  return (
    <section>
      {initiatives.map((init) => (
        <div key={init.id} className="initiative-card">
          <div className="initiative-head"
            onClick={() => setCollapsed({ ...collapsed, [init.id]: !collapsed[init.id] })}>
            <strong>{init.name}</strong>
            <span className="meta">
              진척 {initiativeProgress(init)}% · 태스크 {init.tasks.length}건
              {init.owner ? ` · 담당 ${init.owner}` : ''}
            </span>
            <button className="icon-btn" aria-label={`${init.name} 삭제`}
              onClick={(e) => {
                e.stopPropagation()
                confirm(`과제 '${init.name}'을(를) 삭제할까요?`) && onChange(initiatives.filter((x) => x.id !== init.id))
              }}>✕</button>
          </div>
          {!collapsed[init.id] && (
            <div className="initiative-body">
              <Gantt
                tasks={init.tasks}
                onUpdate={(taskId, patch) => updateInit(init.id,
                  (i) => ({ ...i, tasks: i.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }))}
                onRemove={(taskId) => updateInit(init.id,
                  (i) => ({ ...i, tasks: i.tasks.filter((t) => t.id !== taskId) }))}
              />
              <button className="link-btn" onClick={() => setTaskFormFor(init.id)}>+ 태스크 추가</button>
            </div>
          )}
        </div>
      ))}
      <button className="btn-primary" onClick={() => setAddingInit(true)}>+ 과제 추가</button>

      {addingInit && (
        <InitiativeForm
          onSubmit={(form) => {
            onChange([...initiatives, { id: crypto.randomUUID(), ...form, tasks: [] }])
            setAddingInit(false)
          }}
          onClose={() => setAddingInit(false)}
        />
      )}
      {taskFormFor && (
        <TaskForm
          onSubmit={(task) => {
            updateInit(taskFormFor, (i) => ({ ...i, tasks: [...i.tasks, { id: crypto.randomUUID(), ...task }] }))
            setTaskFormFor(null)
          }}
          onClose={() => setTaskFormFor(null)}
        />
      )}
    </section>
  )
}

function InitiativeForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({ name: f.get('name'), description: f.get('description'), owner: f.get('owner') })
  }
  return (
    <Modal title="과제 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>과제명 <input name="name" required /></label>
        <label>설명 <textarea name="description" /></label>
        <label>담당 <input name="owner" /></label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}

function TaskForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'),
      startDate: f.get('startDate'),
      endDate: f.get('endDate'),
      progress: 0,
      status: f.get('status'),
    })
  }
  return (
    <Modal title="태스크 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>태스크명 <input name="name" required /></label>
        <label>시작일 <input name="startDate" type="date" required /></label>
        <label>종료일 <input name="endDate" type="date" required /></label>
        <label>상태
          <select name="status" defaultValue="예정">
            {TASK_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}

import { useState, useRef } from 'react'
import Modal from './Modal.jsx'
import Gantt from './Gantt.jsx'
import { initiativeProgress } from '../lib/calc.js'

const TASK_STATUS = ['예정', '진행중', '완료', '보류']

export default function Initiatives({ initiatives, onChange }) {
  const [addingInit, setAddingInit] = useState(false)
  const [editingInit, setEditingInit] = useState(null)
  const [taskFormFor, setTaskFormFor] = useState(null)
  const [milestoneFormFor, setMilestoneFormFor] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [dragOver, setDragOver] = useState(null)
  const dragIdx = useRef(null)

  function updateInit(id, updater) {
    onChange(initiatives.map((i) => (i.id === id ? updater(i) : i)))
  }

  function reorderInit(fromIdx, toIdx) {
    const next = [...initiatives]
    const [item] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, item)
    onChange(next)
  }

  return (
    <section>
      {initiatives.map((init, idx) => {
        const msCount = init.milestones?.length ?? 0
        return (
          <div key={init.id}
            className={`initiative-card${dragOver === idx ? ' drag-over' : ''}`}
            draggable
            onDragStart={(e) => { dragIdx.current = idx; e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(idx) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => {
              if (dragIdx.current !== null && dragIdx.current !== idx) reorderInit(dragIdx.current, idx)
              setDragOver(null)
              dragIdx.current = null
            }}
            onDragEnd={() => { setDragOver(null); dragIdx.current = null }}
          >
            <div className="initiative-head"
              onClick={() => setCollapsed({ ...collapsed, [init.id]: !collapsed[init.id] })}>
              <span className="drag-handle" aria-hidden="true">⠿</span>
              <strong>{init.name}</strong>
              <span className="meta">
                진척 {initiativeProgress(init)}% · 태스크 {init.tasks.length}건
                {msCount > 0 ? ` · 마일스톤 ${msCount}건` : ''}
                {init.owner ? ` · 담당 ${init.owner}` : ''}
              </span>
              <button className="icon-btn" aria-label={`${init.name} 수정`}
                onClick={(e) => { e.stopPropagation(); setEditingInit(init) }}>✏️</button>
              <button className="icon-btn" aria-label={`${init.name} 삭제`}
                onClick={(e) => {
                  e.stopPropagation()
                  confirm(`과제 '${init.name}'을(를) 삭제할까요?`) && onChange(initiatives.filter((x) => x.id !== init.id))
                }}>🗑️</button>
            </div>
            {!collapsed[init.id] && (
              <div className="initiative-body">
                <Gantt
                  tasks={init.tasks}
                  onUpdate={(taskId, patch) => updateInit(init.id,
                    (i) => ({ ...i, tasks: i.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }))}
                  onRemove={(taskId) => updateInit(init.id,
                    (i) => ({ ...i, tasks: i.tasks.filter((t) => t.id !== taskId) }))}
                  onReorder={(fromIdx, toIdx) => updateInit(init.id, (i) => {
                    const tasks = [...i.tasks]
                    const [item] = tasks.splice(fromIdx, 1)
                    tasks.splice(toIdx, 0, item)
                    return { ...i, tasks }
                  })}
                  milestones={init.milestones ?? []}
                  onMilestoneUpdate={(msId, patch) => updateInit(init.id,
                    (i) => ({ ...i, milestones: (i.milestones ?? []).map((m) => (m.id === msId ? { ...m, ...patch } : m)) }))}
                  onMilestoneRemove={(msId) => updateInit(init.id,
                    (i) => ({ ...i, milestones: (i.milestones ?? []).filter((m) => m.id !== msId) }))}
                  onMilestoneReorder={(fromIdx, toIdx) => updateInit(init.id, (i) => {
                    const milestones = [...(i.milestones ?? [])]
                    const [item] = milestones.splice(fromIdx, 1)
                    milestones.splice(toIdx, 0, item)
                    return { ...i, milestones }
                  })}
                />
                <div className="initiative-add-btns">
                  <button className="link-btn" onClick={() => setTaskFormFor(init.id)}>+ 태스크 추가</button>
                  <button className="link-btn" onClick={() => setMilestoneFormFor(init.id)}>+ 마일스톤 추가</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <button className="btn-primary" onClick={() => setAddingInit(true)}>+ 과제 추가</button>

      {addingInit && (
        <InitiativeForm
          onSubmit={(form) => {
            onChange([...initiatives, { id: crypto.randomUUID(), ...form, tasks: [], milestones: [] }])
            setAddingInit(false)
          }}
          onClose={() => setAddingInit(false)}
        />
      )}
      {editingInit && (
        <InitiativeForm
          initial={editingInit}
          onSubmit={(form) => {
            updateInit(editingInit.id, (i) => ({ ...i, ...form }))
            setEditingInit(null)
          }}
          onClose={() => setEditingInit(null)}
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
      {milestoneFormFor && (
        <MilestoneForm
          onSubmit={(ms) => {
            updateInit(milestoneFormFor, (i) => ({
              ...i,
              milestones: [...(i.milestones ?? []), { id: crypto.randomUUID(), ...ms }],
            }))
            setMilestoneFormFor(null)
          }}
          onClose={() => setMilestoneFormFor(null)}
        />
      )}
    </section>
  )
}

function InitiativeForm({ initial, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({ name: f.get('name'), description: f.get('description'), owner: f.get('owner') })
  }
  return (
    <Modal title={initial ? '과제 수정' : '과제 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>과제명 <input name="name" defaultValue={initial?.name} required /></label>
        <label>설명 <textarea name="description" defaultValue={initial?.description} /></label>
        <label>담당 <input name="owner" defaultValue={initial?.owner} /></label>
        <button type="submit" className="btn-primary">{initial ? '저장' : '추가'}</button>
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
        <label>시작일 <input name="startDate" type="date" /></label>
        <label>종료일 <input name="endDate" type="date" /></label>
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

function MilestoneForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({ name: f.get('name'), date: f.get('date') })
  }
  return (
    <Modal title="마일스톤 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>마일스톤명 <input name="name" aria-label="마일스톤명" required /></label>
        <label>날짜 <input name="date" type="date" aria-label="날짜" required /></label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}

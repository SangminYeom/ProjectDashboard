import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const IMPORTANCES = ['상', '중', '하']
const STATUSES = ['열림', '대응중', '해결']
const IMP_CLASS = { 상: 'high', 중: 'mid', 하: 'low' }
const STATUS_CLASS = { 열림: 'open', 대응중: 'progress', 해결: 'resolved' }

export default function IssueLog({ issues, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showResolved, setShowResolved] = useState(false)
  const [dragOver, setDragOver] = useState(null)

  const active = issues.filter((i) => i.status !== '해결')
  const resolved = issues.filter((i) => i.status === '해결')

  function update(id, patch) {
    onChange(issues.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }
  function setStatus(issue, status) {
    update(issue.id, { status, resolvedDate: status === '해결' ? todayStr() : null })
  }
  function remove(issue) {
    confirm(`'${issue.content}'을(를) 삭제할까요?`) && onChange(issues.filter((x) => x.id !== issue.id))
  }
  function reorderActive(fromIdx, toIdx) {
    const next = [...active]
    const [item] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, item)
    onChange([...next, ...resolved])
  }

  return (
    <section className="issue-log">
      <div className="issue-log-head">쟁점</div>
      {active.map((issue, idx) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onStatus={setStatus}
          onEdit={() => setEditing(issue)}
          onRemove={() => remove(issue)}
          draggableProps={{
            dragOver: dragOver === idx,
            onDragStart: (e) => { e.dataTransfer.setData('application/issue-idx', String(idx)); e.dataTransfer.effectAllowed = 'move' },
            onDragOver: (e) => { if (!e.dataTransfer.types.includes('application/issue-idx')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(idx) },
            onDragLeave: () => setDragOver(null),
            onDrop: (e) => {
              const from = parseInt(e.dataTransfer.getData('application/issue-idx'), 10)
              if (!isNaN(from) && from !== idx) reorderActive(from, idx)
              setDragOver(null)
            },
            onDragEnd: () => setDragOver(null),
          }}
        />
      ))}
      {active.length === 0 && <p className="empty">미해결 쟁점이 없습니다.</p>}
      <button className="link-btn" onClick={() => setAdding(true)}>+ 쟁점 추가</button>

      {resolved.length > 0 && (
        <div className="resolved-section">
          <button className="link-btn" onClick={() => setShowResolved(!showResolved)}>
            ✓ 해결됨 {resolved.length}건 {showResolved ? '접기' : '보기'}
          </button>
          {showResolved && resolved.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onStatus={setStatus} onEdit={() => setEditing(issue)} onRemove={() => remove(issue)} />
          ))}
        </div>
      )}

      {(adding || editing) && (
        <IssueForm
          initial={editing}
          onSubmit={(form) => {
            if (editing) update(editing.id, form)
            else onChange([...issues, {
              id: crypto.randomUUID(), ...form,
              status: '열림', createdDate: todayStr(), resolvedDate: null,
            }])
            setAdding(false); setEditing(null)
          }}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </section>
  )
}

function IssueCard({ issue, onStatus, onEdit, onRemove, draggableProps }) {
  const [expanded, setExpanded] = useState(false)
  const impCls = IMP_CLASS[issue.importance]
  const statusCls = STATUS_CLASS[issue.status]
  return (
    <div
      className={`issue-card${draggableProps?.dragOver ? ' drag-over' : ''}`}
      draggable={!!draggableProps}
      onDragStart={draggableProps?.onDragStart}
      onDragOver={draggableProps?.onDragOver}
      onDragLeave={draggableProps?.onDragLeave}
      onDrop={draggableProps?.onDrop}
      onDragEnd={draggableProps?.onDragEnd}
    >
      <div className="issue-row">
        {draggableProps && <span className="drag-handle" aria-hidden="true">⠿</span>}
        <span className={`imp-dot imp-${impCls}`} aria-hidden="true" title={`중요도 ${issue.importance}`} />
        <p className="issue-content">{issue.content}</p>
        <select
          className={`status-select status-${statusCls}`}
          value={issue.status}
          aria-label={`${issue.content} 상태`}
          onChange={(e) => onStatus(issue, e.target.value)}
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="issue-actions">
          <button className="icon-btn" onClick={onEdit} aria-label={`${issue.content} 편집`}>✏</button>
          <button className="icon-btn" onClick={onRemove} aria-label={`${issue.content} 삭제`}>🗑️</button>
        </span>
      </div>
      {issue.response && (
        <button
          type="button"
          className={`issue-response${expanded ? ' expanded' : ''}`}
          aria-label={`${issue.content} 대응안 ${expanded ? '접기' : '펼치기'}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="issue-response-arrow" aria-hidden="true">↳</span>
          <span className="issue-response-text">{issue.response}</span>
        </button>
      )}
      {expanded && (
        <p className="meta">등록 {issue.createdDate}{issue.resolvedDate ? ` · 해결 ${issue.resolvedDate}` : ''}</p>
      )}
    </div>
  )
}

function IssueForm({ initial, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({ content: f.get('content'), response: f.get('response'), importance: f.get('importance') })
  }
  return (
    <Modal title={initial ? '쟁점 편집' : '쟁점 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>내용 <input name="content" defaultValue={initial?.content} required /></label>
        <label>중요도
          <select name="importance" defaultValue={initial?.importance ?? '중'}>
            {IMPORTANCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>대응안 <textarea name="response" defaultValue={initial?.response} /></label>
        <button type="submit" className="btn-primary">저장</button>
      </form>
    </Modal>
  )
}

import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const IMPORTANCES = ['상', '중', '하']
const STATUSES = ['열림', '대응중', '해결']
const IMP_CLASS = { 상: 'high', 중: 'mid', 하: 'low' }
const STATUS_CLASS = { 열림: 'open', 대응중: 'progress', 해결: 'resolved' }
const IMP_ORDER = { 상: 0, 중: 1, 하: 2 }

export default function ProjectIssues({ initiatives, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // { initId, issue }
  const [showResolved, setShowResolved] = useState(false)

  const all = initiatives.flatMap((init) =>
    (init.issues ?? []).map((issue) => ({ issue, initId: init.id, initName: init.name })))
  const active = all
    .filter((x) => x.issue.status !== '해결')
    .sort((a, b) => IMP_ORDER[a.issue.importance] - IMP_ORDER[b.issue.importance])
  const resolved = all.filter((x) => x.issue.status === '해결')

  function updateIssue(initId, issueId, patch) {
    onChange(initiatives.map((init) => init.id !== initId ? init : {
      ...init, issues: (init.issues ?? []).map((i) => i.id === issueId ? { ...i, ...patch } : i),
    }))
  }
  function addIssue(initId, form) {
    onChange(initiatives.map((init) => init.id !== initId ? init : {
      ...init,
      issues: [...(init.issues ?? []), {
        id: crypto.randomUUID(), ...form, status: '열림', createdDate: todayStr(), resolvedDate: null,
      }],
    }))
  }
  function removeIssue(initId, issue) {
    if (!confirm(`'${issue.content}'을(를) 삭제할까요?`)) return
    onChange(initiatives.map((init) => init.id !== initId ? init : {
      ...init, issues: (init.issues ?? []).filter((i) => i.id !== issue.id),
    }))
  }
  function setStatus(initId, issue, status) {
    updateIssue(initId, issue.id, { status, resolvedDate: status === '해결' ? todayStr() : null })
  }

  return (
    <section className="issues-tab">
      {active.map(({ issue, initId, initName }) => (
        <IssueRow key={issue.id} issue={issue} initName={initName}
          onStatus={(s) => setStatus(initId, issue, s)}
          onEdit={() => setEditing({ initId, issue })}
          onRemove={() => removeIssue(initId, issue)} />
      ))}
      {active.length === 0 && <p className="empty">미해결 쟁점이 없습니다.</p>}

      <button className="btn-primary" onClick={() => setAdding(true)} disabled={initiatives.length === 0}>
        + 쟁점 추가
      </button>
      {initiatives.length === 0 && <p className="empty">쟁점을 추가하려면 먼저 과제를 만드세요.</p>}

      {resolved.length > 0 && (
        <div className="resolved-section">
          <button className="link-btn" onClick={() => setShowResolved(!showResolved)}>
            ✓ 해결됨 {resolved.length}건 {showResolved ? '접기' : '보기'}
          </button>
          {showResolved && resolved.map(({ issue, initId, initName }) => (
            <IssueRow key={issue.id} issue={issue} initName={initName}
              onStatus={(s) => setStatus(initId, issue, s)}
              onEdit={() => setEditing({ initId, issue })}
              onRemove={() => removeIssue(initId, issue)} />
          ))}
        </div>
      )}

      {(adding || editing) && (
        <IssueForm
          initiatives={initiatives}
          initial={editing?.issue}
          initialInitId={editing?.initId}
          onSubmit={({ initId, ...form }) => {
            if (editing) updateIssue(editing.initId, editing.issue.id, form)
            else addIssue(initId, form)
            setAdding(false); setEditing(null)
          }}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </section>
  )
}

function IssueRow({ issue, initName, onStatus, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="issue-card">
      <div className="issue-row">
        <span className={`imp-dot imp-${IMP_CLASS[issue.importance]}`} aria-hidden="true" title={`중요도 ${issue.importance}`} />
        <p className="issue-content">{issue.content}</p>
        <span className="issue-init-tag">{initName}</span>
        <select className={`status-select status-${STATUS_CLASS[issue.status]}`} value={issue.status}
          aria-label={`${issue.content} 상태`} onChange={(e) => onStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="issue-actions">
          <button className="icon-btn" onClick={onEdit} aria-label={`${issue.content} 편집`}>✏</button>
          <button className="icon-btn" onClick={onRemove} aria-label={`${issue.content} 삭제`}>🗑️</button>
        </span>
      </div>
      {issue.response && (
        <button type="button" className={`issue-response${expanded ? ' expanded' : ''}`}
          aria-label={`${issue.content} 대응안 ${expanded ? '접기' : '펼치기'}`} onClick={() => setExpanded(!expanded)}>
          <span className="issue-response-arrow" aria-hidden="true">↳</span>
          <span className="issue-response-text">{issue.response}</span>
        </button>
      )}
      {expanded && <p className="meta">등록 {issue.createdDate}{issue.resolvedDate ? ` · 해결 ${issue.resolvedDate}` : ''}</p>}
    </div>
  )
}

function IssueForm({ initiatives, initial, initialInitId, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      initId: f.get('initId'),
      content: f.get('content'),
      response: f.get('response'),
      importance: f.get('importance'),
    })
  }
  return (
    <Modal title={initial ? '쟁점 편집' : '쟁점 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>소속 과제
          <select name="initId" defaultValue={initialInitId ?? initiatives[0]?.id} disabled={!!initial}>
            {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
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

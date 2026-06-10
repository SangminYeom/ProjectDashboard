import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const SEVERITIES = ['높음', '중간', '낮음']
const STATUSES = ['열림', '대응중', '해결']
const SEV_CLASS = { 높음: 'high', 중간: 'mid', 낮음: 'low' }
const SEV_ORDER = { 높음: 0, 중간: 1, 낮음: 2 }

export default function ConsiderationLog({ considerations, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showResolved, setShowResolved] = useState(false)

  const active = considerations.filter((c) => c.status !== '해결')
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
  const resolved = considerations.filter((c) => c.status === '해결')

  function update(id, patch) {
    onChange(considerations.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function setStatus(c, status) {
    update(c.id, { status, resolvedDate: status === '해결' ? todayStr() : null })
  }
  function remove(c) {
    confirm(`'${c.title}'을(를) 삭제할까요?`) && onChange(considerations.filter((x) => x.id !== c.id))
  }

  const card = (c) => (
    <ConsiderationCard key={c.id} c={c} onStatus={setStatus} onEdit={() => setEditing(c)} onRemove={() => remove(c)} />
  )

  return (
    <section className="consideration-log">
      {active.map(card)}
      {active.length === 0 && <p className="empty">미해결 고려사항이 없습니다.</p>}
      <button className="btn-primary" onClick={() => setAdding(true)}>+ 고려사항 추가</button>

      {resolved.length > 0 && (
        <div className="resolved-section">
          <button className="link-btn" onClick={() => setShowResolved(!showResolved)}>
            ✓ 해결됨 {resolved.length}건 {showResolved ? '접기' : '보기'}
          </button>
          {showResolved && resolved.map(card)}
        </div>
      )}

      {(adding || editing) && (
        <ConsiderationForm
          initial={editing}
          onSubmit={(form) => {
            if (editing) update(editing.id, form)
            else onChange([...considerations, {
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

function ConsiderationCard({ c, onStatus, onEdit, onRemove }) {
  return (
    <div className={`consideration sev-${SEV_CLASS[c.severity]}`}>
      <div className="consideration-head">
        <span className={`badge sev-${SEV_CLASS[c.severity]}`}>{c.severity}</span>
        <h4>{c.title}</h4>
        <select value={c.status} aria-label={`${c.title} 상태`} onChange={(e) => onStatus(c, e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="icon-btn" onClick={onEdit} aria-label={`${c.title} 편집`}>✏️</button>
        <button className="icon-btn" onClick={onRemove} aria-label={`${c.title} 삭제`}>🗑️</button>
      </div>
      {c.content && <p>{c.content}</p>}
      {c.response && <p className="response">대응안: {c.response}</p>}
      <p className="meta">등록 {c.createdDate}{c.resolvedDate ? ` · 해결 ${c.resolvedDate}` : ''}</p>
    </div>
  )
}

function ConsiderationForm({ initial, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      title: f.get('title'), content: f.get('content'),
      response: f.get('response'), severity: f.get('severity'),
    })
  }
  return (
    <Modal title={initial ? '고려사항 편집' : '고려사항 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>제목 <input name="title" defaultValue={initial?.title} required /></label>
        <label>내용 <textarea name="content" defaultValue={initial?.content} /></label>
        <label>대응안 <textarea name="response" defaultValue={initial?.response} /></label>
        <label>중요도
          <select name="severity" defaultValue={initial?.severity ?? '중간'}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">저장</button>
      </form>
    </Modal>
  )
}

import { useState } from 'react'
import Modal from './Modal.jsx'
import { todayStr } from '../lib/calc.js'

const CYCLES = ['일', '주', '월', '분기']
const OP_STATUS = ['정상', '주의', '이슈']
const OP_ICON = { 정상: '🟢', 주의: '🟡', 이슈: '🔴' }

export default function OperationsTable({ operations, onChange }) {
  const [adding, setAdding] = useState(false)

  function update(id, patch) {
    onChange(operations.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  return (
    <section>
      <table className="op-table">
        <thead>
          <tr><th>업무</th><th>주기</th><th>담당</th><th>상태</th><th>최근 수행</th><th>메모</th><th /></tr>
        </thead>
        <tbody>
          {operations.map((o) => (
            <tr key={o.id}>
              <td>{o.name}</td>
              <td>{o.cycle}</td>
              <td>{o.owner}</td>
              <td>
                <select value={o.status} aria-label={`${o.name} 상태`}
                  onChange={(e) => update(o.id, { status: e.target.value })}>
                  {OP_STATUS.map((s) => <option key={s} value={s}>{OP_ICON[s]} {s}</option>)}
                </select>
              </td>
              <td>
                <span>{o.lastPerformed || '—'}</span>
                <button className="link-btn" aria-label={`${o.name} 오늘 수행`}
                  onClick={() => update(o.id, { lastPerformed: todayStr() })}>오늘 수행</button>
              </td>
              <td>
                <input value={o.memo} aria-label={`${o.name} 메모`}
                  onChange={(e) => update(o.id, { memo: e.target.value })} />
              </td>
              <td>
                <button className="icon-btn" aria-label={`${o.name} 삭제`}
                  onClick={() => confirm(`업무 '${o.name}'을(를) 삭제할까요?`) && onChange(operations.filter((x) => x.id !== o.id))}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {operations.length === 0 && <p className="empty">등록된 운영업무가 없습니다.</p>}
      <button className="btn-primary" onClick={() => setAdding(true)}>+ 운영업무 추가</button>
      {adding && (
        <OperationForm
          onSubmit={(op) => { onChange([...operations, { id: crypto.randomUUID(), ...op }]); setAdding(false) }}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  )
}

function OperationForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'), cycle: f.get('cycle'), owner: f.get('owner'),
      status: '정상', lastPerformed: '', memo: f.get('memo'),
    })
  }
  return (
    <Modal title="운영업무 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>업무명 <input name="name" required /></label>
        <label>주기 <select name="cycle">{CYCLES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>담당 <input name="owner" /></label>
        <label>메모 <input name="memo" /></label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}

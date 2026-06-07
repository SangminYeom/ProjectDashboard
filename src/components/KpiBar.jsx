import { useState } from 'react'
import Modal from './Modal.jsx'
import { kpiRate } from '../lib/calc.js'

const QUAL_STATUS = ['달성', '순항', '주의', '미달']
const QUAL_ICON = { 달성: '🏆', 순항: '🟢', 주의: '🟡', 미달: '🔴' }

export default function KpiBar({ kpis, onChange }) {
  const [adding, setAdding] = useState(false)

  function update(id, patch) {
    onChange(kpis.map((k) => (k.id === id ? { ...k, ...patch } : k)))
  }

  return (
    <section className="kpi-bar">
      {kpis.map((k) => (
        <div key={k.id} className="kpi-card">
          <div className="kpi-head">
            <strong>{k.name}</strong>
            <button className="icon-btn" aria-label={`${k.name} 삭제`}
              onClick={() => confirm(`KPI '${k.name}'을(를) 삭제할까요?`) && onChange(kpis.filter((x) => x.id !== k.id))}>✕</button>
          </div>
          {k.type === 'numeric' ? (
            <>
              <div className="kpi-rate">{kpiRate(k) ?? 0}%</div>
              <div className="kpi-detail">
                <input type="number" value={k.current} aria-label={`${k.name} 현재값`}
                  onChange={(e) => update(k.id, { current: Number(e.target.value) })} />
                <span>/ {k.target}{k.unit}</span>
              </div>
              <div className="gauge">
                <div className="gauge-fill" style={{ width: `${Math.min(100, kpiRate(k) ?? 0)}%` }} />
              </div>
            </>
          ) : (
            <select value={k.status} aria-label={`${k.name} 상태`}
              onChange={(e) => update(k.id, { status: e.target.value })}>
              {QUAL_STATUS.map((s) => <option key={s} value={s}>{QUAL_ICON[s]} {s}</option>)}
            </select>
          )}
        </div>
      ))}
      <button className="kpi-card add-card" onClick={() => setAdding(true)}>+ KPI</button>
      {adding && <KpiForm onSubmit={(kpi) => { onChange([...kpis, { id: crypto.randomUUID(), ...kpi }]); setAdding(false) }}
        onClose={() => setAdding(false)} />}
    </section>
  )
}

function KpiForm({ onSubmit, onClose }) {
  const [type, setType] = useState('numeric')
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit(type === 'numeric'
      ? { name: f.get('name'), type, target: Number(f.get('target')), current: Number(f.get('current')), unit: f.get('unit') }
      : { name: f.get('name'), type, status: f.get('status') })
  }
  return (
    <Modal title="KPI 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>이름 <input name="name" required /></label>
        <label>유형
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="numeric">수치형 (목표/현재)</option>
            <option value="qualitative">정성형 (상태)</option>
          </select>
        </label>
        {type === 'numeric' ? (
          <>
            <label>목표값 <input name="target" type="number" step="any" required /></label>
            <label>현재값 <input name="current" type="number" step="any" defaultValue="0" required /></label>
            <label>단위 <input name="unit" placeholder="억, %, 건 …" /></label>
          </>
        ) : (
          <label>상태
            <select name="status" defaultValue="순항">
              {QUAL_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}

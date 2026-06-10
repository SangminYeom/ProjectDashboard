import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import {
  kpiRate, initiativeProgress, countDelayedTasks, countOpenConsiderations, todayStr,
} from '../lib/calc.js'

const SEV_ORDER = { 높음: 0, 중간: 1, 낮음: 2 }

export default function Home({ projects, onOpen, onChange }) {
  const [adding, setAdding] = useState(false)
  const today = todayStr()
  const delayed = projects.reduce((n, p) => n + countDelayedTasks(p, today), 0)
  const open    = projects.reduce((n, p) => n + countOpenConsiderations(p), 0)

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">프로젝트 대시보드</h1>
        <div className="home-stats">
          <span className="home-stat">{projects.length}개</span>
          {delayed > 0 && (
            <><span className="home-stat-div" /><span className="home-stat home-stat--warn"><span className="dot dot-amber" /> 지연 {delayed}건</span></>
          )}
          {open > 0 && (
            <><span className="home-stat-div" /><span className="home-stat home-stat--issue"><span className="dot dot-red" /> 미해결 {open}건</span></>
          )}
        </div>
      </header>

      <div className="card-grid">
        {projects.map((p) => {
          return (
            <button key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
              <div className="card-head">
                <div className="card-name">{p.name}</div>
                <div className="card-period">
                  {p.startDate.slice(0, 7)} – {p.endDate.slice(0, 7)}
                </div>
              </div>

              {p.initiatives.length > 0 && (
                <>
                  <div className="sec">중점수행과제</div>
                  <div className="ini-list">
                    {p.initiatives.map((i) => {
                      const prog = initiativeProgress(i)
                      return (
                        <div key={i.id} className="ini-row">
                          <span className="ini-name">{i.name}</span>
                          <div className="ini-track"><div className="ini-fill" style={{ width: `${prog}%` }} /></div>
                          <span className="ini-pct">{prog}%</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {p.kpis.length > 0 && (
                <>
                  <div className="sec">KPI</div>
                  <div className="kpi-list">
                    {p.kpis.map((k) => (
                      <div key={k.id} className="kpi-row">
                        <span className="kpi-name">{k.name}</span>
                        {k.type === 'numeric' ? (
                          <div className="kpi-right">
                            <span className="kpi-nums">{k.current} / {k.target}{k.unit}</span>
                            <span className="kpi-prog">진척 {kpiRate(k) ?? 0}%</span>
                          </div>
                        ) : (
                          <span className="kpi-qual">{k.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="card-footer">
                {['정상', '주의', '이슈'].map((s) => {
                  const cnt = p.operations.filter((o) => o.status === s).length
                  if (!cnt) return null
                  const cls = s === '정상' ? 'dot-green' : s === '주의' ? 'dot-amber' : 'dot-red'
                  return <span key={s} className="stat"><span className={`dot ${cls}`} /> 운영 {s} {cnt}</span>
                })}
                {(() => {
                  const n = p.considerations.filter((c) => c.status !== '해결').length
                  return n > 0 ? <span className="stat"><span className="dot dot-red" /> 고려 {n}건</span> : null
                })()}
              </div>
            </button>
          )
        })}
        <button className="project-card add-card" onClick={() => setAdding(true)}>+ 새 프로젝트</button>
      </div>

      {adding && (
        <ProjectForm
          onSubmit={(form) => {
            onChange([...projects, {
              id: crypto.randomUUID(), ...form,
              kpis: [], initiatives: [], operations: [], considerations: [],
            }])
            setAdding(false)
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}

function ProjectForm({ onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'), description: f.get('description'),
      startDate: f.get('startDate'), endDate: f.get('endDate'),
    })
  }
  return (
    <Modal title="새 프로젝트" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>이름 <input name="name" required /></label>
        <label>설명 <textarea name="description" /></label>
        <label>시작일 <input name="startDate" type="date" required /></label>
        <label>종료일 <input name="endDate" type="date" required /></label>
        <button type="submit" className="btn-primary">추가</button>
      </form>
    </Modal>
  )
}

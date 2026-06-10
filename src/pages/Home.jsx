import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import {
  kpiRate, initiativeProgress, countDelayedTasks, countOpenConsiderations, todayStr,
} from '../lib/calc.js'

export default function Home({ projects, onOpen, onChange }) {
  const [adding, setAdding] = useState(false)
  const today = todayStr()
  const delayed = projects.reduce((n, p) => n + countDelayedTasks(p, today), 0)
  const open    = projects.reduce((n, p) => n + countOpenConsiderations(p), 0)

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">고객가치혁신유닛 Project Dashboard</h1>
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
                <div className="card-chip">
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
                </div>
              )}

              {p.kpis.length > 0 && (
                <div className="card-chip">
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
                </div>
              )}

              {p.operations.length > 0 && (
                <div className="card-chip">
                  <div className="sec">운영업무</div>
                  <div className="op-list">
                    {p.operations.map((o) => {
                      const cls = o.status === '정상' ? 'dot-green' : o.status === '주의' ? 'dot-amber' : 'dot-red'
                      return (
                        <div key={o.id} className="op-row">
                          <span className={`dot ${cls}`} />
                          <span className="op-item-name">{o.name}</span>
                          <span className="op-item-cycle">{o.cycle}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const n = p.considerations.filter((c) => c.status !== '해결').length
                return n > 0 ? (
                  <div className="card-footer">
                    <span className="stat"><span className="dot dot-red" /> 미해결 고려사항 {n}건</span>
                  </div>
                ) : null
              })()}
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

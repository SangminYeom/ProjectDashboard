import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import { kpiRate, initiativeProgress } from '../lib/calc.js'

export default function Home({ projects, onOpen, onChange }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">'26년 Project 목표 관리</h1>
        <p className="home-subtitle">고객가치혁신유닛</p>
      </header>

      <div className="card-grid">
        {projects.map((p) => {
          const openConsid = p.considerations.filter((c) => c.status !== '해결')
          const sevDot = (s) => s === '높음' ? 'dot-red' : s === '중간' ? 'dot-amber' : 'dot-green'
          return (
            <button key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
              <div className="card-head">
                <div className="card-name">{p.name}</div>
                <div className="card-period">
                  {p.startDate.slice(0, 7)} – {p.endDate.slice(0, 7)}
                </div>
              </div>

              {p.kpis.length > 0 && (
                <div className="card-chip">
                  <div className="sec">KPI</div>
                  <div className="kpi-list">
                    {p.kpis.map((k) => (
                      <div key={k.id} className="kpi-row">
                        <span className="kpi-name">{k.name}</span>
                        {k.type === 'numeric' ? (
                          <div className="kpi-right">
                            <span className="kpi-nums">{k.current}{k.unit} / {k.target}{k.unit}</span>
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

              {openConsid.length > 0 && (
                <div className="card-chip">
                  <div className="sec">고려사항</div>
                  <div className="op-list">
                    {openConsid.map((c) => (
                      <div key={c.id} className="op-row">
                        <span className={`dot ${sevDot(c.severity)}`} />
                        <span className="op-item-name">{c.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

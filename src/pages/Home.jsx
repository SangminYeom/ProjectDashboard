import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import {
  projectKpiAverage, countDelayedTasks, countOpenConsiderations, todayStr,
} from '../lib/calc.js'

export default function Home({ projects, onOpen, onChange }) {
  const [adding, setAdding] = useState(false)
  const today = todayStr()
  const delayed = projects.reduce((n, p) => n + countDelayedTasks(p, today), 0)
  const open = projects.reduce((n, p) => n + countOpenConsiderations(p), 0)

  return (
    <div className="home">
      <header className="page-head">
        <h1>📊 프로젝트 대시보드</h1>
        <p className="summary">프로젝트 {projects.length}개 · 지연 태스크 {delayed}건 · 미해결 고려사항 {open}건</p>
      </header>

      <div className="card-grid">
        {projects.map((p) => {
          const kpi = projectKpiAverage(p)
          const pDelayed = countDelayedTasks(p, today)
          const pOpen = countOpenConsiderations(p)
          return (
            <button key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
              <h2>{p.name}</h2>
              <p className="period">{p.startDate} ~ {p.endDate}</p>
              <p className="card-stats">
                <span>KPI {kpi === null ? '—' : `${kpi}%`}</span>
                <span>과제 {p.initiatives.length}건</span>
              </p>
              <div className="badges">
                {pDelayed > 0 && <span className="badge badge-warn">지연 {pDelayed}</span>}
                {pOpen > 0 && <span className="badge badge-issue">⚠ {pOpen}</span>}
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

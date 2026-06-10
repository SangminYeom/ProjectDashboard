import { useState } from 'react'
import KpiBar from '../components/KpiBar.jsx'
import Initiatives from '../components/Initiatives.jsx'
import OperationsTable from '../components/OperationsTable.jsx'
import ConsiderationLog from '../components/ConsiderationLog.jsx'
import Modal from '../components/Modal.jsx'
import { countOpenConsiderations } from '../lib/calc.js'

const TABS = ['중점수행과제', '운영업무', '고려사항']

export default function Project({ project, onChange, onDelete, onBack }) {
  const [tab, setTab] = useState(TABS[0])
  const [editing, setEditing] = useState(false)
  const counts = {
    중점수행과제: project.initiatives.length,
    운영업무: project.operations.length,
    고려사항: countOpenConsiderations(project),
  }

  return (
    <div className="project">
      <header className="page-head">
        <button className="back-btn" onClick={onBack}>← 홈</button>
        <div className="page-head-row">
          <div>
            <h1 className="proj-title">{project.name}</h1>
            <span className="proj-period">{project.startDate} – {project.endDate}</span>
          </div>
          <div className="page-head-actions">
            <button className="icon-btn" onClick={() => setEditing(true)}>✏</button>
            <button className="icon-btn danger"
              onClick={() => confirm(`'${project.name}' 프로젝트를 삭제할까요?`) && onDelete()}>삭제</button>
          </div>
        </div>
      </header>

      {editing && (
        <ProjectEditForm
          project={project}
          onSubmit={(patch) => { onChange((p) => ({ ...p, ...patch })); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}

      <KpiBar kpis={project.kpis} onChange={(kpis) => onChange((p) => ({ ...p, kpis }))} />

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t} ({counts[t]})
          </button>
        ))}
      </nav>

      {tab === '중점수행과제' && (
        <Initiatives initiatives={project.initiatives}
          onChange={(initiatives) => onChange((p) => ({ ...p, initiatives }))} />
      )}
      {tab === '운영업무' && (
        <OperationsTable operations={project.operations}
          onChange={(operations) => onChange((p) => ({ ...p, operations }))} />
      )}
      {tab === '고려사항' && (
        <ConsiderationLog considerations={project.considerations}
          onChange={(considerations) => onChange((p) => ({ ...p, considerations }))} />
      )}
    </div>
  )
}

function ProjectEditForm({ project, onSubmit, onClose }) {
  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      name: f.get('name'),
      description: f.get('description'),
      startDate: f.get('startDate'),
      endDate: f.get('endDate'),
    })
  }
  return (
    <Modal title="프로젝트 수정" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>이름 <input name="name" defaultValue={project.name} required /></label>
        <label>설명 <textarea name="description" defaultValue={project.description} /></label>
        <label>시작일 <input name="startDate" type="date" defaultValue={project.startDate} required /></label>
        <label>종료일 <input name="endDate" type="date" defaultValue={project.endDate} required /></label>
        <button type="submit" className="btn-primary">저장</button>
      </form>
    </Modal>
  )
}

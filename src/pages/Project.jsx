import { useState } from 'react'
import KpiBar from '../components/KpiBar.jsx'
import Initiatives from '../components/Initiatives.jsx'
import OperationsTable from '../components/OperationsTable.jsx'
import ConsiderationLog from '../components/ConsiderationLog.jsx'
import { countOpenConsiderations } from '../lib/calc.js'

const TABS = ['중점수행과제', '운영업무', '고려사항']

export default function Project({ project, onChange, onDelete, onBack }) {
  const [tab, setTab] = useState(TABS[0])
  const counts = {
    중점수행과제: project.initiatives.length,
    운영업무: project.operations.length,
    고려사항: countOpenConsiderations(project),
  }

  return (
    <div className="project">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack}>← 홈</button>
        <h1>{project.name}</h1>
        <span className="period">{project.startDate} ~ {project.endDate}</span>
        <button className="icon-btn danger"
          onClick={() => confirm(`'${project.name}' 프로젝트를 삭제할까요?`) && onDelete()}>삭제</button>
      </header>

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

import { useState, useRef, forwardRef, Fragment } from 'react'
import { toPng } from 'html-to-image'
import KpiBar from '../components/KpiBar.jsx'
import Initiatives from '../components/Initiatives.jsx'
import OperationsTable from '../components/OperationsTable.jsx'
import ConsiderationLog from '../components/ConsiderationLog.jsx'
import Modal from '../components/Modal.jsx'
import { countOpenConsiderations, kpiRate, initiativeProgress } from '../lib/calc.js'

const TABS = ['중점수행과제', '운영업무', '고려사항']

export default function Project({ project, onChange, onDelete, onBack }) {
  const [tab, setTab] = useState(TABS[0])
  const [editing, setEditing] = useState(false)
  const reportRef = useRef(null)
  const counts = {
    중점수행과제: project.initiatives.length,
    운영업무: project.operations.length,
    고려사항: countOpenConsiderations(project),
  }

  function handleExport() {
    toPng(reportRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
      .then((dataUrl) => {
        const a = document.createElement('a')
        a.download = `${project.name}.png`
        a.href = dataUrl
        a.click()
      })
      .catch((err) => console.error('PNG 내보내기 실패:', err))
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
            <button className="btn-export" onClick={handleExport} aria-label="PNG 내보내기">↓ PNG</button>
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

      <ProjectSnapshot ref={reportRef} project={project} />
    </div>
  )
}

const ProjectSnapshot = forwardRef(function ProjectSnapshot({ project }, ref) {
  const openConsid = project.considerations.filter((c) => c.status !== '해결')
  const sevDot = (s) => s === '높음' ? 'dot-red' : s === '중간' ? 'dot-amber' : 'dot-green'

  return (
    <div ref={ref} className="project-snapshot" aria-hidden="true">
      <div className="snapshot-head">
        <div className="snapshot-title">{project.name}</div>
        <div className="snapshot-period">{project.startDate} – {project.endDate}</div>
      </div>

      {project.kpis.length > 0 && (
        <div className="card-chip">
          <div className="sec">KPI</div>
          <div className="kpi-list">
            {project.kpis.map((k) => (
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

      {project.initiatives.length > 0 && (
        <div className="card-chip">
          <div className="sec">중점수행과제</div>
          <div className="ini-list">
            {project.initiatives.map((i) => {
              const prog = initiativeProgress(i)
              return (
                <Fragment key={i.id}>
                  <div className="ini-row">
                    <span className="ini-name">{i.name}</span>
                    <div className="ini-track"><div className="ini-fill" style={{ width: `${prog}%` }} /></div>
                    <span className="ini-pct">{prog}%</span>
                  </div>
                  {(i.milestones ?? []).map((m) => (
                    <div key={m.id} className="ini-row">
                      <span className="ini-name">
                        <span className="milestone-icon">◆</span>{m.name}
                      </span>
                      <div style={{ flex: 1 }} />
                      <span className="ini-pct" style={{ color: '#b45309' }}>{m.date}</span>
                    </div>
                  ))}
                </Fragment>
              )
            })}
          </div>
        </div>
      )}

      {project.operations.length > 0 && (
        <div className="card-chip">
          <div className="sec">운영업무</div>
          <div className="op-list">
            {project.operations.map((o) => {
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
    </div>
  )
})

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

import { useState, useRef, forwardRef, Fragment } from 'react'
import { toPng } from 'html-to-image'
import Initiatives from '../components/Initiatives.jsx'
import OperationsTable from '../components/OperationsTable.jsx'
import ProjectOverview from '../components/ProjectOverview.jsx'
import ProjectIssues from '../components/ProjectIssues.jsx'
import ProjectForm from '../components/ProjectForm.jsx'
import { kpiRate, initiativeProgress, countOpenIssues } from '../lib/calc.js'
import { projectColor } from '../lib/colors.js'
import { EditIcon, ArrowLeftIcon } from '../components/icons.jsx'

const TABS = ['개요', '과제', '운영', '쟁점']

export default function Project({ project, onChange, onDelete, onBack }) {
  const [tab, setTab] = useState(TABS[0])
  const [editing, setEditing] = useState(false)
  const reportRef = useRef(null)
  const counts = {
    개요: null,
    과제: project.initiatives.length,
    운영: project.operations.length,
    쟁점: countOpenIssues(project),
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
        <button className="back-btn" onClick={onBack}><ArrowLeftIcon /> 홈</button>
        <div className="page-head-row">
          <div>
            <h1 className="proj-title">
              <span className="proj-dot" style={{ background: projectColor(project.id) }} aria-hidden="true" />
              {project.name}
            </h1>
            <span className="proj-period">{project.startDate} – {project.endDate}</span>
          </div>
          <div className="page-head-actions">
            <button className="btn-export" onClick={handleExport} aria-label="PNG 내보내기">↓ PNG</button>
            <button className="icon-btn" aria-label="프로젝트 수정" onClick={() => setEditing(true)}><EditIcon /></button>
            <button className="icon-btn danger"
              onClick={() => confirm(`'${project.name}' 프로젝트를 삭제할까요?`) && onDelete()}>삭제</button>
          </div>
        </div>
      </header>

      {editing && (
        <ProjectForm
          initial={project}
          onSubmit={(patch) => { onChange((p) => ({ ...p, ...patch })); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}{counts[t] != null ? ` (${counts[t]})` : ''}
          </button>
        ))}
      </nav>

      {tab === '개요' && <ProjectOverview project={project} onChange={onChange} />}
      {tab === '과제' && (
        <Initiatives initiatives={project.initiatives}
          onChange={(initiatives) => onChange((p) => ({ ...p, initiatives }))} />
      )}
      {tab === '운영' && (
        <OperationsTable operations={project.operations}
          onChange={(operations) => onChange((p) => ({ ...p, operations }))} />
      )}
      {tab === '쟁점' && (
        <ProjectIssues initiatives={project.initiatives}
          onChange={(initiatives) => onChange((p) => ({ ...p, initiatives }))} />
      )}

      <ProjectSnapshot ref={reportRef} project={project} />
    </div>
  )
}

const ProjectSnapshot = forwardRef(function ProjectSnapshot({ project }, ref) {
  const openIssues = project.initiatives.flatMap((i) => i.issues ?? []).filter((iss) => iss.status !== '해결')
  const impDot = (s) => s === '상' ? 'dot-red' : s === '중' ? 'dot-amber' : 'dot-green'

  return (
    <div ref={ref} className="project-snapshot" aria-hidden="true">
      <div className="snapshot-head">
        <div className="snapshot-title">{project.name}</div>
        <div className="snapshot-period">{project.startDate} – {project.endDate}</div>
      </div>

      {project.kpis.length > 0 && (
        <div className="card-chip">
          <div className="sec"><span className="sec-icon" aria-hidden="true">◎</span>KPI</div>
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
          <div className="sec"><span className="sec-icon" aria-hidden="true">⚑</span>중점수행과제</div>
          <div className="ini-list">
            {project.initiatives.map((i) => {
              const prog = initiativeProgress(i)
              return (
                <Fragment key={i.id}>
                  <div className="ini-row">
                    <span className="ini-name" title={i.name}>{i.name}</span>
                    <div className="ini-track"><div className="ini-fill" style={{ width: `${prog}%` }} /></div>
                    <span className="ini-pct">{prog}%</span>
                  </div>
                  {(i.items ?? i.milestones ?? []).filter(x => x.type === 'milestone' || (!x.type && x.date && !x.startDate)).map((m) => (
                    <div key={m.id} className="ini-row">
                      <span className="ini-name" title={m.name}>
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
          <div className="sec"><span className="sec-icon" aria-hidden="true">⚙</span>운영업무</div>
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

      {openIssues.length > 0 && (
        <div className="card-chip">
          <div className="sec"><span className="sec-icon" aria-hidden="true">⚠</span>쟁점</div>
          <div className="op-list">
            {openIssues.map((iss) => (
              <div key={iss.id} className="op-row">
                <span className={`dot ${impDot(iss.importance)}`} />
                <span className="op-item-name">{iss.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

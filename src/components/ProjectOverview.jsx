import KpiBar from './KpiBar.jsx'
import { initiativeProgress } from '../lib/calc.js'

const IMP_CLASS = { 상: 'high', 중: 'mid', 하: 'low' }

export default function ProjectOverview({ project, onChange }) {
  const openIssues = project.initiatives
    .flatMap((i) => (i.issues ?? []).map((iss) => ({ ...iss, initiativeName: i.name })))
    .filter((iss) => iss.status !== '해결')

  return (
    <div className="overview">
      <KpiBar kpis={project.kpis} onChange={(kpis) => onChange((p) => ({ ...p, kpis }))} />

      <div className="overview-cols">
        <section className="overview-block">
          <div className="sec">과제 진척</div>
          {project.initiatives.length === 0 && <p className="empty">등록된 과제가 없습니다.</p>}
          {project.initiatives.map((i) => {
            const prog = initiativeProgress(i)
            return (
              <div key={i.id} className="ini-row">
                <span className="ini-name">{i.name}</span>
                <div className="ini-track"><div className="ini-fill" style={{ width: `${prog}%` }} /></div>
                <span className="ini-pct">{prog}%</span>
              </div>
            )
          })}
        </section>

        <section className="overview-block">
          <div className="sec">주요 쟁점</div>
          {openIssues.length === 0 && <p className="empty">미해결 쟁점이 없습니다.</p>}
          {openIssues.map((iss) => (
            <div key={iss.id} className="ov-issue-row">
              <span className={`imp-dot imp-${IMP_CLASS[iss.importance]}`} aria-hidden="true" />
              <span className="ov-issue-content">{iss.content}</span>
              <span className="ov-issue-init">{iss.initiativeName}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

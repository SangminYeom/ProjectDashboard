import { kpiRate, initiativeProgress } from '../lib/calc.js'
import { projectColor } from '../lib/colors.js'
import { projectProgress } from '../lib/projectStatus.js'
import ProgressRing from '../components/ProgressRing.jsx'

export default function Home({ projects, onOpen }) {
  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">'26년 Project 목표 관리</h1>
        <p className="home-subtitle">고객가치혁신유닛</p>
      </header>

      <div className="card-grid">
        {projects.map((p) => {
          const openIssues = p.initiatives.flatMap((i) => i.issues ?? []).filter((iss) => iss.status !== '해결')
          const impDot = (s) => s === '상' ? 'dot-red' : s === '중' ? 'dot-amber' : 'dot-green'
          return (
            <button key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
              <div className="card-head">
                <div>
                  <div className="card-name">
                    <span className="card-dot" style={{ background: projectColor(p.id) }} aria-hidden="true" />
                    {p.name}
                  </div>
                  <div className="card-period">{p.startDate.slice(0, 7)} – {p.endDate.slice(0, 7)}</div>
                </div>
                <ProgressRing pct={projectProgress(p)} size={36} stroke={3.5} />
              </div>

              {p.kpis.length > 0 && (
                <div className="card-chip">
                  <div className="sec"><span className="sec-icon" aria-hidden="true">◎</span>KPI</div>
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
                  <div className="sec"><span className="sec-icon" aria-hidden="true">⚑</span>중점수행과제</div>
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
                  <div className="sec"><span className="sec-icon" aria-hidden="true">⚙</span>운영업무</div>
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
            </button>
          )
        })}
      </div>
    </div>
  )
}

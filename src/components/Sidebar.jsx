import { projectColor } from '../lib/colors.js'
import { projectSidebarStatus } from '../lib/projectStatus.js'

export default function Sidebar({ projects, view, onNavigate, onAddProject }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">고객가치혁신유닛</div>

      <button
        className={`side-item side-home${view.page === 'home' ? ' active' : ''}`}
        onClick={() => onNavigate({ page: 'home' })}
      >
        <span className="side-ico" aria-hidden="true">▦</span>
        <span className="side-project-name">전체 개요</span>
      </button>

      <div className="side-section-label">프로젝트</div>
      <ul className="side-projects">
        {projects.map((p) => {
          const st = projectSidebarStatus(p)
          const active = view.page === 'project' && view.id === p.id
          return (
            <li key={p.id}>
              <button
                className={`side-item side-project${active ? ' active' : ''}`}
                onClick={() => onNavigate({ page: 'project', id: p.id })}
              >
                <span className="side-dot" style={{ background: projectColor(p.id) }} aria-hidden="true" />
                <span className="side-project-name">{p.name}</span>
                <span className={`side-badge side-badge--${st.tone}`}>{st.text}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <button className="side-item side-add" onClick={onAddProject}>+ 새 프로젝트</button>
    </aside>
  )
}

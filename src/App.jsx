import { useEffect, useRef, useState } from 'react'
import { loadProjects, createDebouncedSave } from './api.js'
import Home from './pages/Home.jsx'
import Project from './pages/Project.jsx'

export default function App() {
  const [projects, setProjects] = useState(null) // null = 로딩 중
  const [view, setView] = useState({ page: 'home' })
  const [notice, setNotice] = useState(null) // { type: 'error' | 'info', text }
  const saveRef = useRef(null)

  useEffect(() => {
    saveRef.current = createDebouncedSave({
      onError: (err) => setNotice(err
        ? { type: 'error', text: '저장에 실패했습니다. 변경 내용은 화면에 유지되어 있으니 잠시 후 다시 수정해 보세요.' }
        : null),
    })
    loadProjects()
      .then(({ projects, recoveredFrom }) => {
        setProjects(projects)
        if (recoveredFrom) {
          setNotice({ type: 'info', text: `데이터 파일이 손상되어 백업(${recoveredFrom})에서 복구했습니다.` })
        }
      })
      .catch(() => setNotice({ type: 'error', text: '데이터를 불러오지 못했습니다. 서버 실행 상태를 확인하세요.' }))
  }, [])

  function updateProjects(next) {
    setProjects(next)
    saveRef.current?.(next)
  }

  function updateProject(id, updater) {
    updateProjects(projects.map((p) => (p.id === id ? updater(p) : p)))
  }

  if (projects === null) {
    return (
      <div className="app">
        {notice && <div className={`banner banner-${notice.type}`}>{notice.text}</div>}
        <div className="loading">불러오는 중…</div>
      </div>
    )
  }

  const current = view.page === 'project' ? projects.find((p) => p.id === view.id) : null

  return (
    <div className="app">
      {notice && <div className={`banner banner-${notice.type}`}>{notice.text}</div>}
      {current ? (
        <Project
          key={current.id}
          project={current}
          onChange={(updater) => updateProject(current.id, updater)}
          onDelete={() => {
            updateProjects(projects.filter((p) => p.id !== current.id))
            setView({ page: 'home' })
          }}
          onBack={() => setView({ page: 'home' })}
        />
      ) : (
        <Home projects={projects} onOpen={(id) => setView({ page: 'project', id })} onChange={updateProjects} />
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { loadProjects, createDebouncedSave } from './api.js'
import { AuthError } from './auth-error.js'
import Home from './pages/Home.jsx'
import Project from './pages/Project.jsx'
import Login from './pages/Login.jsx'

export default function App() {
  const [projects, setProjects] = useState(null)
  const [view, setView] = useState({ page: 'home' })
  const [notice, setNotice] = useState(null)
  const [authed, setAuthed] = useState(null) // null=확인중, false=미인증, true=인증됨
  const saveRef = useRef(null)

  useEffect(() => {
    saveRef.current = createDebouncedSave({
      onError: (err) => {
        if (err instanceof AuthError) { setAuthed(false); return }
        setNotice(err
          ? { type: 'error', text: '저장에 실패했습니다. 변경 내용은 화면에 유지되어 있으니 잠시 후 다시 수정해 보세요.' }
          : null)
      },
    })
    loadProjects()
      .then(({ projects, recoveredFrom }) => {
        setAuthed(true)
        setProjects(projects)
        if (recoveredFrom) {
          setNotice({ type: 'info', text: `데이터 파일이 손상되어 백업(${recoveredFrom})에서 복구했습니다.` })
        }
      })
      .catch((err) => {
        if (err instanceof AuthError) { setAuthed(false); return }
        setAuthed(true)
        setNotice({ type: 'error', text: '데이터를 불러오지 못했습니다. 서버 실행 상태를 확인하세요.' })
      })
  }, [])

  function updateProjects(next) {
    setProjects(next)
    saveRef.current?.(next)
  }

  function updateProject(id, updater) {
    updateProjects(projects.map((p) => (p.id === id ? updater(p) : p)))
  }

  if (authed === null) {
    return <div className="app"><div className="loading">불러오는 중…</div></div>
  }

  if (!authed) {
    return <Login onSuccess={() => window.location.reload()} />
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

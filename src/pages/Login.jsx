import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const password = e.target.elements.password.value
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      })
      if (res.ok) {
        onSuccess()
      } else {
        setError('비밀번호가 올바르지 않습니다.')
      }
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">'26년 Project 목표 관리</h1>
        <p className="login-subtitle">고객가치혁신유닛</p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            비밀번호
            <input name="password" type="password" aria-label="비밀번호" required autoFocus />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '확인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

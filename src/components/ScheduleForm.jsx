import { useState } from 'react'
import Modal from './Modal.jsx'

export default function ScheduleForm({ initial, onSubmit, onClose }) {
  const [undated, setUndated] = useState(!!initial && initial.date == null)

  function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    onSubmit({
      title: f.get('title'),
      date: undated ? null : f.get('date'),
      memo: f.get('memo'),
    })
  }

  return (
    <Modal title={initial ? '일정 수정' : '일정 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>제목 <input name="title" defaultValue={initial?.title} required /></label>
        <label className="form-checkbox-label">
          <input type="checkbox" checked={undated} onChange={(e) => setUndated(e.target.checked)} />
          날짜 미정
        </label>
        <label>날짜 <input name="date" type="date" defaultValue={initial?.date ?? ''} disabled={undated} /></label>
        <label>메모 <textarea name="memo" defaultValue={initial?.memo} /></label>
        <button type="submit" className="btn-primary">{initial ? '저장' : '추가'}</button>
      </form>
    </Modal>
  )
}

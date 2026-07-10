import Modal from './Modal.jsx'

export default function ProjectForm({ initial, onSubmit, onClose }) {
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
    <Modal title={initial ? '프로젝트 수정' : '새 프로젝트'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>이름 <input name="name" defaultValue={initial?.name} required /></label>
        <label>설명 <textarea name="description" defaultValue={initial?.description} /></label>
        <label>시작일 <input name="startDate" type="date" defaultValue={initial?.startDate} required /></label>
        <label>종료일 <input name="endDate" type="date" defaultValue={initial?.endDate} required /></label>
        <button type="submit" className="btn-primary">{initial ? '저장' : '추가'}</button>
      </form>
    </Modal>
  )
}

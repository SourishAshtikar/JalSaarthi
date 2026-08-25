import { useState } from 'react'
import Modal from './Modal'

export default function LogIrrigationForm({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    duration: '2.0',
    method: 'Drip',
    notes: '',
  })
  const [submitted, setSubmitted] = useState(false)

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(form)
    setSubmitted(true)
  }

  return (
    <Modal title="Log irrigation event" onClose={onClose}>
      {submitted ? (
        <div className="form-success">
          <p>Logged — thanks. This updates the plot's irrigation history and summary.</p>
          <button className="btn btn--cane" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field field--block">
            <span>Irrigation date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              required
            />
          </label>

          <label className="field field--block">
            <span>Duration (hours)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.duration}
              onChange={(e) => update('duration', e.target.value)}
              required
            />
          </label>

          <label className="field field--block">
            <span>Irrigation method</span>
            <select value={form.method} onChange={(e) => update('method', e.target.value)}>
              <option>Drip</option>
              <option>Sprinkler</option>
              <option>Flood / Furrow</option>
            </select>
          </label>

          <label className="field field--block">
            <span>Notes (optional)</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="e.g. pump ran at reduced pressure"
            />
          </label>

          <button className="btn btn--cane btn--full" type="submit">
            Submit log
          </button>
        </form>
      )}
    </Modal>
  )
}

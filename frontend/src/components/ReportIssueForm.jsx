import { useState } from 'react'
import Modal from './Modal'

export default function ReportIssueForm({ onClose }) {
  const [form, setForm] = useState({
    category: 'Sensor malfunction',
    urgency: 'Normal',
    description: '',
    contact: '',
  })
  const [submitted, setSubmitted] = useState(false)

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <Modal title="Report an issue / request field visit" onClose={onClose}>
      {submitted ? (
        <div className="form-success">
          <p>
            Request received. A field assistant will follow up
            {form.urgency === 'Urgent' ? ' within 24 hours.' : ' within 2–3 days.'}
          </p>
          <button className="btn btn--cane" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field field--block">
            <span>Category</span>
            <select value={form.category} onChange={(e) => update('category', e.target.value)}>
              <option>Sensor malfunction</option>
              <option>Pump / irrigation hardware</option>
              <option>Crop disease or pest</option>
              <option>Advisory seems incorrect</option>
              <option>Other</option>
            </select>
          </label>

          <label className="field field--block">
            <span>Urgency</span>
            <select value={form.urgency} onChange={(e) => update('urgency', e.target.value)}>
              <option>Normal</option>
              <option>Urgent</option>
            </select>
          </label>

          <label className="field field--block">
            <span>Description</span>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="What's happening on the plot?"
            />
          </label>

          <label className="field field--block">
            <span>Contact number (optional)</span>
            <input
              type="tel"
              value={form.contact}
              onChange={(e) => update('contact', e.target.value)}
              placeholder="9XXXXXXXXX"
            />
          </label>

          <button className="btn btn--cane btn--full" type="submit">
            Send request
          </button>
        </form>
      )}
    </Modal>
  )
}

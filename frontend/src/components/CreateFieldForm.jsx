import { useState } from 'react'
import Modal from './Modal'

const initialForm = {
  name: '',
  acreage: '',
  crop: 'Sugarcane',
  variety: '',
  plantingDate: '',
}

function validate(form, existingPlots) {
  const errors = {}
  const name = form.name.trim()
  const acreage = Number(form.acreage)
  const today = new Date().toISOString().slice(0, 10)

  if (name.length < 2) errors.name = 'Enter a field name of at least 2 characters.'
  if (existingPlots.some((plot) => plot.name.toLowerCase() === name.toLowerCase())) {
    errors.name = 'A field with this name already exists on this farm.'
  }
  if (!Number.isFinite(acreage) || acreage < 0.1 || acreage > 10000) {
    errors.acreage = 'Enter an area between 0.1 and 10,000 acres.'
  }
  if (!form.crop) errors.crop = 'Select a crop.'
  if (form.variety.trim().length < 2) errors.variety = 'Enter the crop variety.'
  if (!form.plantingDate) errors.plantingDate = 'Select the planting date.'
  else if (form.plantingDate > today) errors.plantingDate = 'Planting date cannot be in the future.'

  return errors
}

export default function CreateFieldForm({ farm, onClose, onSubmit }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(form, farm.plots)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      name: form.name.trim(),
      acreage: Number(form.acreage),
      crop: form.crop,
      variety: form.variety.trim(),
      plantingDate: form.plantingDate,
    })
  }

  return (
    <Modal title={`Create field — ${farm.name}`} onClose={onClose}>
      <form className="stack-form" onSubmit={handleSubmit} noValidate>
        <label className="field field--block">
          <span>Field name</span>
          <input
            autoFocus
            aria-invalid={Boolean(errors.name)}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="e.g. North field"
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>

        <label className="field field--block">
          <span>Area (acres)</span>
          <input
            type="number"
            min="0.1"
            max="10000"
            step="0.1"
            aria-invalid={Boolean(errors.acreage)}
            value={form.acreage}
            onChange={(event) => update('acreage', event.target.value)}
            placeholder="e.g. 4.5"
          />
          {errors.acreage && <span className="field-error">{errors.acreage}</span>}
        </label>

        <label className="field field--block">
          <span>Crop</span>
          <select value={form.crop} onChange={(event) => update('crop', event.target.value)}>
            <option>Sugarcane</option>
            <option>Maize</option>
            <option>Millet</option>
            <option>Vegetables</option>
          </select>
          {errors.crop && <span className="field-error">{errors.crop}</span>}
        </label>

        <label className="field field--block">
          <span>Variety</span>
          <input
            aria-invalid={Boolean(errors.variety)}
            value={form.variety}
            onChange={(event) => update('variety', event.target.value)}
            placeholder="e.g. Co 86032"
          />
          {errors.variety && <span className="field-error">{errors.variety}</span>}
        </label>

        <label className="field field--block">
          <span>Planting date</span>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            aria-invalid={Boolean(errors.plantingDate)}
            value={form.plantingDate}
            onChange={(event) => update('plantingDate', event.target.value)}
          />
          {errors.plantingDate && <span className="field-error">{errors.plantingDate}</span>}
        </label>

        <button className="btn btn--cane btn--full" type="submit">Create field</button>
      </form>
    </Modal>
  )
}

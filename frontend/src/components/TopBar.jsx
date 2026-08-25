import { Download, Plus } from 'lucide-react'

export default function TopBar({ farms, farmId, plotId, onFarmChange, onPlotChange, plot, onCreateField }) {
  const farm = farms.find((f) => f.id === farmId)

  return (
    <div className="topbar">
      <form className="topbar__form" onSubmit={(e) => e.preventDefault()}>
        <label className="field">
          <span>Farm</span>
          <select value={farmId} onChange={(e) => onFarmChange(e.target.value)}>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Plot</span>
          <select value={plotId} onChange={(e) => onPlotChange(e.target.value)}>
            {farm.plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Crop</span>
          <div className="field__readout">{plot.crop}</div>
        </div>

        <div className="field">
          <span>Variety</span>
          <div className="field__readout">{plot.variety}</div>
        </div>

        <div className="field field--readout">
          <span>Crop age</span>
          <div className="field__readout">{plot.cropAgeMonths} months</div>
        </div>
      </form>

      <div className="topbar__actions">
        <button className="btn btn--cane" type="button" onClick={onCreateField}>
          <Plus size={16} strokeWidth={2} />
          Create field
        </button>
        <button className="btn btn--ghost" type="button">
          <Download size={16} strokeWidth={2} />
          Download report
        </button>
      </div>
    </div>
  )
}

import { Droplets, CalendarClock, Timer, Gauge } from 'lucide-react'

export default function IrrigationAdvisoryCard({ plot, onLogIrrigation }) {
  const riskClass = {
    Low: 'chip--cane',
    Medium: 'chip--amber',
    High: 'chip--danger',
  }[plot.waterStressRisk]

  return (
    <div className="card card--advisory">
      <div className="card__head">
        <div>
          <h3>Irrigation advisory</h3>
          <span className="card__tag">AI recommendation</span>
        </div>
        <span className={`chip ${riskClass}`}>{plot.waterStressRisk} risk</span>
      </div>

      <div className="advisory__hero">
        <Droplets size={30} strokeWidth={1.6} />
        <div>
          <div className="advisory__hero-title">
            Recommended irrigation: {plot.irrigationDuration} h
          </div>
          <div className="advisory__hero-sub">
            Soil moisture is low and no rainfall expected in next 24 hours.
          </div>
        </div>
      </div>

      <div className="advisory__stats">
        <div className="stat">
          <CalendarClock size={16} strokeWidth={1.8} />
          <div>
            <div className="stat__label">Next irrigation date</div>
            <div className="stat__value">
              {new Date(plot.nextIrrigationDate).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
        <div className="stat">
          <Timer size={16} strokeWidth={1.8} />
          <div>
            <div className="stat__label">Irrigation duration</div>
            <div className="stat__value">{plot.irrigationDuration} h</div>
          </div>
        </div>
        <div className="stat">
          <Droplets size={16} strokeWidth={1.8} />
          <div>
            <div className="stat__label">Water requirement</div>
            <div className="stat__value">{plot.waterRequirement} m³/ha</div>
          </div>
        </div>
        <div className="stat">
          <Gauge size={16} strokeWidth={1.8} />
          <div>
            <div className="stat__label">Water stress risk</div>
            <div className="stat__value">{plot.waterStressRisk}</div>
          </div>
        </div>
      </div>

      <p className="advisory__note">
        Based on soil moisture, weather forecast, crop stage and AI prediction.
      </p>

      <button className="btn btn--cane" onClick={onLogIrrigation}>
        Log irrigation event
      </button>
    </div>
  )
}

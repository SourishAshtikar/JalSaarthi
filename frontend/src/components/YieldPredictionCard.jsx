import { TrendingUp, AlertTriangle } from 'lucide-react'

export default function YieldPredictionCard({ plot }) {
  const spread = plot.yieldRangeHigh - plot.yieldRangeLow
  const pos = ((plot.predictedYield - plot.yieldRangeLow) / spread) * 100

  return (
    <div className="card">
      <div className="card__head">
        <h3>Yield Prediction</h3>
      </div>

      <div className="yield__hero">
        <TrendingUp size={26} strokeWidth={1.6} />
        <div>
          <div className="metric__label">Predicted yield</div>
          <div className="advisory__hero-title advisory__hero-title--sm">
            {plot.predictedYield} t/ha
          </div>
        </div>
      </div>

      <div className="yield__range">
        <div className="yield__range-label">
          <span>{plot.yieldRangeLow}</span>
          <span>Potential yield range</span>
          <span>{plot.yieldRangeHigh}</span>
        </div>
        <div className="yield__range-track">
          <div className="yield__range-marker" style={{ left: `${pos}%` }} />
        </div>
      </div>

      {plot.waterStressRisk !== 'Low' && (
        <div className="callout callout--amber">
          <AlertTriangle size={15} strokeWidth={1.8} />
          Delay in irrigation by 5 days may cause yield loss of 6–8%.
        </div>
      )}
    </div>
  )
}

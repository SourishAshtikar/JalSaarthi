import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts'

export default function CropHealthCard({ plot }) {
  const stress = plot.waterStressIndex > 0.45
    ? { label: 'High', className: 'chip--danger' }
    : plot.waterStressIndex > 0.25
      ? { label: 'Moderate', className: 'chip--amber' }
      : { label: 'Low', className: 'chip--cane' }
  const trend = plot.irrigationHistory.map((h, i) => ({
    date: h.date,
    ndvi: +(plot.ndvi - 0.1 + i * 0.02).toFixed(2),
    stress: +(plot.waterStressIndex + 0.15 - i * 0.03).toFixed(2),
  }))

  return (
    <div className="card">
      <div className="card__head">
        <h3>Crop Health</h3>
        <span className="card__tag">View more</span>
      </div>

      <div className="crop-health__metrics">
        <div>
          <div className="metric__label">NDVI</div>
          <div className="metric__value">
            {plot.ndvi} <span className="chip chip--sm chip--cane">Good</span>
          </div>
          <div className="sparkline">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={trend}>
                <YAxis hide domain={['dataMin - 0.05', 'dataMax + 0.05']} />
                <Line type="monotone" dataKey="ndvi" stroke="#2f6b45" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="metric__label">Water Stress Index</div>
          <div className="metric__value">
            {plot.waterStressIndex}{' '}
            <span className={`chip chip--sm ${stress.className}`}>
              {stress.label}
            </span>
          </div>
          <div className="sparkline">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={trend}>
                <YAxis hide domain={['dataMin - 0.05', 'dataMax + 0.05']} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelStyle={{ fontFamily: 'var(--font-mono)' }}
                />
                <Line type="monotone" dataKey="stress" stroke="#c98a1f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="advisory__note">
        Crop condition is good. Water stress is increasing — follow irrigation advisory.
      </p>
    </div>
  )
}

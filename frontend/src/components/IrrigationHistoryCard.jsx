import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function IrrigationHistoryCard({ plot }) {
  return (
    <div className="card">
      <div className="card__head">
        <h3>Irrigation &amp; Water Summary</h3>
      </div>

      <div className="summary-grid">
        <div>
          <div className="metric__label">Total irrigations</div>
          <div className="metric__value">{plot.totalIrrigations}</div>
        </div>
        <div>
          <div className="metric__label">Total water applied</div>
          <div className="metric__value">{plot.totalWaterApplied} m³</div>
        </div>
        <div>
          <div className="metric__label">Avg. duration</div>
          <div className="metric__value">{plot.avgIrrigation} h</div>
        </div>
        <div>
          <div className="metric__label">Water use efficiency</div>
          <div className="metric__value">{plot.waterUseEfficiency} kg/m³</div>
        </div>
      </div>

      <div className="bar-chart">
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={plot.irrigationHistory}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v) => [`${v} hrs`, 'Duration']}
            />
            <Bar dataKey="hours" fill="#2c7da0" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

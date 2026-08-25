function statusFor(value, low, high) {
  if (value < low) return { label: 'Low', cls: 'chip--danger' }
  if (value > high) return { label: 'High', cls: 'chip--amber' }
  return { label: 'Normal', cls: 'chip--cane' }
}

export default function SoilSensorCard({ plot }) {
  const rows = [
    {
      label: 'Soil moisture (30 cm)',
      value: `${plot.soilMoisture30cm}%`,
      status: statusFor(plot.soilMoisture30cm, 25, 40),
    },
    {
      label: 'Soil moisture (60 cm)',
      value: `${plot.soilMoisture60cm}%`,
      status: statusFor(plot.soilMoisture60cm, 25, 40),
    },
    {
      label: 'Soil temperature',
      value: `${plot.soilTemp}°C`,
      status: { label: 'Normal', cls: 'chip--cane' },
    },
    {
      label: 'Ambient temperature',
      value: `${plot.ambientTemp}°C`,
      status: { label: 'Normal', cls: 'chip--cane' },
    },
    {
      label: 'Relative humidity',
      value: `${plot.relativeHumidity}%`,
      status: { label: 'Normal', cls: 'chip--cane' },
    },
  ]

  return (
    <div className="card">
      <div className="card__head">
        <h3>Soil &amp; Sensor Status</h3>
        <span className="card__tag">Latest reading</span>
      </div>
      <ul className="sensor-list">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="sensor-list__label">{r.label}</span>
            <span className="sensor-list__value">{r.value}</span>
            <span className={`chip chip--sm ${r.status.cls}`}>{r.status.label}</span>
          </li>
        ))}
        <li>
          <span className="sensor-list__label">Last irrigation</span>
          <span className="sensor-list__value">
            {new Date(plot.lastIrrigation).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
            })}{' '}
            · {plot.lastIrrigationHours} h
          </span>
          <span />
        </li>
      </ul>
    </div>
  )
}

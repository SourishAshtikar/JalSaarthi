import { Beaker } from 'lucide-react'

export default function FertigationCard({ plot }) {
  return (
    <div className="card">
      <div className="card__head">
        <h3>Fertigation Advisory</h3>
      </div>

      <div className="fertigation__hero">
        <Beaker size={26} strokeWidth={1.6} />
        <div>
          <div className="metric__label">Next fertigation</div>
          <div className="advisory__hero-title advisory__hero-title--sm">
            {new Date(plot.fertigation.nextDate).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
            })}
          </div>
          <div className="advisory__hero-sub">{plot.fertigation.timing}</div>
        </div>
      </div>

      <table className="dose-table">
        <thead>
          <tr>
            <th>Nutrient</th>
            <th>Recommended dose / acre</th>
          </tr>
        </thead>
        <tbody>
          {plot.fertigation.items.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.dose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

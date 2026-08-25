import { Droplet, CloudRain, Clock, CheckCircle2 } from 'lucide-react'

const ICONS = {
  warning: Droplet,
  info: CloudRain,
  danger: Clock,
  success: CheckCircle2,
}

export default function AlertsCard({ plot, onReportIssue }) {
  return (
    <div className="card">
      <div className="card__head">
        <h3>Alerts &amp; Notifications</h3>
        <span className="card__tag">View all</span>
      </div>

      <ul className="alerts-list">
        {plot.alerts.map((a, i) => {
          const Icon = ICONS[a.type] || Clock
          return (
            <li key={i} className={`alerts-list__item alerts-list__item--${a.type}`}>
              <Icon size={16} strokeWidth={1.8} />
              <div>
                <div className="alerts-list__text">{a.text}</div>
                <div className="alerts-list__time">{a.time}</div>
              </div>
            </li>
          )
        })}
      </ul>

      <button className="btn btn--ghost btn--full" onClick={onReportIssue}>
        Report an issue / request field visit
      </button>
    </div>
  )
}

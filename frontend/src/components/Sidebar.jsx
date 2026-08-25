import {
  LayoutDashboard,
  MapPinned,
  Droplets,
  CloudSun,
  Radio,
  Leaf,
  FlaskConical,
  TrendingUp,
  FileText,
  Bell,
  Wrench,
  LifeBuoy,
  Settings,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'My Plots', icon: MapPinned },
  { label: 'Irrigation Advisory', icon: Droplets },
  { label: 'Weather Forecast', icon: CloudSun },
  { label: 'Soil & Sensors', icon: Radio },
  { label: 'Crop Health', icon: Leaf },
  { label: 'Fertigation', icon: FlaskConical },
  { label: 'Yield Prediction', icon: TrendingUp },
  { label: 'Soil Reports', icon: FileText },
  { label: 'Alerts & Notifications', icon: Bell },
  { label: 'Pump Scheduling', icon: Wrench },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">क</span>
        <div>
          <div className="sidebar__title">KIAAR Advisory</div>
          <div className="sidebar__subtitle">Sugarcane · Sameerwadi</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className={`sidebar__item ${label === 'Dashboard' ? 'is-active' : ''}`}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__item">
          <LifeBuoy size={17} strokeWidth={1.8} />
          <span>Support</span>
        </div>
        <div className="sidebar__item">
          <Settings size={17} strokeWidth={1.8} />
          <span>Settings</span>
        </div>
      </div>
    </aside>
  )
}

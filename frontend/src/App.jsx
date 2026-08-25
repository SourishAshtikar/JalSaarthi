import { useState } from 'react'
import { MapPin, UserCircle2 } from 'lucide-react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import WeatherCard from './components/WeatherCard'
import IrrigationAdvisoryCard from './components/IrrigationAdvisoryCard'
import SoilSensorCard from './components/SoilSensorCard'
import CropHealthCard from './components/CropHealthCard'
import IrrigationHistoryCard from './components/IrrigationHistoryCard'
import FertigationCard from './components/FertigationCard'
import YieldPredictionCard from './components/YieldPredictionCard'
import AlertsCard from './components/AlertsCard'
import LogIrrigationForm from './components/LogIrrigationForm'
import ReportIssueForm from './components/ReportIssueForm'
import CreateFieldForm from './components/CreateFieldForm'
import { farms } from './data/mockData'
import './App.css'

export default function App() {
  const [farmId, setFarmId] = useState(farms[0].id)
  const [plotId, setPlotId] = useState(farms[0].plots[0].id)
  const [farmList, setFarmList] = useState(farms)
  const [showLogForm, setShowLogForm] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [showCreateFieldForm, setShowCreateFieldForm] = useState(false)
  const [toast, setToast] = useState(null)

  const farm = farmList.find((item) => item.id === farmId)
  const plot = farm?.plots.find((item) => item.id === plotId)
  const irrigationAttention = farm.plots.filter((item) => item.waterStressRisk !== 'Low').length
  const activeAlerts = farm.plots.reduce((total, item) => total + item.alerts.length, 0)

  function handleFarmChange(id) {
    setFarmId(id)
    const f = farmList.find((x) => x.id === id)
    setPlotId(f.plots[0].id)
  }

  function handleCreateField(field) {
    const id = `plot-${Date.now()}`
    const today = new Date()
    const todayString = today.toISOString().slice(0, 10)
    const fertigationDate = new Date(today)
    fertigationDate.setDate(today.getDate() + 3)
    const cropAgeMonths = Math.max(
      0,
      Number(((Date.now() - new Date(field.plantingDate).getTime()) / 2629800000).toFixed(1)),
    )
    const newPlot = {
      ...farm.plots[0],
      id,
      name: `${field.name} (${field.acreage} ac)`,
      crop: field.crop,
      variety: field.variety,
      plantingDate: field.plantingDate,
      cropAgeMonths,
      lastIrrigation: todayString,
      nextIrrigationDate: todayString,
      fertigation: { ...farm.plots[0].fertigation, nextDate: fertigationDate.toISOString().slice(0, 10) },
      alerts: [{ type: 'info', text: 'Field created. Connect sensors to receive readings.', time: 'Just now' }],
      irrigationHistory: [],
      totalIrrigations: 0,
      totalWaterApplied: 0,
    }
    setFarmList((current) => current.map((item) => (
      item.id === farmId ? { ...item, plots: [...item.plots, newPlot] } : item
    )))
    setPlotId(id)
    setShowCreateFieldForm(false)
    setToast(`${field.name} was created and selected.`)
    setTimeout(() => setToast(null), 3500)
  }

  function handleLogIrrigation(entry) {
    setToast(`Irrigation logged for ${plot.name} — ${entry.duration}h via ${entry.method}`)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="app">
      <Sidebar />

      <div className="app__main">
        <header className="app__header">
          <div className="app__header-left">
            <MapPin size={16} strokeWidth={1.8} />
            <span>Sameerwadi, Karnataka</span>
            <span className="app__header-divider">·</span>
            <span>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="app__header-right">
            <UserCircle2 size={18} strokeWidth={1.6} />
            <span>Ramesh Patil</span>
          </div>
        </header>

        <TopBar
          farms={farmList}
          farmId={farmId}
          plotId={plotId}
          onFarmChange={handleFarmChange}
          onPlotChange={setPlotId}
          plot={plot}
          onCreateField={() => setShowCreateFieldForm(true)}
        />

        <section className="dashboard-intro" aria-label="Farm overview">
          <div>
            <p className="dashboard-intro__eyebrow">Farm overview</p>
            <h1>Good morning, Ramesh</h1>
            <p>Here’s the latest irrigation status for {farm.name}.</p>
          </div>
          <dl className="overview-stats">
            <div>
              <dt>Fields monitored</dt>
              <dd>{farm.plots.length}</dd>
            </div>
            <div>
              <dt>Irrigation attention</dt>
              <dd>{irrigationAttention}</dd>
            </div>
            <div>
              <dt>Active alerts</dt>
              <dd>{activeAlerts}</dd>
            </div>
          </dl>
        </section>

        <main className="dashboard-grid">
          <IrrigationAdvisoryCard plot={plot} onLogIrrigation={() => setShowLogForm(true)} />
          <WeatherCard />
          <AlertsCard plot={plot} onReportIssue={() => setShowIssueForm(true)} />

          <SoilSensorCard plot={plot} />
          <CropHealthCard plot={plot} />
          <IrrigationHistoryCard plot={plot} />

          <FertigationCard plot={plot} />
          <YieldPredictionCard plot={plot} />
        </main>
      </div>

      {showLogForm && (
        <LogIrrigationForm onClose={() => setShowLogForm(false)} onSubmit={handleLogIrrigation} />
      )}
      {showIssueForm && <ReportIssueForm onClose={() => setShowIssueForm(false)} />}
      {showCreateFieldForm && (
        <CreateFieldForm
          farm={farm}
          onClose={() => setShowCreateFieldForm(false)}
          onSubmit={handleCreateField}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

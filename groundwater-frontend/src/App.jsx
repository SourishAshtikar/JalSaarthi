import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import AssessmentExplorer from './AssessmentExplorer.jsx'
import { BadgeCheck, Bot, Building2, Droplets, Leaf, LogOut, Map, MapPin, Plus, ShieldCheck, Sparkles, Sprout, Waves, X } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const TOKEN = 'groundwater_jwt'
const today = new Date().toISOString().slice(0, 10)

function ApiError({ message }) { return message ? <p className="error">{message}</p> : null }

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e => e.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>{children}</section></div>
}

function Status({ value }) {
  const tone = value === 'ADOPTED' ? 'good' : value === 'NOT_ADOPTED' ? 'bad' : value === 'UNAUDITED' ? 'muted' : 'warn'
  return <span className={`status ${tone}`}>{String(value || 'PENDING').replaceAll('_', ' ')}</span>
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN)))
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  async function request(path, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    const active = localStorage.getItem(TOKEN)
    if (active) headers.Authorization = `Bearer ${active}`
    const response = await fetch(`${API}${path}`, { ...options, headers })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`)
    return payload
  }

  useEffect(() => {
    if (!token) { setLoading(false); return }
    request('/api/auth/me').then(({ data }) => setUser(data.user)).catch(() => { localStorage.removeItem(TOKEN); setToken(null) }).finally(() => setLoading(false))
  }, [token])

  function signOut() { localStorage.removeItem(TOKEN); setToken(null); setUser(null) }
  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 3600) }

  if (loading) return <main className="centered">Loading secure session…</main>
  if (!user) return <Login onSuccess={(nextToken, nextUser) => { localStorage.setItem(TOKEN, nextToken); setToken(nextToken); setUser(nextUser) }} />
  return <Shell user={user} onLogout={signOut} notify={notify} request={request} error={error} setError={setError} toast={toast} />
}

function Shell({ user, onLogout, notify, request, error, setError, toast }) {
  const roleLabel = user.role.replaceAll('_', ' ')

  // Define tab navigation per user role
  const tabs = useMemo(() => {
    if (user.role === 'ADMIN') {
      return [
        { id: 'schemes', label: 'Scheme Catalogue', icon: <Building2 /> },
        { id: 'ml', label: 'ML Microservice', icon: <Bot /> },
        { id: 'maps', label: 'Groundwater Maps', icon: <Map /> }
      ]
    }
    if (user.role === 'AUDITOR') {
      return [
        { id: 'verification', label: 'Field Verification', icon: <Building2 /> },
        { id: 'maps', label: 'Groundwater Maps', icon: <Map /> }
      ]
    }
    if (user.role === 'VILLAGE_HEAD') {
      return [
        { id: 'farms', label: 'Farm Workspace', icon: <Building2 /> },
        { id: 'maps', label: 'Groundwater Maps', icon: <Map /> }
      ]
    }
    return [
      { id: 'maps', label: 'Groundwater Maps', icon: <Map /> }
    ]
  }, [user.role])

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id || 'workspace')

  // Keep active tab valid if role changes
  useEffect(() => {
    if (tabs.length && !tabs.some(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  const activeTabMeta = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Droplets /></span>
          <div>
            <strong>JalDrishti</strong>
            <small>Groundwater Platform</small>
          </div>
        </div>

        <nav>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
          <div className="nav-location">
            <MapPin />
            <span>{user.village_name || user.district_name || 'Haryana'}</span>
          </div>
        </nav>

        <div className="sidebar-foot">
          <span className="role-pill"><ShieldCheck />{roleLabel}</span>
          <button className="nav-item logout" onClick={onLogout}><LogOut />Sign out</button>
        </div>
      </aside>

      <div className="content">
        <header className="top-header">
          <div>
            <p className="eyebrow">
              {user.village_name
                ? `Assigned village · ${user.village_name}`
                : user.district_name
                ? `Assigned district · ${user.district_name}`
                : `Platform administration · ${activeTabMeta?.label || ''}`}
            </p>
            <h1>Welcome, {user.name}</h1>
          </div>
          <div className="profile"><BadgeCheck /> {roleLabel}</div>
        </header>

        <ApiError message={error} />

        {user.role === 'ADMIN' ? (
          activeTab === 'schemes' ? (
            <AdminContent request={request} notify={notify} setError={setError} />
          ) : activeTab === 'ml' ? (
            <PredictionTest request={request} setError={setError} />
          ) : (
            <AssessmentExplorer request={request} setError={setError} />
          )
        ) : user.role === 'AUDITOR' ? (
          activeTab === 'verification' ? (
            <AuditorContent request={request} notify={notify} setError={setError} />
          ) : (
            <AssessmentExplorer request={request} setError={setError} />
          )
        ) : user.role === 'VILLAGE_HEAD' ? (
          activeTab === 'farms' ? (
            <VillageHeadContent request={request} notify={notify} setError={setError} user={user} />
          ) : (
            <AssessmentExplorer request={request} setError={setError} />
          )
        ) : (
          <section className="empty">
            <Leaf />
            <h2>No workspace is assigned to this role</h2>
            <p>The account is authenticated, but this demo currently supports Village Head, Auditor, and Admin workspaces.</p>
          </section>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Login({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const p = await r.json()
      if (!r.ok) throw new Error(p.message)
      onSuccess(p.data.token, p.data.user)
    } catch (err) {
      setError(err.message || 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <div className="brand-mark"><Droplets /></div>
          <p className="eyebrow">Haryana groundwater platform</p>
          <h1>Sign in to your workspace</h1>
          <p className="muted">Use your assigned system account to manage agricultural water adoption.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              placeholder="e.g. admin@test.com"
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
          <ApiError message={error} />
          <button className="button primary login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

function VillageHeadContent({ request, notify, setError, user }) {
  const [farms, setFarms] = useState([])
  const [selected, setSelected] = useState(null)
  const [records, setRecords] = useState([])
  const [audits, setAudits] = useState([])
  const [schemes, setSchemes] = useState([])
  const [lookups, setLookups] = useState({ seasons: [], crops: [], methods: [] })
  const [modal, setModal] = useState(null)

  const load = async () => {
    try {
      const [farmR, auditR, schemeR, seasonR, cropR, methodR] = await Promise.all([
        request('/api/farms'),
        request('/api/audits'),
        request('/api/schemes'),
        request('/api/agriculture/seasons'),
        request('/api/agriculture/crops'),
        request('/api/agriculture/irrigation-methods')
      ])
      setFarms(farmR.data.farms)
      setAudits(auditR.data.audits)
      setSchemes(schemeR.data.schemes)
      setLookups({ seasons: seasonR.data, crops: cropR.data, methods: methodR.data })
      if (!selected && farmR.data.farms[0]) setSelected(farmR.data.farms[0])
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selected) return
    request(`/api/farms/${selected.farm_id}/crop-records`)
      .then(r => setRecords(r.data.records))
      .catch(e => setError(e.message))
  }, [selected?.farm_id])

  const selectedAudits = useMemo(() => audits.filter(a => a.farm_id === selected?.farm_id), [audits, selected])

  async function createFarm(values) {
    try {
      await request('/api/farms', {
        method: 'POST',
        body: JSON.stringify({ ...values, village_id: user.village_id, total_land_area_hectares: Number(values.total_land_area_hectares) })
      })
      setModal(null)
      await load()
      notify('Farm created successfully.')
    } catch (e) {
      setError(e.message)
    }
  }

  async function createRecord(values) {
    try {
      await request(`/api/farms/${selected.farm_id}/crop-records`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          season_id: Number(values.season_id),
          crop_id: Number(values.crop_id),
          cultivated_area_hectares: Number(values.cultivated_area_hectares),
          current_irrigation_method_id: Number(values.current_irrigation_method_id)
        })
      })
      setModal(null)
      const r = await request(`/api/farms/${selected.farm_id}/crop-records`)
      setRecords(r.data.records)
      notify('Seasonal crop record added.')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <section className="summary">
        <Metric icon={<Sprout />} label="Registered farms" value={farms.length} />
        <Metric icon={<Leaf />} label="Seasonal records" value={records.length} />
        <Metric icon={<BadgeCheck />} label="Verified audits" value={selectedAudits.filter(a => a.adoption_status === 'ADOPTED').length} />
      </section>

      <section className="toolbar">
        <div>
          <label>
            Selected farm
            <select value={selected?.farm_id || ''} onChange={e => setSelected(farms.find(f => f.farm_id === Number(e.target.value)))}>
              <option value="">Select a farm</option>
              {farms.map(f => <option key={f.farm_id} value={f.farm_id}>{f.name}</option>)}
            </select>
          </label>
        </div>
        <button className="button ghost" onClick={() => setModal('farm')}><Plus />Add farm</button>
        {selected && <button className="button primary" onClick={() => setModal('record')}><Plus />Add seasonal record</button>}
      </section>

      {selected ? (
        <>
          <section className="panel">
            <header>
              <div>
                <p className="eyebrow">Farm details</p>
                <h2>{selected.name}</h2>
              </div>
              <span className="area">{selected.total_land_area_hectares} ha</span>
            </header>
            <p className="muted">Owner: {selected.owner_name || 'Not recorded'} · {selected.village_name || user.village_name}</p>
          </section>

          <DataTable
            headers={['Season', 'Crop', 'Year', 'Area', 'Current irrigation']}
            rows={records.map(r => [r.season_name, r.crop_name, r.agricultural_year, `${r.cultivated_area_hectares} ha`, r.current_irrigation_method_name])}
            empty="No seasonal records for this farm."
          />

          <section className="panel">
            <h2>Audit results</h2>
            <DataTable
              headers={['Crop', 'Season', 'Status', 'Actual irrigation', 'Audit date']}
              rows={selectedAudits.map(a => [
                a.crop_name,
                a.season_name,
                <Status key={a.audit_id || a.record_id} value={a.adoption_status} />,
                a.actual_irrigation_method_name || '—',
                a.audit_date ? String(a.audit_date).slice(0, 10) : '—'
              ])}
              empty="No audit results yet."
            />
          </section>
        </>
      ) : (
        <section className="empty">
          <Sprout />
          <h2>Add your first farm</h2>
          <p>Farms are restricted to your assigned village.</p>
        </section>
      )}

      {/* Decision Support Advisory Panel */}
      <section className="decision-support">
        <header className="section-heading">
          <div>
            <p className="eyebrow">Decision support</p>
            <h2>Crop Irrigation Advisory & Recommendation</h2>
            <p className="muted">Multi-factor recommendation based on groundwater stress, soil texture, crop water demand, and weather.</p>
          </div>
        </header>
        <SearchableRecommendationPanel request={request} setError={setError} villageId={user.village_id} villageName={user.village_name} />
      </section>

      <SchemeList schemes={schemes} />

      {modal === 'farm' && <FarmForm onClose={() => setModal(null)} onSubmit={createFarm} />}
      {modal === 'record' && <RecordForm lookups={lookups} onClose={() => setModal(null)} onSubmit={createRecord} />}
    </>
  )
}

function AuditorContent({ request, notify, setError }) {
  const [audits, setAudits] = useState([]); const [methods, setMethods] = useState([]); const [editing, setEditing] = useState(null)
  const load = async () => { try { const [a, m] = await Promise.all([request('/api/audits'), request('/api/agriculture/irrigation-methods')]); setAudits(a.data.audits); setMethods(m.data) } catch (e) { setError(e.message) } }
  useEffect(() => { load() }, [])
  async function save(values) { try { const body = JSON.stringify({ ...values, record_id: editing.record_id, actual_irrigation_method_id: Number(values.actual_irrigation_method_id) }); await request(editing.audit_id ? `/api/audits/${editing.audit_id}` : '/api/audits', { method: editing.audit_id ? 'PUT' : 'POST', body }); setEditing(null); await load(); notify('Audit verification saved.') } catch (e) { setError(e.message) } }
  const unverified = audits.filter(a => a.adoption_status === 'UNAUDITED').length
  return <><section className="summary"><Metric icon={<BadgeCheck />} label="Records to verify" value={unverified} /><Metric icon={<MapPin />} label="District records" value={audits.length} /><Metric icon={<Droplets />} label="Adopted" value={audits.filter(a => a.adoption_status === 'ADOPTED').length} /></section><section className="panel"><header><div><p className="eyebrow">Field verification</p><h2>Seasonal crop record verification grid</h2></div><span className="muted">Select a record to verify or revise.</span></header><div className="table-wrap"><table><thead><tr><th>Farm / village</th><th>Crop / season</th><th>Current method</th><th>Status</th><th></th></tr></thead><tbody>{audits.map(a => <tr key={`${a.record_id}-${a.audit_id || 'new'}`}><td><strong>{a.farm_name}</strong><small>{a.village_name}</small></td><td>{a.crop_name}<small>{a.season_name} · {a.agricultural_year}</small></td><td>{a.current_irrigation_method_name || '—'}</td><td><Status value={a.adoption_status} /></td><td><button className="button small" onClick={() => setEditing(a)}>{a.audit_id ? 'Update' : 'Verify'}</button></td></tr>)}{!audits.length && <tr><td colSpan="5" className="empty-cell">No records are available in your district.</td></tr>}</tbody></table></div></section>{editing && <AuditForm audit={editing} methods={methods} onClose={() => setEditing(null)} onSubmit={save} />}</>
}

function AdminContent({ request, notify, setError }) {
  const [schemes, setSchemes] = useState([])
  const [editing, setEditing] = useState(null)

  const load = () => request('/api/schemes').then(r => setSchemes(r.data.schemes)).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  async function save(values) {
    try {
      await request(editing?.scheme_id ? `/api/schemes/${editing.scheme_id}` : '/api/schemes', {
        method: editing?.scheme_id ? 'PUT' : 'POST',
        body: JSON.stringify(values)
      })
      setEditing(null)
      load()
      notify(editing?.scheme_id ? 'Scheme updated.' : 'Scheme created.')
    } catch (e) {
      setError(e.message)
    }
  }

  async function remove(scheme) {
    if (!window.confirm(`Delete “${scheme.name}”?`)) return
    try {
      await request(`/api/schemes/${scheme.scheme_id}`, { method: 'DELETE' })
      load()
      notify('Scheme deleted.')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <section className="toolbar">
        <div>
          <p className="eyebrow">Government schemes</p>
          <h2>Scheme catalogue</h2>
        </div>
        <button className="button primary" onClick={() => setEditing({})}><Plus />Create scheme</button>
      </section>

      <section className="scheme-grid">
        {schemes.map(s => (
          <article className="scheme-card" key={s.scheme_id}>
            <span className="status muted">{s.government_level || 'Government'}</span>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <div className="card-actions">
              <button className="button small" onClick={() => setEditing(s)}>Edit</button>
              <button className="button small danger" onClick={() => remove(s)}>Delete</button>
            </div>
          </article>
        ))}
        {!schemes.length && (
          <section className="empty">
            <Building2 />
            <h2>No schemes yet</h2>
          </section>
        )}
      </section>

      {editing && <SchemeForm scheme={editing} onClose={() => setEditing(null)} onSubmit={save} />}
    </>
  )
}

function PredictionTest({ request, setError }) {
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({
    District: '',
    Tehsil: '',
    Block: '',
    Station: '',
    Latitude: '',
    Longitude: '',
    Year: new Date().getFullYear(),
    Month: new Date().getMonth() + 1
  })
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    request('/api/geography/villages')
      .then(response => setLocations(response.data || []))
      .catch(err => setError(err.message))
  }, [request, setError])

  function change(name, value) {
    setForm(current => ({ ...current, [name]: value }))
    if (name === 'Station') {
      const location = locations.find(
        item => item.name?.toLowerCase() === value.toLowerCase() || item.station_name?.toLowerCase() === value.toLowerCase()
      )
      if (location) {
        setForm(current => ({
          ...current,
          District: location.district_name || current.District,
          Tehsil: location.tehsil || current.Tehsil,
          Block: location.block || current.Block,
          Station: location.station_name || location.name,
          Latitude: location.latitude,
          Longitude: location.longitude
        }))
      }
    }
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setResult(null)
    setError('')
    try {
      const response = await request('/api/ml/predict', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          Latitude: Number(form.Latitude),
          Longitude: Number(form.Longitude),
          Year: Number(form.Year),
          Month: Number(form.Month)
        })
      })
      setResult(response.predicted_gwl_meters)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel prediction-test">
      <header>
        <div>
          <Bot />
          <div>
            <p className="eyebrow">ML microservice</p>
            <h2>Live AI groundwater prediction test</h2>
          </div>
        </div>
      </header>
      <p className="muted">
        Test the FastAPI depth-to-water prediction through the Node backend. Select or search a station to auto-fill its recorded coordinates.
      </p>
      <form onSubmit={submit} className="prediction-grid">
        <label>
          District
          <input list="prediction-districts" value={form.District} onChange={e => change('District', e.target.value)} required />
          <datalist id="prediction-districts">
            {[...new Set(locations.map(x => x.district_name).filter(Boolean))].map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label>
          Tehsil
          <input list="prediction-tehsils" value={form.Tehsil} onChange={e => change('Tehsil', e.target.value)} required />
          <datalist id="prediction-tehsils">
            {[...new Set(locations.map(x => x.tehsil).filter(Boolean))].map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label>
          Block
          <input value={form.Block} onChange={e => change('Block', e.target.value)} required />
        </label>
        <label>
          Station / village
          <input list="prediction-stations" value={form.Station} onChange={e => change('Station', e.target.value)} required />
          <datalist id="prediction-stations">
            {locations.map(location => (
              <option key={location.id} value={location.station_name || location.name}>
                {location.district_name}
              </option>
            ))}
          </datalist>
        </label>
        <label>
          Latitude
          <input type="number" step="any" value={form.Latitude} onChange={e => change('Latitude', e.target.value)} required />
        </label>
        <label>
          Longitude
          <input type="number" step="any" value={form.Longitude} onChange={e => change('Longitude', e.target.value)} required />
        </label>
        <label>
          Year
          <input type="number" min="2000" max="2100" value={form.Year} onChange={e => change('Year', e.target.value)} required />
        </label>
        <label>
          Month
          <input type="number" min="1" max="12" value={form.Month} onChange={e => change('Month', e.target.value)} required />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? 'Running prediction…' : 'Run prediction'}
        </button>
      </form>
      {result !== null && (
        <div className="prediction-result">
          Predicted depth to water: <strong>{Number(result).toFixed(2)} meters bgl</strong>
        </div>
      )}
    </section>
  )
}

function SearchableRecommendationPanel({ request, setError, villageId, villageName }) {
  const [reference, setReference] = useState({ crops: [], irrigationPractices: [] }); const [cropName, setCropName] = useState('Paddy / Rice'); const [currentPractice, setCurrentPractice] = useState('Flood'); const [report, setReport] = useState(null); const [busy, setBusy] = useState(false)
  useEffect(() => { request('/api/reference/recommendation-options').then(result => setReference(result.data)).catch(err => setError(err.message)) }, [request, setError])
  async function generate(event) { event.preventDefault(); setBusy(true); setError(''); try { const result = await request('/api/recommendations', { method: 'POST', body: JSON.stringify({ villageId, cropName, currentPractice }) }); setReport(result.data) } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <article className="panel recommendation-panel"><header><div><Sparkles /><h2>Crop irrigation recommendation</h2></div></header><p className="muted">Village: <strong>{villageName || `ID ${villageId}`}</strong></p><form className="compact-form" onSubmit={generate}><label>Crop — searchable<input list="recommendation-crops" value={cropName} onChange={event => setCropName(event.target.value)} required /><datalist id="recommendation-crops">{reference.crops.map(crop => <option key={crop.id} value={crop.name} />)}</datalist></label><label>Current practice — searchable<input list="recommendation-practices" value={currentPractice} onChange={event => setCurrentPractice(event.target.value)} required /><datalist id="recommendation-practices">{reference.irrigationPractices.map(practice => <option key={practice.id} value={practice.id}>{practice.name}</option>)}</datalist></label><button className="button primary" disabled={busy || !villageId}>{busy ? 'Generating…' : 'Generate recommendation'}</button></form>{report && <div className="recommendation-result"><div className="recommendation-title"><span className="status good">{report.actionRequired?.replaceAll('_', ' ')}</span><strong>{report.recommendedPractice?.name || report.recommendedPractice?.id}</strong></div><p>{report.reasons?.[0] || 'No reason was returned.'}</p><dl className="result-stats"><div><dt>Water saving</dt><dd>{report.waterSavingsPercentage ?? '—'}%</dd></div><div><dt>Confidence</dt><dd>{report.confidenceScore ?? '—'}%</dd></div><div><dt>Groundwater</dt><dd>{report.diagnostics?.groundwaterLevelMeters ?? '—'} m</dd></div></dl></div>}</article>
}

function RecommendationPanel({ request, setError, villageId, villageName }) {
  const [cropName, setCropName] = useState('Paddy / Rice'); const [currentPractice, setCurrentPractice] = useState('Flood'); const [reference, setReference] = useState({ crops: [], irrigationPractices: [] }); const [report, setReport] = useState(null); const [busy, setBusy] = useState(false)
  useEffect(() => { request('/api/reference/recommendation-options').then(result => setReference(result.data)).catch(err => setError(err.message)) }, [request, setError])
  async function generate(e) {
    e.preventDefault(); setBusy(true); setReport(null); setError('')
    try {
      const result = await request('/api/recommendations', { method: 'POST', body: JSON.stringify({ villageId, cropName, currentPractice }) })
      setReport(result.data)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const diagnostics = report?.diagnostics
  return <article className="panel recommendation-panel"><header><div><Sparkles /><h2>Crop irrigation recommendation</h2></div></header><p className="muted">Village: <strong>{villageName || `ID ${villageId}`}</strong></p><form className="compact-form" onSubmit={generate}><label>Crop<input value={cropName} onChange={e => setCropName(e.target.value)} required /></label><label>Current irrigation<select value={currentPractice} onChange={e => setCurrentPractice(e.target.value)}><option>Flood Irrigation</option><option>Drip Irrigation</option><option>Sprinkler Irrigation</option></select></label><button className="button primary" disabled={busy || !villageId}>{busy ? 'Generating…' : 'Generate recommendation'}</button></form>{!villageId && <p className="error">Your account has no assigned village, so a recommendation cannot be generated.</p>}{report && <div className="recommendation-result"><div className="recommendation-title"><span className="status good">{report.actionRequired?.replaceAll('_', ' ')}</span><strong>{report.recommendedPractice?.name || report.recommendedPractice?.id}</strong></div><p>{report.reasons?.[0] || 'No reason was returned.'}</p><dl className="result-stats"><div><dt>Water saving</dt><dd>{report.waterSavingsPercentage ?? '—'}%</dd></div><div><dt>Confidence</dt><dd>{report.confidenceScore ?? '—'}%</dd></div><div><dt>Groundwater</dt><dd>{diagnostics?.groundwaterLevelMeters ?? '—'} m</dd></div></dl>{report.reasons?.length > 1 && <ul>{report.reasons.slice(1).map(reason => <li key={reason}>{reason}</li>)}</ul>}</div>}</article>
}

function LiveGroundwaterMap({ request, setError }) {
  const containerRef = useRef(null); const mapRef = useRef(null); const layersRef = useRef([]); const [data, setData] = useState(null); const [busy, setBusy] = useState(false); const [mode, setMode] = useState('combined')
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined
    const map = L.map(containerRef.current, { center: [29.15, 76.3], zoom: 8, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])
  useEffect(() => {
    const map = mapRef.current
    if (!map || !data) return
    layersRef.current.forEach(layer => map.removeLayer(layer)); layersRef.current = []
    const predictions = data.predictions || []; const farms = data.farms || []
    if (mode !== 'farms' && predictions.length) {
      const heat = L.heatLayer(predictions.map(p => [p.latitude, p.longitude, p.heat_intensity]), { radius: 30, blur: 22, maxZoom: 12, gradient: { 0.2: '#38bdf8', 0.5: '#facc15', 0.8: '#dc2626' } }).addTo(map)
      layersRef.current.push(heat)
      const stations = L.layerGroup(predictions.map(p => L.circleMarker([p.latitude, p.longitude], { radius: 6, color: p.color || '#2563eb', fillColor: p.color || '#2563eb', fillOpacity: .92, weight: 2 }).bindPopup(`<strong>${safeText(p.village_name)}</strong><br>Station: ${safeText(p.station_name || '—')}<br>Depth to water: ${Number(p.predicted_gwl_meters).toFixed(2)} m bgl<br>${safeText(p.condition)}`))).addTo(map)
      layersRef.current.push(stations)
    }
    if (mode !== 'heat' && farms.length) {
      const farmLayer = L.layerGroup(farms.map(f => L.circleMarker([f.latitude, f.longitude], { radius: 7, color: '#244f34', fillColor: '#fff', fillOpacity: 1, weight: 3 }).bindPopup(`<strong>${safeText(f.name)}</strong><br>${safeText(f.village_name)}<br>Local water depth: ${Number(f.local_gwl_meters).toFixed(2)} m bgl<br>${safeText(f.local_condition)}`))).addTo(map)
      layersRef.current.push(farmLayer)
    }
    const coords = [...predictions, ...farms].filter(p => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))).map(p => [p.latitude, p.longitude])
    if (coords.length) map.fitBounds(coords, { padding: [28, 28], maxZoom: 12 })
  }, [data, mode])
  async function loadPredictions() { setBusy(true); setError(''); try { const result = await request('/api/groundwater/heatmap'); setData(result.data) } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <article className="panel live-map-panel"><header><div><Map /><h2>Live groundwater prediction map</h2></div><button className="button small" onClick={loadPredictions} disabled={busy}>{busy ? 'Loading…' : 'Load predictions'}</button></header><p className="muted">ML station predictions and nearby farms are shown only for your authorised area.</p><div className="map-controls"><label>Layer<select value={mode} onChange={e => setMode(e.target.value)}><option value="combined">Heat, stations & farms</option><option value="heat">Heat & stations</option><option value="farms">Farm markers</option></select></label>{data && <span className="map-summary"><Waves /> {data.predictionCount} stations · {data.farmCount} farms</span>}</div><div className="live-map" ref={containerRef} aria-label="Live groundwater prediction map" />{!data && <p className="map-hint">Load predictions to render the role-scoped heat layer.</p>}</article>
}

function safeText(value) { return String(value ?? '—').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') }
function Metric({ icon, label, value }) { return <article className="metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article> }
function DataTable({ headers, rows, empty }) { return <section className="panel"><div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, x) => <td key={x}>{cell || '—'}</td>)}</tr>)}{!rows.length && <tr><td className="empty-cell" colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div></section> }
function SchemeList({ schemes }) { return <section className="panel"><header><div><p className="eyebrow">Support</p><h2>Government schemes</h2></div></header><div className="scheme-grid compact">{schemes.map(s => <article className="scheme-card" key={s.scheme_id}><span className="status muted">{s.government_level || 'Government'}</span><h3>{s.name}</h3><p>{s.benefit_description || s.description}</p>{s.external_link && <a href={s.external_link} target="_blank" rel="noreferrer">View official information</a>}</article>)}</div></section> }
function FarmForm({ onClose, onSubmit }) { return <Modal title="Add farm" onClose={onClose}><Form onSubmit={onSubmit} submit="Create farm"><label>Farm name<input name="name" required /></label><label>Owner name<input name="owner_name" /></label><label>Total land area (hectares)<input name="total_land_area_hectares" type="number" min="0.01" step="0.01" required /></label></Form></Modal> }
function RecordForm({ onClose, onSubmit, lookups }) { return <Modal title="Add seasonal crop record" onClose={onClose}><Form onSubmit={onSubmit} submit="Add record"><label>Season<select name="season_id" required><option value="">Select season</option>{lookups.seasons.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Crop<select name="crop_id" required><option value="">Select crop</option>{lookups.crops.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Agricultural year<input name="agricultural_year" placeholder="2026-2027" required /></label><label>Cultivated area (hectares)<input name="cultivated_area_hectares" type="number" min="0.01" step="0.01" required /></label><label>Current irrigation method<select name="current_irrigation_method_id" required><option value="">Select method</option>{lookups.methods.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></Form></Modal> }
function AuditForm({ audit, methods, onClose, onSubmit }) { return <Modal title={audit.audit_id ? 'Update audit verification' : 'Verify irrigation adoption'} onClose={onClose}><p className="muted">{audit.farm_name} · {audit.crop_name} · {audit.season_name}</p><Form onSubmit={onSubmit} submit="Save verification"><label>Actual irrigation method<select name="actual_irrigation_method_id" defaultValue={audit.actual_irrigation_method_id || ''} required><option value="">Select method</option>{methods.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Adoption status<select name="adoption_status" defaultValue={audit.adoption_status === 'UNAUDITED' ? 'ADOPTED' : audit.adoption_status} required><option value="ADOPTED">Adopted</option><option value="NOT_ADOPTED">Not adopted</option><option value="PENDING">Pending</option></select></label><label>Audit date<input name="audit_date" type="date" defaultValue={audit.audit_date ? String(audit.audit_date).slice(0, 10) : today} required /></label><label>Notes<textarea name="notes" defaultValue={audit.notes || ''} /></label></Form></Modal> }
function SchemeForm({ scheme, onClose, onSubmit }) { return <Modal title={scheme.scheme_id ? 'Edit government scheme' : 'Create government scheme'} onClose={onClose}><Form onSubmit={onSubmit} submit="Save scheme"><label>Name<input name="name" defaultValue={scheme.name || ''} required /></label><label>Description<textarea name="description" defaultValue={scheme.description || ''} required /></label><label>Government level<input name="government_level" defaultValue={scheme.government_level || ''} /></label><label>Benefit description<textarea name="benefit_description" defaultValue={scheme.benefit_description || ''} /></label><label>Eligibility<textarea name="eligibility" defaultValue={scheme.eligibility || ''} /></label><label>Application information<textarea name="application_information" defaultValue={scheme.application_information || ''} /></label><label>Official link<input name="external_link" type="url" defaultValue={scheme.external_link || ''} /></label></Form></Modal> }
function Form({ children, onSubmit, submit }) { const [busy, setBusy] = useState(false); const submitForm = async e => { e.preventDefault(); setBusy(true); const values = Object.fromEntries(new FormData(e.currentTarget)); await onSubmit(values); setBusy(false) }; return <form className="stack" onSubmit={submitForm}>{children}<button className="button primary" disabled={busy}>{busy ? 'Saving…' : submit}</button></form> }

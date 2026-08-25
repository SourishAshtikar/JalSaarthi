import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { BadgeCheck, Bot, Building2, Droplets, Leaf, LogOut, Map, MapPin, Plus, ShieldCheck, Sparkles, Sprout, Waves, X } from 'lucide-react'

// Code-split heavy Leaflet GIS map component on demand
const AssessmentExplorer = lazy(() => import('./AssessmentExplorer.jsx'))

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const TOKEN = 'groundwater_jwt'
const USER_KEY = 'groundwater_user'
const today = new Date().toISOString().slice(0, 10)

const DEFAULT_RECOMMENDATION_OPTIONS = {
  crops: [
    { id: 1, name: 'Paddy / Rice (धान / जीरी)', season: 'Kharif', waterRequirementClass: 'Very High' },
    { id: 2, name: 'Cotton (कपास)', season: 'Kharif', waterRequirementClass: 'High' },
    { id: 3, name: 'Bajra / Pearl Millet (बाजरा)', season: 'Kharif', waterRequirementClass: 'Low-Medium' },
    { id: 4, name: 'Maize (मक्का)', season: 'Kharif', waterRequirementClass: 'Medium' },
    { id: 5, name: 'Guar / Cluster Bean (गवार)', season: 'Kharif', waterRequirementClass: 'Low-Medium' },
    { id: 6, name: 'Sugarcane (गन्ना)', season: 'Kharif', waterRequirementClass: 'Very High' },
    { id: 7, name: 'Wheat (गेहूं)', season: 'Rabi', waterRequirementClass: 'High' },
    { id: 8, name: 'Mustard (सरसों)', season: 'Rabi', waterRequirementClass: 'Low-Medium' },
    { id: 9, name: 'Barley (जौ)', season: 'Rabi', waterRequirementClass: 'Medium' },
    { id: 10, name: 'Gram / Chickpea (चना)', season: 'Rabi', waterRequirementClass: 'Low-Medium' },
    { id: 11, name: 'Potato (आलू)', season: 'Rabi', waterRequirementClass: 'Medium-High' },
    { id: 12, name: 'Moong / Green Gram (मूंग)', season: 'Zaid', waterRequirementClass: 'Low-Medium' },
    { id: 13, name: 'Summer Vegetables (सब्जियां)', season: 'Zaid', waterRequirementClass: 'Medium' },
    { id: 14, name: 'Sunflower (सूरजमुखी)', season: 'Kharif / Rabi', waterRequirementClass: 'Medium' },
    { id: 15, name: 'Jowar / Sorghum (ज्वार)', season: 'Kharif', waterRequirementClass: 'Low-Medium' },
    { id: 16, name: 'Groundnut (मूंगफली)', season: 'Kharif', waterRequirementClass: 'Medium' },
    { id: 17, name: 'Masoor / Lentil (मसूर)', season: 'Rabi', waterRequirementClass: 'Low' },
    { id: 18, name: 'Turmeric (हल्दी)', season: 'Kharif', waterRequirementClass: 'Medium-High' },
    { id: 19, name: 'Onion (प्याज)', season: 'Rabi / Zaid', waterRequirementClass: 'Medium' },
    { id: 20, name: 'Tomato (टमाटर)', season: 'Zaid', waterRequirementClass: 'Medium-High' },
    { id: 21, name: 'Watermelon (तरबूज)', season: 'Zaid', waterRequirementClass: 'Medium' }
  ],
  irrigationPractices: [
    { id: 'Flood', name: 'Flood Irrigation (पारंपरिक बहाव)', waterEfficiency: 'Low', waterSavingsPercentage: 0 },
    { id: 'Furrow', name: 'Furrow Irrigation (नाली सिंचाई)', waterEfficiency: 'Medium-Low', waterSavingsPercentage: 15 },
    { id: 'Sprinkler', name: 'Sprinkler Irrigation (फव्वारा सिंचाई)', waterEfficiency: 'High', waterSavingsPercentage: 35 },
    { id: 'Drip', name: 'Drip Irrigation (टपक सिंचाई)', waterEfficiency: 'Very High', waterSavingsPercentage: 55 },
    { id: 'Underground Pipeline & AWD', name: 'Underground Pipeline & AWD (भूमिगत पाइपलाइन)', waterEfficiency: 'High', waterSavingsPercentage: 30 },
    { id: 'Border', name: 'Border Strip Irrigation (सीमा पट्टी सिंचाई)', waterEfficiency: 'Medium', waterSavingsPercentage: 20 },
    { id: 'RaisedBed', name: 'Raised Bed Planting (उभरी क्यारी सिंचाई)', waterEfficiency: 'Medium-High', waterSavingsPercentage: 30 },
    { id: 'Pitcher', name: 'Pitcher / Pot Irrigation (घड़ा सिंचाई)', waterEfficiency: 'Very High', waterSavingsPercentage: 60 }
  ]
}

function ApiError({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="error">
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="icon-button error-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <X />
        </button>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={e => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

function Status({ value }) {
  const tone = value === 'ADOPTED' ? 'good' : value === 'NOT_ADOPTED' ? 'bad' : value === 'UNAUDITED' ? 'muted' : 'warn'
  return <span className={`status ${tone}`}>{String(value || 'PENDING').replaceAll('_', ' ')}</span>
}

/**
 * High-performance, fully functional Searchable Select Dropdown
 */
function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  icon
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const normalizedOptions = useMemo(() => {
    return (options || []).map(opt => {
      if (typeof opt === 'string') return { value: opt, label: opt }
      return {
        value: opt.id || opt.value || opt.name,
        label: opt.name || opt.label || String(opt.id),
        sublabel: opt.season ? `${opt.season} Season` : (opt.waterEfficiency ? `${opt.waterEfficiency} Efficiency` : opt.sublabel),
        badge: opt.waterRequirementClass || (opt.waterSavingsPercentage !== undefined ? `${opt.waterSavingsPercentage}% savings` : null)
      }
    })
  }, [options])

  const filtered = useMemo(() => {
    if (!search.trim()) return normalizedOptions
    const q = search.toLowerCase()
    return normalizedOptions.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
      (o.badge && o.badge.toLowerCase().includes(q))
    )
  }, [normalizedOptions, search])

  const selectedItem = normalizedOptions.find(o => o.value === value || o.label === value)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(item) {
    onChange(item.label || item.value)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="searchable-select-wrap" ref={containerRef}>
      {label && <label className="select-label">{label}</label>}
      <div
        className={`select-trigger ${open ? 'active' : ''}`}
        tabIndex={0}
        onClick={() => {
          setOpen(prev => {
            if (!prev) setTimeout(() => inputRef.current?.focus(), 50)
            return !prev
          })
        }}
      >
        <div className="select-val">
          {icon && <span className="select-icon">{icon}</span>}
          <span className={selectedItem ? 'val-text' : 'placeholder-text'}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </div>
        <div className="select-arrow">▼</div>
      </div>

      {open && (
        <div className="select-dropdown">
          <div className="select-search-box">
            <input
              ref={inputRef}
              type="text"
              className="select-search-input"
              placeholder={`Search ${label || 'options'}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                className="select-clear-btn"
                onClick={e => {
                  e.stopPropagation()
                  setSearch('')
                }}
              >
                ✕
              </button>
            )}
          </div>
          <div className="select-options-list">
            {filtered.map(item => (
              <div
                key={item.value}
                className={`select-option-item ${(item.value === value || item.label === value) ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
              >
                <div>
                  <strong className="opt-title">{item.label}</strong>
                  {item.sublabel && <small className="opt-sub">{item.sublabel}</small>}
                </div>
                {item.badge && <span className="opt-badge">{item.badge}</span>}
              </div>
            ))}
            {!filtered.length && (
              <div className="select-no-results">No matching options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN))
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem(USER_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  // If token and cached user are present, render immediately (0ms blocking delay!)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN) && !localStorage.getItem(USER_KEY)))
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

  // Background token verification & session refresh (SWR)
  useEffect(() => {
    if (!token) {
      setLoading(false)
      setUser(null)
      return
    }

    request('/api/auth/me')
      .then(({ data }) => {
        if (data?.user) {
          setUser(data.user)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  function signOut() {
    localStorage.removeItem(TOKEN)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  function handleLoginSuccess(nextToken, nextUser) {
    localStorage.setItem(TOKEN, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3600)
  }

  if (loading) return <main className="centered">Loading secure session…</main>
  if (!user) return <Login onSuccess={handleLoginSuccess} />
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
        { id: 'recommendations', label: 'AI Advisory', icon: <Sparkles /> },
        { id: 'schemes', label: 'Government Schemes', icon: <Leaf /> },
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
              onClick={() => {
                setError('')
                setActiveTab(tab.id)
              }}
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

        <ApiError message={error} onDismiss={() => setError('')} />

        {user.role === 'ADMIN' ? (
          activeTab === 'schemes' ? (
            <AdminContent request={request} notify={notify} setError={setError} />
          ) : activeTab === 'ml' ? (
            <PredictionTest request={request} setError={setError} />
          ) : (
            <Suspense fallback={<section className="panel"><p className="muted">Loading GIS Groundwater Maps…</p></section>}>
              <AssessmentExplorer request={request} setError={setError} />
            </Suspense>
          )
        ) : user.role === 'AUDITOR' ? (
          activeTab === 'verification' ? (
            <AuditorContent request={request} notify={notify} setError={setError} />
          ) : (
            <Suspense fallback={<section className="panel"><p className="muted">Loading GIS Groundwater Maps…</p></section>}>
              <AssessmentExplorer request={request} setError={setError} />
            </Suspense>
          )
        ) : user.role === 'VILLAGE_HEAD' ? (
          activeTab === 'farms' ? (
            <VillageHeadContent request={request} notify={notify} setError={setError} user={user} />
          ) : activeTab === 'recommendations' ? (
            <GeneralRecommendationWorkspace request={request} setError={setError} user={user} />
          ) : activeTab === 'schemes' ? (
            <VillageHeadSchemes request={request} setError={setError} />
          ) : (
            <Suspense fallback={<section className="panel"><p className="muted">Loading GIS Groundwater Maps…</p></section>}>
              <AssessmentExplorer request={request} setError={setError} />
            </Suspense>
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

/**
 * Dedicated Modal to show tailored AI Recommendation for a specific seasonal crop record
 */
function RecordAdvisoryModal({ record, user, request, onClose }) {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!record) return
    setLoading(true)
    setError('')
    request('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        villageId: user.village_id || 1,
        cropName: record.crop_name,
        currentPractice: record.current_irrigation_method_name
      })
    })
      .then(res => setReport(res.data))
      .catch(err => setError(err.message || 'Failed to generate advisory'))
      .finally(() => setLoading(false))
  }, [record, user.village_id])

  const waterSavedHa = report?.waterSavedVolumeM3PerHa || 0
  const areaHa = Number(record.cultivated_area_hectares) || 1
  const totalFarmSavings = Math.round(waterSavedHa * areaHa)

  return (
    <Modal title={`AI Irrigation Advisory: ${record.crop_name}`} onClose={onClose}>
      <div className="record-meta-bar">
        <div className="record-meta-item">
          <span>Crop:</span>
          <strong>{record.crop_name}</strong>
        </div>
        <div className="record-meta-item">
          <span>Season:</span>
          <strong>{record.season_name} ({record.agricultural_year})</strong>
        </div>
        <div className="record-meta-item">
          <span>Current:</span>
          <strong>{record.current_irrigation_method_name}</strong>
        </div>
        <div className="record-meta-item">
          <span>Plot Area:</span>
          <strong>{record.cultivated_area_hectares} ha</strong>
        </div>
      </div>

      {loading && <p className="muted">Analyzing soil hydrology, crop water requirements, and local groundwater metrics…</p>}
      {error && <p className="error">{error}</p>}

      {report && (
        <div className="advisory-result-card">
          <div className="advisory-hero">
            <div className="advisory-hero-header">
              <span className="status good">{report.actionRequired?.replaceAll('_', ' ')}</span>
              <span className="advisory-practice-title">{report.recommendedPractice?.name}</span>
            </div>
            <p className="muted">{report.recommendedPractice?.description}</p>
          </div>

          <dl className="advisory-metrics-grid">
            <div className="advisory-stat-card">
              <dt>Water Savings</dt>
              <dd className="highlight">{report.waterSavingsPercentage ?? '—'}%</dd>
            </div>
            <div className="advisory-stat-card">
              <dt>Plot Savings</dt>
              <dd>{totalFarmSavings.toLocaleString()} m³</dd>
            </div>
            <div className="advisory-stat-card">
              <dt>AI Confidence</dt>
              <dd>{report.confidenceScore ?? '—'}%</dd>
            </div>
            <div className="advisory-stat-card">
              <dt>Groundwater Depth</dt>
              <dd>{report.diagnostics?.groundwaterLevelMeters ?? '—'} m</dd>
            </div>
          </dl>

          {report.reasons?.length > 0 && (
            <div className="reasons-box">
              <h4><Sparkles /> Agronomic & Hydrological Insights</h4>
              <ul className="reasons-list">
                {report.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function VillageHeadContent({ request, notify, setError, user }) {
  const [farms, setFarms] = useState([])
  const [selected, setSelected] = useState(null)
  const [records, setRecords] = useState([])
  const [audits, setAudits] = useState([])
  const [lookups, setLookups] = useState({ seasons: [], crops: [], methods: [] })
  const [modal, setModal] = useState(null)
  const [advisoryRecord, setAdvisoryRecord] = useState(null)

  const load = async () => {
    setError('')
    try {
      const [farmR, auditR, seasonR, cropR, methodR] = await Promise.all([
        request('/api/farms'),
        request('/api/audits'),
        request('/api/agriculture/seasons'),
        request('/api/agriculture/crops'),
        request('/api/agriculture/irrigation-methods')
      ])
      setFarms(farmR.data.farms)
      setAudits(auditR.data.audits)
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
            headers={['Season', 'Crop', 'Year', 'Area', 'Current irrigation', 'AI Advisory']}
            rows={records.map(r => [
              r.season_name,
              r.crop_name,
              r.agricultural_year,
              `${r.cultivated_area_hectares} ha`,
              r.current_irrigation_method_name,
              <button
                key={r.record_id}
                type="button"
                className="inline-ai-btn"
                onClick={() => setAdvisoryRecord(r)}
              >
                <Sparkles /> Advisory
              </button>
            ])}
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
          <h2>Select a farm to manage its records</h2>
          <p>Choose a farm above to add seasonal crop data and view auditor verification logs.</p>
        </section>
      )}

      {modal === 'farm' && <FarmForm onClose={() => setModal(null)} onSubmit={createFarm} />}
      {modal === 'record' && <RecordForm lookups={lookups} onClose={() => setModal(null)} onSubmit={createRecord} />}
      {advisoryRecord && (
        <RecordAdvisoryModal
          record={advisoryRecord}
          user={user}
          request={request}
          onClose={() => setAdvisoryRecord(null)}
        />
      )}
    </>
  )
}

/**
 * General AI Irrigation Recommendation Workspace with Searchable Dropdowns
 */
function GeneralRecommendationWorkspace({ request, setError, user }) {
  const [cropName, setCropName] = useState('Paddy / Rice (धान / जीरी)')
  const [currentPractice, setCurrentPractice] = useState('Flood Irrigation (पारंपरिक बहाव)')
  const [reference, setReference] = useState(DEFAULT_RECOMMENDATION_OPTIONS)
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    request('/api/reference/recommendation-options')
      .then(result => {
        if (result?.data?.crops?.length) setReference(result.data)
      })
      .catch(() => {})
  }, [request])

  async function generate(e) {
    e.preventDefault()
    setBusy(true)
    setReport(null)
    setError('')
    try {
      const result = await request('/api/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          villageId: user.village_id || 1,
          cropName,
          currentPractice
        })
      })
      setReport(result.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const diagnostics = report?.diagnostics

  return (
    <div className="general-advisory-container">
      <section className="panel advisory-form-card">
        <header>
          <div>
            <p className="eyebrow">Interactive Advisory</p>
            <h2>Simulation parameters</h2>
          </div>
        </header>
        <p className="muted">
          Select any crop and current irrigation method to evaluate water efficiency and agronomic suitability for{' '}
          <strong>{user.village_name || 'your assigned area'}</strong>.
        </p>

        <form className="stack" onSubmit={generate}>
          <SearchableSelect
            label="Crop selection"
            value={cropName}
            onChange={setCropName}
            options={reference.crops}
            placeholder="Search crop by name, season..."
            icon={<Sprout />}
          />

          <SearchableSelect
            label="Current irrigation practice"
            value={currentPractice}
            onChange={setCurrentPractice}
            options={reference.irrigationPractices}
            placeholder="Search irrigation method..."
            icon={<Droplets />}
          />

          <button className="button primary" disabled={busy}>
            {busy ? 'Running AI simulation…' : 'Generate AI recommendation'}
          </button>
        </form>
      </section>

      <section className="panel advisory-result-card">
        <header>
          <div>
            <p className="eyebrow">AI Evaluation & Agronomic Decision</p>
            <h2>Recommendation report</h2>
          </div>
        </header>

        {busy && (
          <div className="empty">
            <Sparkles />
            <h2>Evaluating agronomic factors…</h2>
            <p>Computing FAO-56 crop coefficients, soil water retention, and regional groundwater drawdown.</p>
          </div>
        )}

        {!busy && !report && (
          <div className="empty">
            <Sparkles />
            <h2>No active simulation</h2>
            <p>Select your crop and irrigation method, then click "Generate AI recommendation".</p>
          </div>
        )}

        {report && (
          <>
            <div className="advisory-hero">
              <div className="advisory-hero-header">
                <span className="status good">{report.actionRequired?.replaceAll('_', ' ')}</span>
                <span className="advisory-practice-title">{report.recommendedPractice?.name}</span>
              </div>
              <p className="muted">{report.recommendedPractice?.description}</p>
            </div>

            <dl className="advisory-metrics-grid">
              <div className="advisory-stat-card">
                <dt>Water Savings</dt>
                <dd className="highlight">{report.waterSavingsPercentage ?? '—'}%</dd>
              </div>
              <div className="advisory-stat-card">
                <dt>Conserved Volume</dt>
                <dd>{(report.waterSavedVolumeM3PerHa ?? 0).toLocaleString()} m³/ha</dd>
              </div>
              <div className="advisory-stat-card">
                <dt>AI Confidence</dt>
                <dd>{report.confidenceScore ?? '—'}%</dd>
              </div>
              <div className="advisory-stat-card">
                <dt>Groundwater Depth</dt>
                <dd>{diagnostics?.groundwaterLevelMeters ?? '—'} m</dd>
              </div>
            </dl>

            {report.reasons?.length > 0 && (
              <div className="reasons-box">
                <h4><Sparkles /> Scientific & Agronomic Justification</h4>
                <ul className="reasons-list">
                  {report.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.allTechniqueScores?.length > 0 && (
              <div>
                <h3>Technique Suitability Ranking</h3>
                <table className="technique-score-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Technique</th>
                      <th>Efficiency</th>
                      <th>Water Savings</th>
                      <th>Suitability Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.allTechniqueScores.map((t, idx) => (
                      <tr key={t.id} className={idx === 0 ? 'top-pick' : ''}>
                        <td>#{idx + 1}</td>
                        <td>{t.name}</td>
                        <td>{t.efficiency || 'Standard'}</td>
                        <td>{t.waterSavingsPercentage}%</td>
                        <td><strong>{t.score}/100</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/**
 * Dedicated Schemes tab view for Village Head
 */
function VillageHeadSchemes({ request, setError }) {
  const [schemes, setSchemes] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    setBusy(true)
    setError('')
    request('/api/schemes')
      .then(res => setSchemes(res.data?.schemes || []))
      .catch(err => setError(err.message))
      .finally(() => setBusy(false))
  }, [request, setError])

  const filtered = useMemo(() => {
    if (!search.trim()) return schemes
    const q = search.toLowerCase()
    return schemes.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.benefit_description?.toLowerCase().includes(q) ||
      s.eligibility?.toLowerCase().includes(q)
    )
  }, [schemes, search])

  return (
    <>
      <section className="toolbar">
        <div>
          <p className="eyebrow">Support & Subsidies</p>
          <h2>Government Agricultural Schemes</h2>
        </div>
      </section>

      <div className="schemes-search-bar">
        <input
          type="text"
          placeholder="Search schemes by name, subsidy benefit, eligibility, or crop..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <section className="scheme-grid">
        {filtered.map(s => (
          <article className="scheme-card" key={s.scheme_id}>
            <span className="status muted">{s.government_level || 'State Government'}</span>
            <h3>{s.name}</h3>
            <p>{s.benefit_description || s.description}</p>
            {s.eligibility && (
              <small style={{ display: 'block', marginTop: '8px', color: 'var(--muted)' }}>
                <strong>Eligibility:</strong> {s.eligibility}
              </small>
            )}
            {s.external_link && (
              <div style={{ marginTop: '14px' }}>
                <a
                  href={s.external_link}
                  target="_blank"
                  rel="noreferrer"
                  className="button small"
                  style={{ textDecoration: 'none', display: 'inline-flex' }}
                >
                  Official Portal ↗
                </a>
              </div>
            )}
          </article>
        ))}
        {!filtered.length && !busy && (
          <section className="empty">
            <Building2 />
            <h2>No matching schemes found</h2>
            <p>Try searching with a different keyword.</p>
          </section>
        )}
      </section>
    </>
  )
}

function AuditorContent({ request, notify, setError }) {
  const [audits, setAudits] = useState([])
  const [methods, setMethods] = useState([])
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setError('')
    try {
      const [a, m] = await Promise.all([request('/api/audits'), request('/api/agriculture/irrigation-methods')])
      setAudits(a.data.audits)
      setMethods(m.data)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function save(values) {
    try {
      const payload = {
        actual_irrigation_method_id: Number(values.actual_irrigation_method_id),
        adoption_status: values.adoption_status,
        audit_date: values.audit_date,
        notes: values.notes
      }
      if (editing.audit_id) {
        await request(`/api/audits/${editing.audit_id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await request('/api/audits', { method: 'POST', body: JSON.stringify({ ...payload, record_id: editing.record_id }) })
      }
      setEditing(null)
      await load()
      notify('Verification saved.')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <section className="summary">
        <Metric icon={<Building2 />} label="Assigned audit records" value={audits.length} />
        <Metric icon={<BadgeCheck />} label="Verified adopted" value={audits.filter(a => a.adoption_status === 'ADOPTED').length} />
        <Metric icon={<Droplets />} label="Pending verification" value={audits.filter(a => a.adoption_status !== 'ADOPTED').length} />
      </section>

      <DataTable
        headers={['Farm', 'Village', 'Crop', 'Season', 'Year', 'Status', 'Audit Date', 'Action']}
        rows={audits.map(a => [
          a.farm_name,
          a.village_name,
          a.crop_name,
          a.season_name,
          a.agricultural_year,
          <Status key={a.audit_id || a.record_id} value={a.adoption_status} />,
          a.audit_date ? String(a.audit_date).slice(0, 10) : '—',
          <button key={a.audit_id || a.record_id} className="button small" onClick={() => setEditing(a)}>Verify</button>
        ])}
        empty="No audits available for your district scope."
      />

      {editing && <AuditForm audit={editing} methods={methods} onClose={() => setEditing(null)} onSubmit={save} />}
    </>
  )
}

function AdminContent({ request, notify, setError }) {
  const [schemes, setSchemes] = useState([])
  const [editing, setEditing] = useState(null)

  const load = () => {
    setError('')
    request('/api/schemes').then(r => setSchemes(r.data.schemes)).catch(e => setError(e.message))
  }
  useEffect(() => { load() }, [])

  async function save(values) {
    try {
      if (editing?.scheme_id) {
        await request(`/api/schemes/${editing.scheme_id}`, { method: 'PUT', body: JSON.stringify(values) })
      } else {
        await request('/api/schemes', { method: 'POST', body: JSON.stringify(values) })
      }
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
        body: JSON.stringify(form)
      })
      setResult(response.data?.predicted_groundwater_level_m_bgl ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel compact-panel">
      <header>
        <div>
          <Bot />
          <h2>ML Groundwater Depth Prediction</h2>
        </div>
      </header>
      <p className="muted">Run on-demand machine learning predictions for any district, tehsil, or monitoring station.</p>
      <form className="compact-form" onSubmit={submit}>
        <label>
          District
          <input value={form.District} onChange={e => change('District', e.target.value)} required />
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

function Metric({ icon, label, value }) {
  return (
    <article className="metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function DataTable({ headers, rows, empty }) {
  return (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, x) => (
                  <td key={x}>{cell || '—'}</td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="empty-cell" colSpan={headers.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FarmForm({ onClose, onSubmit }) {
  return (
    <Modal title="Add farm" onClose={onClose}>
      <Form onSubmit={onSubmit} submit="Create farm">
        <label>
          Farm name
          <input name="name" required />
        </label>
        <label>
          Owner name
          <input name="owner_name" />
        </label>
        <label>
          Total land area (hectares)
          <input name="total_land_area_hectares" type="number" min="0.01" step="0.01" required />
        </label>
      </Form>
    </Modal>
  )
}

function RecordForm({ onClose, onSubmit, lookups }) {
  return (
    <Modal title="Add seasonal crop record" onClose={onClose}>
      <Form onSubmit={onSubmit} submit="Add record">
        <label>
          Season
          <select name="season_id" required>
            <option value="">Select season</option>
            {lookups.seasons.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>
          Crop
          <select name="crop_id" required>
            <option value="">Select crop</option>
            {lookups.crops.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>
          Agricultural year
          <input name="agricultural_year" placeholder="2026-2027" required />
        </label>
        <label>
          Cultivated area (hectares)
          <input name="cultivated_area_hectares" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Current irrigation method
          <select name="current_irrigation_method_id" required>
            <option value="">Select method</option>
            {lookups.methods.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      </Form>
    </Modal>
  )
}

function AuditForm({ audit, methods, onClose, onSubmit }) {
  return (
    <Modal title={audit.audit_id ? 'Update audit verification' : 'Verify irrigation adoption'} onClose={onClose}>
      <p className="muted">{audit.farm_name} · {audit.crop_name} · {audit.season_name}</p>
      <Form onSubmit={onSubmit} submit="Save verification">
        <label>
          Actual irrigation method
          <select name="actual_irrigation_method_id" defaultValue={audit.actual_irrigation_method_id || ''} required>
            <option value="">Select method</option>
            {methods.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>
          Adoption status
          <select name="adoption_status" defaultValue={audit.adoption_status === 'UNAUDITED' ? 'ADOPTED' : audit.adoption_status} required>
            <option value="ADOPTED">Adopted</option>
            <option value="NOT_ADOPTED">Not adopted</option>
            <option value="PENDING">Pending</option>
          </select>
        </label>
        <label>
          Audit date
          <input name="audit_date" type="date" defaultValue={audit.audit_date ? String(audit.audit_date).slice(0, 10) : today} required />
        </label>
        <label>
          Notes
          <textarea name="notes" defaultValue={audit.notes || ''} />
        </label>
      </Form>
    </Modal>
  )
}

function SchemeForm({ scheme, onClose, onSubmit }) {
  return (
    <Modal title={scheme.scheme_id ? 'Edit government scheme' : 'Create government scheme'} onClose={onClose}>
      <Form onSubmit={onSubmit} submit="Save scheme">
        <label>
          Name
          <input name="name" defaultValue={scheme.name || ''} required />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={scheme.description || ''} required />
        </label>
        <label>
          Government level
          <input name="government_level" defaultValue={scheme.government_level || ''} />
        </label>
        <label>
          Benefit description
          <textarea name="benefit_description" defaultValue={scheme.benefit_description || ''} />
        </label>
        <label>
          Eligibility
          <textarea name="eligibility" defaultValue={scheme.eligibility || ''} />
        </label>
        <label>
          Application information
          <textarea name="application_information" defaultValue={scheme.application_information || ''} />
        </label>
        <label>
          Official link
          <input name="external_link" type="url" defaultValue={scheme.external_link || ''} />
        </label>
      </Form>
    </Modal>
  )
}

function Form({ children, onSubmit, submit }) {
  const [busy, setBusy] = useState(false)
  const submitForm = async e => {
    e.preventDefault()
    setBusy(true)
    const values = Object.fromEntries(new FormData(e.currentTarget))
    await onSubmit(values)
    setBusy(false)
  }
  return (
    <form className="stack" onSubmit={submitForm}>
      {children}
      <button className="button primary" disabled={busy}>
        {busy ? 'Saving…' : submit}
      </button>
    </form>
  )
}

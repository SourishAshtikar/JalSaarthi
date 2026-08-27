import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Layers3 } from 'lucide-react'

const categoryColor = (value) => ({ Safe: '#dbeafe', 'Semi Critical': '#2563eb', Critical: '#facc15', 'Over Exploited': '#dc2626' }[value] || '#64748b')
const dtwColor = (value) => value == null ? '#64748b' : value < 5 ? '#38bdf8' : value < 10 ? '#4ade80' : value < 20 ? '#facc15' : value < 40 ? '#fb923c' : '#f87171'
const esc = (value) => String(value ?? '—').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function ComparisonMapInstance({ request, setError, defaultYear = '2025-2026', defaultMode = 'category', defaultScope = 'district' }) {
  const el = useRef(null)
  const map = useRef(null)
  const thematic = useRef(null)
  
  const [scope, setScope] = useState(defaultScope)
  const [mode, setMode] = useState(defaultMode)
  const [years, setYears] = useState([])
  const [year, setYear] = useState(defaultYear)
  const [data, setData] = useState([])
  const [details, setDetails] = useState(null)
  const [busy, setBusy] = useState(false)

  // Fetch years list
  useEffect(() => {
    request('/api/groundwater-assessments/years')
      .then(r => {
        const next = (r.data.years || []).sort().reverse()
        setYears(next)
        if (next.length && !next.includes(year)) {
          setYear(next[0])
        }
      })
      .catch(err => setError(err.message))
  }, [request])

  // Initialize Map
  useEffect(() => {
    if (!el.current || map.current) return undefined
    
    const instance = L.map(el.current, { center: [29.15, 76.3], zoom: 7.2, scrollWheelZoom: true })
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' })
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Tiles © Esri' })
    
    satellite.addTo(instance)
    L.control.layers({ Satellite: satellite, Streets: street }, null, { position: 'topright' }).addTo(instance)
    
    map.current = instance
    
    return () => {
      instance.remove()
      map.current = null
    }
  }, [])

  // Load geojson & assessment data
  const load = async () => {
    if (!map.current) return
    setBusy(true)
    setError('')
    try {
      const assessment = await request(`/api/groundwater-assessments?year=${encodeURIComponent(year)}&scope=${scope}`)
      const rows = assessment.data || []
      setData(rows)
      
      const geometryFile = scope === 'district' ? 'haryana_districts.geojson' : 'haryana_villages.geojson'
      const geo = await fetch(`${API}/${geometryFile}`).then(response => {
        if (!response.ok) throw new Error(`Could not load ${geometryFile}`)
        return response.json()
      })
      
      render(geo, rows)
      
      const detailsRes = await request(`/api/groundwater-assessments/details?scope=state&year=${encodeURIComponent(year)}`)
      setDetails(detailsRes.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (year) {
      load()
    }
  }, [scope, mode, year])

  function matchRecord(feature, rows) {
    const properties = feature.properties || {}
    const name = String(scope === 'district' ? properties.NAME_2 : properties.NAME || '').trim().toLowerCase()
    const district = String(properties.DISTRICT || '').trim().toLowerCase()
    const block = String(properties.BLOCK || '').trim().toLowerCase()
    return rows.find(row => String(scope === 'district' ? row.district_name : row.village_name).trim().toLowerCase() === name) || 
           (scope === 'village' && rows.find(row => String(row.village_name).trim().toLowerCase() === block)) || 
           (scope === 'village' && rows.find(row => String(row.district_name).trim().toLowerCase() === district))
  }

  function render(geo, rows) {
    if (!map.current) return
    if (thematic.current) map.current.removeLayer(thematic.current)
    
    const layer = L.geoJSON(geo, {
      style: feature => {
        const record = matchRecord(feature, rows)
        return {
          fillColor: mode === 'dtw' ? dtwColor(record?.dtw_m_bgl) : categoryColor(record?.category),
          fillOpacity: 0.8,
          color: '#32483a',
          weight: scope === 'district' ? 1.2 : 0.55
        }
      },
      onEachFeature: (feature, polygon) => {
        const record = matchRecord(feature, rows)
        const properties = feature.properties || {}
        const name = scope === 'district' ? properties.NAME_2 : properties.NAME || 'Village'
        
        polygon.bindTooltip(`<strong>${esc(name)}</strong><br>${mode === 'dtw' ? `Depth to water: ${record?.dtw_m_bgl ?? 'No data'} m bgl` : `Groundwater category: ${esc(record?.category || 'No data')}`}`, { sticky: true })
        polygon.on('mouseover', () => polygon.setStyle({ weight: 2.6, color: '#173d28', fillOpacity: 0.94 }))
        polygon.on('mouseout', () => layer.resetStyle(polygon))
        polygon.on('click', () => {
          map.current.fitBounds(polygon.getBounds(), { padding: [24, 24] })
          if (record) {
            inspect(scope, scope === 'district' ? record.district_id : record.village_id)
          }
        })
      }
    }).addTo(map.current)
    
    thematic.current = layer
    try {
      map.current.fitBounds(layer.getBounds(), { padding: [18, 18], maxZoom: scope === 'district' ? 9 : 11 })
    } catch {
      // Empty
    }
  }

  async function inspect(nextScope, id) {
    try {
      const response = await request(`/api/groundwater-assessments/details?scope=${nextScope}&id=${id}&year=${encodeURIComponent(year)}`)
      setDetails(response.data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', background: 'var(--panel)', gap: '10px' }}>
      <div className="assessment-controls" style={{ gridTemplateColumns: 'repeat(3, 1fr)', margin: 0, gap: '6px' }}>
        <label style={{ fontSize: '0.82rem' }}>Layer
          <select value={mode} onChange={e => setMode(e.target.value)} style={{ padding: '6px' }}>
            <option value="category">Category</option>
            <option value="dtw">Water Depth (DTW)</option>
          </select>
        </label>
        <label style={{ fontSize: '0.82rem' }}>Scope
          <select value={scope} onChange={e => setScope(e.target.value)} style={{ padding: '6px' }}>
            <option value="district">District</option>
            <option value="village">Village</option>
          </select>
        </label>
        <label style={{ fontSize: '0.82rem' }}>Year
          <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: '6px' }}>
            {years.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div style={{ minHeight: '340px', height: '340px', position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }} ref={el} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '0.88rem' }}>{details?.focusName || 'Haryana (State Summary)'}</strong>
          <span className="status muted" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{details?.is_predicted ? 'AI Predicted' : 'Historical'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
          <div style={{ background: '#fafaf9', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <span className="muted">Category:</span> <strong style={{ color: 'var(--ink)' }}>{details?.category || '—'}</strong>
          </div>
          <div style={{ background: '#fafaf9', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <span className="muted">DTW:</span> <strong style={{ color: 'var(--ink)' }}>{details?.dtw_m_bgl == null ? '—' : `${Number(details.dtw_m_bgl).toFixed(2)} m bgl`}</strong>
          </div>
          <div style={{ background: '#fafaf9', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <span className="muted">Extraction Stage:</span> <strong style={{ color: 'var(--ink)' }}>{details?.stage_of_extraction_pct == null ? '—' : `${Number(details.stage_of_extraction_pct).toFixed(1)}%`}</strong>
          </div>
          <div style={{ background: '#fafaf9', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <span className="muted">Rainfall:</span> <strong style={{ color: 'var(--ink)' }}>{details?.rainfall_mm == null ? '—' : `${Number(details.rainfall_mm).toFixed(1)} mm`}</strong>
          </div>
          <div style={{ background: '#fafaf9', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <span className="muted">Annual Recharge:</span> <strong style={{ color: 'var(--ink)' }}>{details?.recharge_bcm == null ? '—' : `${Number(details.recharge_bcm).toFixed(2)} BCM`}</strong>
          </div>
          <div style={{ background: '#fafaf9', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <span className="muted">Annual Extraction:</span> <strong style={{ color: 'var(--ink)' }}>{details?.extraction_all_uses_bcm == null ? '—' : `${Number(details.extraction_all_uses_bcm).toFixed(2)} BCM`}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MapComparisonContent({ request, setError }) {
  return (
    <>
      <div className="welcome-banner">
        <h1>GIS Map Comparison Tool</h1>
        <p>Analyze groundwater assessment trends side-by-side. Compare different years, scopes, or layer variables (Category vs. DTW depth) concurrently.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginTop: '14px' }}>
        <ComparisonMapInstance 
          request={request} 
          setError={setError} 
          defaultYear="2025-2026" 
          defaultMode="category"
        />
        <ComparisonMapInstance 
          request={request} 
          setError={setError} 
          defaultYear="2020-2021" 
          defaultMode="category"
        />
      </div>

      <div className="map-legend" style={{ marginTop: '20px' }}>
        <strong>Legends</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '0.82rem', marginTop: '6px' }}>
          <div>
            <span className="muted" style={{ marginRight: '8px' }}>Category:</span>
            <i className="safe" /> Safe 
            <i className="semi" /> Semi-critical 
            <i className="critical" /> Critical 
            <i className="over" /> Over-exploited
          </div>
          <div>
            <span className="muted" style={{ marginRight: '8px' }}>DTW:</span>
            <i className="c1" /> Shallow ({'<'} 5 m) 
            <i className="c2" /> 5–10 m 
            <i className="c3" /> 10–20 m 
            <i className="c4" /> 20–40 m 
            <i className="c5" /> Deep
          </div>
        </div>
      </div>
    </>
  )
}

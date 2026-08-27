import { useEffect, useMemo, useState } from 'react'
import { Award, BarChart2, Search } from 'lucide-react'
import { DataTable } from '../common/CommonUI'
import SustainabilityScoreModal from '../common/SustainabilityScoreModal'

export default function SustainabilityRankingTable({ request, setError }) {
  const [scores, setScores] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(true)
  const [selectedScore, setSelectedScore] = useState(null)

  const [schemes, setSchemes] = useState([])

  const load = () => {
    setBusy(true)
    setError('')
    Promise.all([
      request('/api/sustainability-scores'),
      request('/api/schemes')
    ])
      .then(([scoresRes, schemesRes]) => {
        setScores(scoresRes.data?.scores || [])
        setSchemes(schemesRes.data?.schemes || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return scores
    const q = search.toLowerCase()
    return scores.filter(s =>
      s.farm_name?.toLowerCase().includes(q) ||
      s.village_name?.toLowerCase().includes(q) ||
      s.district_name?.toLowerCase().includes(q) ||
      s.season_name?.toLowerCase().includes(q) ||
      s.priority?.toLowerCase().includes(q)
    )
  }, [scores, search])

  const [appliedTrigger, setAppliedTrigger] = useState(false)

  useEffect(() => {
    const handleFocus = () => setAppliedTrigger(prev => !prev)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const claims = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('groundwater_scheme_claims') || '{}')
    } catch {
      return {}
    }
  }, [appliedTrigger])

  const unappliedScores = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('groundwater_removed_farms') || '[]')
      return filtered.filter(s => 
        !list.includes(s.farm_id) && 
        s.priority === 'HIGH' && 
        Number(s.sustainability_score) > 75
      )
    } catch {
      return filtered.filter(s => s.priority === 'HIGH' && Number(s.sustainability_score) > 75)
    }
  }, [filtered, appliedTrigger])

  const removedCount = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('groundwater_removed_farms') || '[]')
      return filtered.filter(s => list.includes(s.farm_id)).length
    } catch {
      return 0
    }
  }, [filtered, appliedTrigger])

  const claimedCount = useMemo(() => {
    return Object.keys(claims).length
  }, [claims])

  const handleRemovePriority = (farmId) => {
    try {
      const list = JSON.parse(localStorage.getItem('groundwater_removed_farms') || '[]')
      if (!list.includes(farmId)) {
        list.push(farmId)
        localStorage.setItem('groundwater_removed_farms', JSON.stringify(list))
      }
      setAppliedTrigger(prev => !prev)
    } catch {
      setError('Failed to remove priority.')
    }
  }

  const handleResetQueue = () => {
    localStorage.removeItem('groundwater_scheme_claims')
    localStorage.removeItem('groundwater_removed_farms')
    setAppliedTrigger(prev => !prev)
  }

  return (
    <>
      <section className="toolbar">
        <div>
          <p className="eyebrow">Performance & Intervention Priority</p>
          <h2>Seasonal Sustainability Scores & Ranking</h2>
        </div>
      </section>

      <div className="schemes-search-bar">
        <input
          type="text"
          placeholder="Filter by farm name, village, district, season, or priority..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1.2fr)', gap: '20px', alignItems: 'start', marginTop: '14px' }}>
        <div>
          <DataTable
            headers={['Rank', 'Farm', 'Village', 'District', 'Season', 'Score', 'Priority', 'Action']}
            rows={filtered.map((s, idx) => {
              const pClass = s.priority === 'HIGH' ? 'score-pill good' : s.priority === 'MEDIUM' ? 'score-pill warn' : 'score-pill bad'
              return [
                `#${idx + 1}`,
                <strong key={`f-${idx}`}>{s.farm_name || `Farm #${s.farm_id}`}</strong>,
                s.village_name || '—',
                s.district_name || 'Karnal',
                `${s.season_name || `Season ${s.season_id}`} (${s.agricultural_year})`,
                <strong key={`sc-${idx}`}>{s.sustainability_score} / 100</strong>,
                <span key={`p-${idx}`} className={pClass}>{s.priority}</span>,
                <button
                  key={`btn-${idx}`}
                  type="button"
                  className="button small ghost"
                  onClick={() => setSelectedScore(s)}
                >
                  Breakdown
                </button>
              ]
            })}
            empty={busy ? 'Loading sustainability scores...' : 'No seasonal sustainability scores recorded yet. Scores calculate as farm records and audits are logged.'}
          />
        </div>

        <div className="panel" style={{ padding: '16px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award style={{ color: 'var(--green)', width: '18px', height: '18px' }} />
              Priority Queue
            </span>
            {(removedCount > 0 || claimedCount > 0) && (
              <button 
                onClick={handleResetQueue} 
                className="button link small" 
                style={{ padding: 0, fontSize: '0.72rem', color: 'var(--red)', border: 'none', background: 'none', cursor: 'pointer' }}
              >
                Reset Queue
              </button>
            )}
          </h3>
          <p className="muted" style={{ fontSize: '0.78rem', margin: '0 0 16px 0', lineHeight: '1.4' }}>
            The sustainability ranking determines queue priority. The top-ranked farm is automatically assigned the active scheme opportunity.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {unappliedScores.map((s, idx) => {
              const claimedScheme = claims[s.farm_id]
              const schemeName = claimedScheme || schemes[idx % schemes.length]?.name || 'Water Conservation Subsidy'
              const isFirst = idx === 0
              return (
                <div key={`pq-${s.score_id || idx}`} style={{ 
                  padding: '10px 12px', 
                  background: isFirst ? '#f0fdf4' : 'transparent', 
                  border: isFirst ? '2px solid var(--green)' : '1px solid var(--border-subtle)', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: isFirst ? '#166534' : 'var(--ink)',
                  position: 'relative'
                }}>
                  {isFirst && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '6px', 
                      right: '8px', 
                      fontSize: '0.62rem', 
                      fontWeight: 'bold', 
                      background: 'var(--green)', 
                      color: 'white', 
                      padding: '2px 6px', 
                      borderRadius: '8px' 
                    }}>
                      TOP PRIORITY
                    </span>
                  )}
                  <div style={{ fontWeight: 'bold' }}>
                    #{idx + 1}. {s.farm_name || `Farm #${s.farm_id}`}
                  </div>
                  <div style={{ fontSize: '0.74rem', marginTop: '2px', color: 'var(--muted)' }}>
                    Village: {s.village_name || 'Karnal'}
                  </div>
                  
                  {claimedScheme ? (
                    <div style={{ fontSize: '0.74rem', marginTop: '2px', color: '#166534', fontWeight: 'bold' }}>
                      Claimed Scheme: {claimedScheme}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', marginTop: '2px', color: isFirst ? '#15803d' : 'var(--muted)' }}>
                      Scheme: <strong>{schemeName}</strong>
                    </div>
                  )}

                  <div style={{ fontSize: '0.74rem', marginTop: '2px' }}>
                    Score: <strong>{s.sustainability_score} / 100</strong>
                  </div>

                  {claimedScheme && (
                    <button
                      onClick={() => handleRemovePriority(s.farm_id)}
                      className="button small danger"
                      style={{ marginTop: '8px', padding: '4px 8px', fontSize: '0.72rem', display: 'block', width: 'max-content' }}
                    >
                      Remove Priority
                    </button>
                  )}
                </div>
              )
            })}
            {!unappliedScores.length && !busy && (
              <p className="muted" style={{ fontSize: '0.8rem' }}>No prioritized schemes available.</p>
            )}
          </div>
        </div>
      </div>

      {selectedScore && (
        <SustainabilityScoreModal
          scoreData={selectedScore}
          onClose={() => setSelectedScore(null)}
        />
      )}
    </>
  )
}

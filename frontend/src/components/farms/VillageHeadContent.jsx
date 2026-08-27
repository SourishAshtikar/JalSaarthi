import { useEffect, useMemo, useState } from 'react'
import { Award, BadgeCheck, BarChart2, Leaf, Plus, Sparkles, Sprout } from 'lucide-react'
import { Metric, DataTable, Status } from '../common/CommonUI'
import { FarmForm, RecordForm } from './FarmForms'
import RecordAdvisoryModal from '../advisory/RecordAdvisoryModal'
import SustainabilityScoreModal from '../common/SustainabilityScoreModal'
import SearchableSelect from '../common/SearchableSelect'

export default function VillageHeadContent({ request, notify, setError, user }) {
  const [farms, setFarms] = useState([])
  const [selected, setSelected] = useState(null)
  const [records, setRecords] = useState([])
  const [audits, setAudits] = useState([])
  const [lookups, setLookups] = useState({ seasons: [], crops: [], methods: [] })
  const [modal, setModal] = useState(null)
  const [advisoryRecord, setAdvisoryRecord] = useState(null)
  const [selectedScore, setSelectedScore] = useState(null)

  const [scores, setScores] = useState([])
  const [schemes, setSchemes] = useState([])
  const [claimsTrigger, setClaimsTrigger] = useState(false)
  const [selectedSchemeId, setSelectedSchemeId] = useState('')

  const load = async () => {
    setError('')
    try {
      const [farmR, auditR, seasonR, cropR, methodR, scoresR, schemesR] = await Promise.all([
        request('/api/farms'),
        request('/api/audits'),
        request('/api/agriculture/seasons'),
        request('/api/agriculture/crops'),
        request('/api/agriculture/irrigation-methods'),
        request('/api/sustainability-scores'),
        request('/api/schemes')
      ])
      setFarms(farmR.data.farms || [])
      setAudits(auditR.data.audits || [])
      setLookups({ seasons: seasonR.data || [], crops: cropR.data || [], methods: methodR.data || [] })
      setScores(scoresR.data?.scores || [])
      setSchemes(schemesR.data?.schemes || [])
      if (!selected && farmR.data?.farms?.[0]) setSelected(farmR.data.farms[0])
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selected) return
    request(`/api/farms/${selected.farm_id}/crop-records`)
      .then(r => setRecords(r.data.records || []))
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
      setRecords(r.data.records || [])
      notify('Seasonal crop record added.')
    } catch (e) {
      setError(e.message)
    }
  }

  // Helper to construct score object for an audit
  function getScoreForAudit(audit) {
    const isAdopted = audit?.adoption_status === 'ADOPTED'
    const isNotAdopted = audit?.adoption_status === 'NOT_ADOPTED'

    if (isAdopted) {
      return {
        farm_id: selected?.farm_id,
        farm_name: selected?.name,
        season_name: audit?.season_name,
        agricultural_year: audit?.agricultural_year,
        sustainability_score: 100,
        priority: 'HIGH',
        scores: { adoption: 50, continued_adoption: 30, audit: 20 }
      }
    }

    if (isNotAdopted) {
      return {
        farm_id: selected?.farm_id,
        farm_name: selected?.name,
        season_name: audit?.season_name,
        agricultural_year: audit?.agricultural_year,
        sustainability_score: 20,
        priority: 'LOW',
        scores: { adoption: 0, continued_adoption: 0, audit: 20 }
      }
    }

    return {
      farm_id: selected?.farm_id,
      farm_name: selected?.name,
      season_name: audit?.season_name,
      agricultural_year: audit?.agricultural_year,
      sustainability_score: 0,
      priority: 'LOW',
      scores: { adoption: 0, continued_adoption: 0, audit: 0 }
    }
  }

  const unappliedScores = useMemo(() => {
    try {
      const removed = JSON.parse(localStorage.getItem('groundwater_removed_farms') || '[]')
      return scores.filter(s => !removed.includes(s.farm_id))
    } catch {
      return scores
    }
  }, [scores, claimsTrigger])

  const topScore = unappliedScores[0]
  const isTopPriority = selected && topScore && Number(selected.farm_id) === Number(topScore.farm_id)

  const activeClaim = useMemo(() => {
    if (!selected) return null
    try {
      const claims = JSON.parse(localStorage.getItem('groundwater_scheme_claims') || '{}')
      return claims[selected.farm_id] || null
    } catch {
      return null
    }
  }, [selected?.farm_id, claimsTrigger])

  const handleApply = () => {
    if (!selected || !topScore || !selectedSchemeId) return
    const targetScheme = schemes.find(s => Number(s.scheme_id) === Number(selectedSchemeId))
    if (!targetScheme) return
    try {
      const claims = JSON.parse(localStorage.getItem('groundwater_scheme_claims') || '{}')
      claims[topScore.farm_id] = targetScheme.name
      localStorage.setItem('groundwater_scheme_claims', JSON.stringify(claims))
      setSelectedSchemeId('')
      setClaimsTrigger(prev => !prev)
      notify(`Application initiated for ${targetScheme.name}.`)
    } catch (e) {
      setError('Failed to update local queue state.')
    }
  }

  return (
    <>
      <div className="welcome-banner">
        <h1>Welcome back, {user?.name || 'User'}!</h1>
        <p>Here is the groundwater and farm summary for <strong>{user?.village_name || user?.district_name || 'your assigned area'}</strong>.</p>
      </div>

      <section className="summary">
        <Metric icon={<Sprout />} label="Registered farms" value={farms.length} />
        <Metric icon={<Leaf />} label="Seasonal records" value={records.length} />
        <Metric icon={<BadgeCheck />} label="Verified adopted" value={selectedAudits.filter(a => a.adoption_status === 'ADOPTED').length} />
      </section>

      <div className="farm-workspace-row">
        <section className="farm-card">
          <div className="farm-card-body">
            <label>
              Selected farm
              <select value={selected?.farm_id || ''} onChange={e => setSelected(farms.find(f => f.farm_id === Number(e.target.value)))}>
                <option value="">Select a farm</option>
                {farms.map(f => {
                  const isTop = topScore && Number(f.farm_id) === Number(topScore.farm_id)
                  return (
                    <option key={f.farm_id} value={f.farm_id}>
                      {f.name} {isTop ? '⭐ (Top Priority)' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>
          <div className="farm-card-footer">
            <button className="button ghost small" onClick={() => setModal('farm')} style={{ width: 'max-content' }}>
              <Plus />Add farm
            </button>
          </div>
        </section>

        {selected ? (
          <section className="farm-card">
            <div className="farm-card-header">
              <div>
                <p className="eyebrow">Farm details</p>
                <h2>{selected.name}</h2>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  Owner: {selected.owner_name || 'Not recorded'} · {selected.village_name || user.village_name}
                </p>
              </div>
              <span className="area">{selected.total_land_area_hectares} ha</span>
            </div>

            {isTopPriority && (
              <div style={{ padding: '12px 14px', background: '#f0fdf4', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award width={14} height={14} />
                  <span><strong>Top Priority Farm</strong> (Eligible for prioritized scheme application)</span>
                </div>

                {activeClaim ? (
                  <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 'bold', background: '#dcfce7', padding: '8px 10px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                    ✓ Scheme Claimed: {activeClaim} (Awaiting Admin review/removal)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', marginTop: '4px' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <SearchableSelect
                        placeholder="Select government scheme..."
                        value={selectedSchemeId}
                        onChange={val => setSelectedSchemeId(val)}
                        options={schemes.map(s => ({ value: s.scheme_id, label: s.name }))}
                      />
                    </div>
                    <button 
                      className="button primary small" 
                      onClick={handleApply}
                      disabled={!selectedSchemeId}
                      style={{ padding: '8px 16px', height: '38px' }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="farm-card-footer">
              <button className="button primary small" onClick={() => setModal('record')}>
                <Plus /> Add seasonal record
              </button>
            </div>
          </section>
        ) : (
          <section className="farm-card" style={{ justifyContent: 'center' }}>
            <p className="eyebrow">Farm details</p>
            <p className="muted" style={{ margin: '4px 0 0' }}>Select a farm to view its details.</p>
          </section>
        )}
      </div>

      {selected ? (
        <>
          <DataTable
            headers={['Season', 'Crop', 'Year', 'Area', 'Current irrigation', 'Audit Status', 'AI Advisory']}
            rows={records.map(r => {
              // Match the specific audit for this crop record
              const matchingAudit = audits.find(a => a.record_id === r.record_id)
              const auditStatus = matchingAudit?.adoption_status || 'UNAUDITED'

              return [
                r.season_name,
                r.crop_name,
                r.agricultural_year,
                `${r.cultivated_area_hectares} ha`,
                r.current_irrigation_method_name,
                <Status key={`audit-status-${r.record_id}`} value={auditStatus} />,
                <button
                  key={`advisory-${r.record_id}`}
                  type="button"
                  className="inline-ai-btn"
                  onClick={() => setAdvisoryRecord(r)}
                >
                  <Sparkles /> Advisory
                </button>
              ]
            })}
            empty="No seasonal records for this farm."
          />

          <section className="panel">
            <h2>Audit verification results & sustainability scores</h2>
            <DataTable
              headers={['Crop', 'Season', 'Status', 'Actual irrigation', 'Audit date', 'Sustainability Score']}
              rows={selectedAudits.map(a => {
                const auditScore = getScoreForAudit(a)
                const isAudited = a.adoption_status === 'ADOPTED' || a.adoption_status === 'NOT_ADOPTED'

                return [
                  a.crop_name,
                  a.season_name,
                  <Status key={`audit-status-row-${a.audit_id || a.record_id}`} value={a.adoption_status} />,
                  a.actual_irrigation_method_name || '—',
                  a.audit_date ? String(a.audit_date).slice(0, 10) : '—',
                  isAudited ? (
                    <button
                      key={`audit-score-${a.audit_id || a.record_id}`}
                      type="button"
                      className={`score-pill ${auditScore.priority === 'HIGH' ? 'good' : 'bad'}`}
                      onClick={() => setSelectedScore(auditScore)}
                    >
                      <BarChart2 /> {auditScore.sustainability_score} / 100 ({auditScore.priority})
                    </button>
                  ) : (
                    <span key={`audit-score-pending-${a.audit_id || a.record_id}`} className="score-pill" style={{ opacity: 0.7 }}>
                      <BarChart2 /> Pending Audit
                    </span>
                  )
                ]
              })}
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
      {selectedScore && (
        <SustainabilityScoreModal
          scoreData={selectedScore}
          onClose={() => setSelectedScore(null)}
        />
      )}
    </>
  )
}

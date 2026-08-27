import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2, Copy, Key, UserCheck, Users, XCircle } from 'lucide-react'
import { DataTable, Metric } from '../common/CommonUI'
import SearchableSelect from '../common/SearchableSelect'

export default function TokenGeneratorContent({ request, notify, setError }) {
  const [tokens, setTokens] = useState([])
  const [role, setRole] = useState('VILLAGE_HEAD')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  // Geography choices
  const [districts, setDistricts] = useState([])
  const [villages, setVillages] = useState([])
  const [selectedDistrictId, setSelectedDistrictId] = useState('')
  const [selectedVillageId, setSelectedVillageId] = useState('')

  const loadTokens = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await request('/api/users/tokens')
      setTokens(res.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTokens()
    
    // Fetch geography data
    request('/api/geography/districts')
      .then(res => setDistricts(res.data || []))
      .catch(err => setError(err.message))

    request('/api/geography/villages')
      .then(res => setVillages(res.data || []))
      .catch(err => setError(err.message))
  }, [])

  const handleGenerate = async (e) => {
    e.preventDefault()

    if (role === 'AUDITOR' && !selectedDistrictId) {
      setError('Geographic District Assignment is required for Auditor tokens')
      return
    }
    if (role === 'VILLAGE_HEAD' && !selectedVillageId) {
      setError('Geographic Village Assignment is required for Sarpanch tokens')
      return
    }

    setBusy(true)
    setError('')
    try {
      await request('/api/users/tokens', {
        method: 'POST',
        body: JSON.stringify({
          role,
          district_id: (role === 'AUDITOR' || role === 'ADMIN') && selectedDistrictId ? Number(selectedDistrictId) : null,
          village_id: role === 'VILLAGE_HEAD' && selectedVillageId ? Number(selectedVillageId) : null
        })
      })
      notify('Registration token generated successfully')
      setSelectedDistrictId('')
      setSelectedVillageId('')
      loadTokens()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = (token) => {
    navigator.clipboard.writeText(token)
    notify(`Token "${token}" copied to clipboard!`)
  }

  // Count summaries
  const counts = useMemo(() => {
    return tokens.reduce((acc, t) => {
      acc.total++
      if (t.is_used) acc.used++
      else acc.unused++
      return acc
    }, { total: 0, used: 0, unused: 0 })
  }, [tokens])

  const headers = ['Invite Token Code', 'Target Signup Role', 'Assigned Jurisdiction', 'Status', 'Claimed By', 'Created At']

  const rows = tokens.map(t => {
    const roleLabel = t.role === 'VILLAGE_HEAD' ? 'SARPANCH' : t.role.replaceAll('_', ' ')
    const roleClass = t.role === 'ADMIN' ? 'status warn' : t.role === 'AUDITOR' ? 'status good' : t.role === 'VILLAGE_HEAD' ? 'status brand' : 'status info'
    
    // Jurisdiction display
    let jurisdiction = <span className="muted">Global / System</span>
    if (t.village_name) {
      jurisdiction = <span>Village: <strong>{t.village_name}</strong></span>
    } else if (t.district_name) {
      jurisdiction = <span>District: <strong>{t.district_name}</strong></span>
    }

    return [
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <code style={{ fontSize: '0.92rem', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: 'var(--ink)' }}>{t.token}</code>
        <button
          className="icon-button"
          onClick={() => handleCopy(t.token)}
          title="Copy Token to Clipboard"
          style={{ padding: '4px' }}
        >
          <Copy size={13} />
        </button>
      </div>,
      <span className={roleClass} style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>{roleLabel}</span>,
      jurisdiction,
      t.is_used ? (
        <span className="status muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <XCircle size={12} /> Used
        </span>
      ) : (
        <span className="status good" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={12} /> Unused
        </span>
      ),
      t.used_by_username || <span className="muted">—</span>,
      new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    ]
  })

  return (
    <>
      <div className="welcome-banner">
        <h1>Registration Tokens (Invite System)</h1>
        <p>Generate secure registration tokens corresponding to system roles and geographic jurisdictions. New users registering with a token are automatically assigned to their respective district or village.</p>
      </div>

      <section className="summary">
        <Metric icon={<Key />} label="Total Tokens" value={counts.total} />
        <Metric icon={<CheckCircle2 />} label="Unused Tokens" value={counts.unused} />
        <Metric icon={<UserCheck />} label="Claimed Invites" value={counts.used} />
      </section>

      <section className="panel" style={{ padding: '20px 24px', marginBottom: '20px', maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
          <Users size={18} style={{ color: 'var(--green)' }} />
          <span>Generate New Registration Invite</span>
        </h3>
        <form onSubmit={handleGenerate} className="stack" style={{ gap: '14px' }}>
          <label>
            Target Sign-up Role
            <select value={role} onChange={e => {
              setRole(e.target.value)
              setSelectedDistrictId('')
              setSelectedVillageId('')
            }} style={{ padding: '9px 12px' }}>
              <option value="VILLAGE_HEAD">Sarpanch (Village Head)</option>
              <option value="AUDITOR">District Auditor</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </label>

          {/* District Selector (Auditor / Admin) */}
          {(role === 'AUDITOR' || role === 'ADMIN') && (
            <SearchableSelect
              label="Geographic District Assignment"
              placeholder="Select district..."
              value={selectedDistrictId}
              onChange={val => setSelectedDistrictId(val)}
              options={districts}
            />
          )}

          {/* Village Selector (Sarpanch) */}
          {role === 'VILLAGE_HEAD' && (
            <SearchableSelect
              label="Geographic Village Assignment"
              placeholder="Select village..."
              value={selectedVillageId}
              onChange={val => setSelectedVillageId(val)}
              options={villages}
            />
          )}

          <button type="submit" className="button primary" disabled={busy} style={{ height: '42px', padding: '0 20px', width: 'fit-content', marginTop: '10px' }}>
            {busy ? 'Generating…' : 'Generate Token'}
          </button>
        </form>
      </section>

      <DataTable
        headers={headers}
        rows={rows}
        empty={loading ? 'Loading Token Directory…' : 'No registration tokens generated yet.'}
      />
    </>
  )
}

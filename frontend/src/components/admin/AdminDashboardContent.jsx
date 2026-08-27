import { useEffect, useState } from 'react'
import { Award, Bot, Building2, Calendar, Droplets, Leaf, Shield, Users } from 'lucide-react'
import { ApiError, Metric } from '../common/CommonUI'

export default function AdminDashboardContent({ request, setError }) {
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(true)

  const loadStats = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await request('/api/users/stats')
      setStats(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (busy && !stats) {
    return <section className="panel"><p className="muted">Loading System Statistics Dashboard…</p></section>
  }

  const roles = stats?.roles || {}

  return (
    <>
      <div className="welcome-banner">
        <h1>Admin Control Dashboard</h1>
        <p>System-wide overview of registered farms, active subsidy schemes, and verification audits.</p>
      </div>

      <section className="summary">
        <Metric icon={<Leaf />} label="Registered Farms" value={stats?.totalFarms ?? 0} />
        <Metric icon={<Users />} label="System Users" value={stats?.totalUsers ?? 0} />
        <Metric icon={<Building2 />} label="Active Schemes" value={stats?.totalSchemes ?? 0} />
        <Metric icon={<Award />} label="Completed Audits" value={stats?.totalAudits ?? 0} />
      </section>

      <div className="farm-workspace-row" style={{ marginTop: '8px' }}>
        <section className="panel" style={{ padding: '24px', maxWidth: '600px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
            <Shield size={18} style={{ color: 'var(--green)' }} />
            <span>User Accounts by Role</span>
          </h3>
          <dl className="stack" style={{ gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt className="muted" style={{ fontWeight: 500 }}>Administrators</dt>
              <dd style={{ fontWeight: 'bold', color: 'var(--ink)' }}>{roles.ADMIN ?? 0}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt className="muted" style={{ fontWeight: 500 }}>District Auditors</dt>
              <dd style={{ fontWeight: 'bold', color: 'var(--ink)' }}>{roles.AUDITOR ?? 0}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt className="muted" style={{ fontWeight: 500 }}>Sarpanches</dt>
              <dd style={{ fontWeight: 'bold', color: 'var(--ink)' }}>{roles.VILLAGE_HEAD ?? 0}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt className="muted" style={{ fontWeight: 500 }}>Government Employees</dt>
              <dd style={{ fontWeight: 'bold', color: 'var(--ink)' }}>{roles.GOVERNMENT_EMPLOYEE ?? 0}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  )
}

import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Award, BadgeCheck, Bot, Building2, Columns, Droplets, Key, LayoutDashboard, Leaf, LogOut, Map, MapPin, ShieldCheck, Users } from 'lucide-react'
import { ApiError } from '../common/CommonUI'
import VillageHeadContent from '../farms/VillageHeadContent'
import GeneralRecommendationWorkspace from '../advisory/GeneralRecommendationWorkspace'
import VillageHeadSchemes from '../schemes/VillageHeadSchemes'
import AdminContent from '../schemes/AdminContent'
import SustainabilityRankingTable from '../admin/SustainabilityRankingTable'
import AuditorContent from '../audits/AuditorContent'
import PredictionTest from '../prediction/PredictionTest'
import UserManagementContent from '../admin/UserManagementContent'
import AdminDashboardContent from '../admin/AdminDashboardContent'
import TokenGeneratorContent from '../admin/TokenGeneratorContent'
import MapComparisonContent from '../admin/MapComparisonContent'

// Code-split heavy Leaflet GIS map component on demand
const AssessmentExplorer = lazy(() => import('../../AssessmentExplorer.jsx'))

export default function Shell({ user, initialTab, onLogout, onGoToLanding, notify, request, error, setError, toast }) {
  const roleLabel = user.role === 'VILLAGE_HEAD' ? 'SARPANCH' : user.role.replaceAll('_', ' ')

  // Define tab navigation per user role
  const tabs = useMemo(() => {
    if (user.role === 'ADMIN') {
      return [
        { id: 'dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard /> },
        { id: 'schemes', label: 'Scheme Catalogue', icon: <Building2 /> },
        { id: 'scores', label: 'Sustainability Scores', icon: <Award /> },
        { id: 'ml', label: 'Predict Groundwater', icon: <Bot /> },
        { id: 'users', label: 'User Assignments', icon: <Users /> },
        { id: 'tokens', label: 'Invite Tokens', icon: <Key /> },
        { id: 'maps', label: 'Groundwater Maps', icon: <Map /> },
        { id: 'compare-maps', label: 'Compare Maps', icon: <Columns /> }
      ]
    }
    if (user.role === 'AUDITOR') {
      return [
        { id: 'verification', label: 'Audit Field Logs', icon: <ShieldCheck /> },
        { id: 'maps', label: 'Groundwater Maps', icon: <Map /> }
      ]
    }

    // VILLAGE_HEAD & fallback
    return [
      { id: 'farms', label: 'Farm Register', icon: <Leaf /> },
      { id: 'recommendations', label: 'Irrigation Advisory', icon: <Droplets /> },
      { id: 'schemes', label: 'Subsidies & Schemes', icon: <BadgeCheck /> },
      { id: 'maps', label: 'Groundwater Maps', icon: <Map /> }
    ]
  }, [user.role])

  const [activeTab, setActiveTab] = useState(() => (initialTab && tabs.some(t => t.id === initialTab)) ? initialTab : (tabs[0]?.id || 'farms'))

  useEffect(() => {
    if (initialTab && tabs.some(t => t.id === initialTab)) {
      setActiveTab(initialTab)
    }
  }, [initialTab, tabs])

  useEffect(() => {
    if (tabs.length && !tabs.some(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  const activeTabMeta = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div
          className="brand"
          onClick={onGoToLanding}
          style={{ cursor: 'pointer' }}
          title="Return to JalSaarthi Landing Page"
        >
          <span className="brand-mark"><Droplets /></span>
          <div>
            <strong>JalSaarthi</strong>
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
        <ApiError message={error} onDismiss={() => setError('')} />

        {user.role === 'ADMIN' ? (
          activeTab === 'dashboard' ? (
            <AdminDashboardContent request={request} setError={setError} />
          ) : activeTab === 'users' ? (
            <UserManagementContent request={request} notify={notify} setError={setError} />
          ) : activeTab === 'tokens' ? (
            <TokenGeneratorContent request={request} notify={notify} setError={setError} />
          ) : activeTab === 'schemes' ? (
            <AdminContent request={request} notify={notify} setError={setError} />
          ) : activeTab === 'scores' ? (
            <SustainabilityRankingTable request={request} setError={setError} />
          ) : activeTab === 'ml' ? (
            <PredictionTest request={request} setError={setError} />
          ) : activeTab === 'compare-maps' ? (
            <MapComparisonContent request={request} setError={setError} />
          ) : (
            <Suspense fallback={<section className="panel"><p className="muted">Loading GIS Groundwater Maps…</p></section>}>
              <AssessmentExplorer request={request} setError={setError} />
            </Suspense>
          )
        ) : user.role === 'AUDITOR' ? (
          activeTab === 'verification' ? (
            <AuditorContent request={request} notify={notify} setError={setError} user={user} />
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
            <p>The account is authenticated, but this demo currently supports Sarpanch, Auditor, and Admin workspaces.</p>
          </section>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
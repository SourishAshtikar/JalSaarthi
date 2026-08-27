import { useEffect, useState } from 'react'
import { Droplets, Key } from 'lucide-react'
import { ApiError } from '../common/CommonUI'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export default function Register({ onRegisterSuccess, onBackToLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Live token validation states
  const [tokenRole, setTokenRole] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [validatingToken, setValidatingToken] = useState(false)

  useEffect(() => {
    const cleanedToken = token.trim().toUpperCase()
    if (cleanedToken.length === 16) {
      setValidatingToken(true)
      setTokenError('')
      setTokenRole('')
      fetch(`${API}/api/auth/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanedToken })
      })
        .then(async (r) => {
          const res = await r.json()
          if (!r.ok) throw new Error(res.message)
          const roleName = res.data.role === 'VILLAGE_HEAD' ? 'SARPANCH' : res.data.role.replaceAll('_', ' ')
          setTokenRole(roleName)
        })
        .catch(err => {
          setTokenError(err.message || 'Invalid registration token')
        })
        .finally(() => {
          setValidatingToken(false)
        })
    } else {
      setTokenRole('')
      setTokenError('')
    }
  }, [token])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, token: token.trim().toUpperCase() })
      })
      const p = await r.json()
      if (!r.ok) throw new Error(p.message)
      
      // Registration succeeded, now auto-login the user
      const loginRes = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) throw new Error(loginData.message)
      
      onRegisterSuccess(loginData.data.token, loginData.data.user)
    } catch (err) {
      setError(err.message || 'Unable to register account')
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
          <h1>Create your account</h1>
          <p className="muted">Use a generated invite token from the Administrator to claim your platform workspace.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            Full Name
            <input
              type="text"
              value={name}
              placeholder="e.g. Amit Kumar"
              onChange={e => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Email Address
            <input
              type="email"
              value={email}
              placeholder="e.g. amit@example.com"
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              placeholder="Minimum 6 characters"
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label style={{ position: 'relative' }}>
            Invite Token (16-char code)
            <input
              type="text"
              value={token}
              placeholder="Enter Invite Token..."
              onChange={e => setToken(e.target.value)}
              maxLength={16}
              style={{ fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}
              required
            />
            {validatingToken && (
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                Verifying token...
              </small>
            )}
            {tokenRole && (
              <div className="status good" style={{ fontSize: '0.75rem', padding: '4px 8px', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                <Key size={12} /> Claiming role: {tokenRole}
              </div>
            )}
            {tokenError && (
              <div className="status bad" style={{ fontSize: '0.75rem', padding: '4px 8px', marginTop: '6px', display: 'inline-flex', textTransform: 'uppercase', fontWeight: 600 }}>
                {tokenError}
              </div>
            )}
          </label>
          <ApiError message={error} />
          <button className="button primary login-submit" disabled={busy || !tokenRole}>
            {busy ? 'Registering…' : 'Register & Log In'}
          </button>

          <p className="muted" style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.88rem' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onBackToLogin}
              style={{ background: 'none', border: 'none', color: 'var(--green-dark)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              Sign In
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}

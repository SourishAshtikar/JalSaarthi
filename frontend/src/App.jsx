import { useEffect, useState } from 'react'
import Login from './components/layout/Login'
import Shell from './components/layout/Shell'
import { apiRequest, TOKEN_KEY, USER_KEY } from './services/api'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem(USER_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  
  // Instant SWR restoration if token and cached user exist
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY) && !localStorage.getItem(USER_KEY)))
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Background token verification & session refresh
  useEffect(() => {
    if (!token) {
      setLoading(false)
      setUser(null)
      return
    }

    apiRequest('/api/auth/me')
      .then(({ data }) => {
        if (data?.user) {
          setUser(data.user)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  function handleLoginSuccess(nextToken, nextUser) {
    localStorage.setItem(TOKEN_KEY, nextToken)
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
  
  return (
    <Shell
      user={user}
      onLogout={signOut}
      notify={notify}
      request={apiRequest}
      error={error}
      setError={setError}
      toast={toast}
    />
  )
}

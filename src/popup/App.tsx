import { useState, useEffect } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import LoggedInView from './components/LoggedInView'
import { getAuthState } from '../shared/storage'
import type { AuthState } from '../shared/types'

type View = 'login' | 'register' | 'logged-in'

export default function App() {
  const [view, setView] = useState<View>('login')
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const state = await getAuthState()
    setAuthState(state)
    setView(state.authenticated ? 'logged-in' : 'login')
    setLoading(false)
  }

  function handleLoginSuccess(email: string, company_id: string) {
    setAuthState({ authenticated: true, email, company_id, token: null })
    setView('logged-in')
    notifyContentScripts()
  }

  function handleLogout() {
    setAuthState({ authenticated: false, email: null, company_id: null, token: null })
    setView('login')
    notifyContentScripts()
  }

  function notifyContentScripts() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'AUTH_CHANGED' }).catch(() => {})
        }
      })
    })
  }

  if (loading) {
    return (
      <div className="bg-dark-100 p-5 flex items-center justify-center min-h-[200px]">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-dark-100 p-5 text-white">
      {view === 'login' && (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setView('register')}
        />
      )}
      {view === 'register' && (
        <RegisterForm
          onSuccess={() => setView('login')}
          onSwitchToLogin={() => setView('login')}
        />
      )}
      {view === 'logged-in' && authState && (
        <LoggedInView
          email={authState.email || ''}
          companyId={authState.company_id || ''}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}

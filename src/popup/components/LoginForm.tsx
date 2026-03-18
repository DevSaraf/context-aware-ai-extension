import { useState } from 'react'
import { login } from '../../shared/api'
import { setAuthState } from '../../shared/storage'

interface Props {
  onSuccess: (email: string, company_id: string) => void
  onSwitchToRegister: () => void
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const data = await login(email, password)

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.access_token) {
        await setAuthState(data.access_token, data.email, data.company_id)
        onSuccess(data.email, data.company_id)
      }
    } catch {
      setError('Connection error. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-lg font-semibold mb-5">Context Assistant</h1>

      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-semibold rounded-md transition-colors"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>

      {error && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}

      <p className="mt-4 text-center text-xs text-gray-500">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-400 hover:underline"
        >
          Register
        </button>
      </p>
    </form>
  )
}

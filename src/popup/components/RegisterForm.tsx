import { useState } from 'react'
import { register } from '../../shared/api'

interface Props {
  onSuccess: () => void
  onSwitchToLogin: () => void
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password || !companyId) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const data = await register(email, password, companyId)

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.message === 'User created') {
        setSuccess('Account created! You can now login.')
        setTimeout(onSuccess, 2000)
      }
    } catch {
      setError('Connection error. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-lg font-semibold mb-5">Create Account</h1>

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
          placeholder="Create password"
          className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Company ID</label>
        <input
          type="text"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          placeholder="your-company"
          className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-semibold rounded-md transition-colors"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      {error && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}

      {success && (
        <p className="mt-3 text-green-400 text-sm">{success}</p>
      )}

      <p className="mt-4 text-center text-xs text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-400 hover:underline"
        >
          Login
        </button>
      </p>
    </form>
  )
}

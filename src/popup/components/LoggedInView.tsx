import { useState } from 'react'
import { clearAuthState, getToken } from '../../shared/storage'

interface Props {
  email: string
  companyId: string
  onLogout: () => void
}

export default function LoggedInView({ email, companyId, onLogout }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleLogout() {
    await clearAuthState()
    onLogout()
  }

  async function handleCopyToken() {
    const token = await getToken()
    if (token) {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="text-center">
      <h1 className="text-lg font-semibold mb-5">Context Assistant</h1>

      <p className="text-blue-400 text-sm mb-1">{email}</p>
      <p className="text-gray-500 text-xs mb-6">Company: {companyId}</p>

      <button
        onClick={handleCopyToken}
        className="w-full py-2 mb-2 border border-dark-300 text-gray-400 hover:text-white hover:border-gray-500 rounded-md text-sm transition-colors"
      >
        {copied ? 'Copied!' : 'Copy Token (for testing)'}
      </button>

      <button
        onClick={handleLogout}
        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
      >
        Logout
      </button>
    </div>
  )
}

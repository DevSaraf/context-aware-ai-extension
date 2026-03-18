import ContextList from './ContextList'
import type { Source } from '../../shared/types'

interface Props {
  authenticated: boolean
  email: string | null
  sources: Source[]
  loading: boolean
  error: string | null
  checking: boolean
  onInjectContext: () => void
}

export default function Sidebar({
  authenticated,
  email,
  sources,
  loading,
  error,
  checking,
  onInjectContext,
}: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '320px',
        height: '100vh',
        background: '#111',
        color: 'white',
        zIndex: 9999,
        padding: '20px',
        borderLeft: '1px solid #333',
        fontFamily: 'Arial, sans-serif',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold m-0">Context Assistant</h2>
        {authenticated && email && (
          <span className="text-xs text-green-400">{email}</span>
        )}
        {!authenticated && !checking && (
          <span className="text-xs text-red-400">Not logged in</span>
        )}
      </div>

      {/* Content */}
      {checking ? (
        <div className="text-gray-400 text-sm">Checking authentication...</div>
      ) : !authenticated ? (
        <div className="text-center py-10 px-5">
          <p className="text-gray-400 mb-4">Please login to use Context Assistant</p>
          <p className="text-xs text-gray-600">
            Click the extension icon in your browser toolbar to login
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
          <span>Searching...</span>
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-md">
          {error}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-gray-400 text-sm">
          Waiting for prompt...
          <p className="text-xs text-gray-600 mt-2">
            Start typing in the ChatGPT input to see relevant knowledge
          </p>
        </div>
      ) : (
        <ContextList sources={sources} onInjectContext={onInjectContext} />
      )}
    </div>
  )
}

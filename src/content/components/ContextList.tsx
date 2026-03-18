import { useState } from 'react'
import ContextItem from './ContextItem'
import type { Source } from '../../shared/types'

interface Props {
  sources: Source[]
  onInjectContext: () => void
}

export default function ContextList({ sources, onInjectContext }: Props) {
  const [injected, setInjected] = useState(false)

  function handleInject() {
    onInjectContext()
    setInjected(true)
    setTimeout(() => setInjected(false), 2000)
  }

  return (
    <div>
      {/* Header with inject button */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Relevant Knowledge</h3>
        <button
          onClick={handleInject}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            injected
              ? 'bg-green-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {injected ? 'Included!' : 'Include Context'}
        </button>
      </div>

      {/* Source list */}
      <ul className="space-y-3">
        {sources.map((source, index) => (
          <ContextItem key={index} source={source} />
        ))}
      </ul>
    </div>
  )
}

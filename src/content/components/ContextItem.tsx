import type { Source } from '../../shared/types'

interface Props {
  source: Source
}

export default function ContextItem({ source }: Props) {
  const similarity = source.similarity
    ? `${(source.similarity * 100).toFixed(1)}% match`
    : ''

  // Color based on similarity
  const getConfidenceColor = (sim: number) => {
    if (sim >= 0.7) return 'text-green-400'
    if (sim >= 0.4) return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <li className="p-3 bg-[#1a1a1a] rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-blue-400 font-medium text-sm">
          {source.source_type || 'Knowledge'} #{source.source_id || ''}
        </span>
        {similarity && (
          <span className={`text-xs ${getConfidenceColor(source.similarity)}`}>
            {similarity}
          </span>
        )}
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">
        {source.text}
      </p>
    </li>
  )
}

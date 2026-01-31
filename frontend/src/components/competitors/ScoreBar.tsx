'use client'

interface ScoreBarProps {
  score: number | null | undefined
  label?: string
  showValue?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-100'
  if (score >= 40) return 'bg-yellow-100'
  return 'bg-red-100'
}

export function ScoreBar({ score, label, showValue = true }: ScoreBarProps) {
  const value = score ?? 0

  return (
    <div className="space-y-1">
      {(label || showValue) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-gray-600">{label}</span>}
          {showValue && <span className="font-medium">{score != null ? Math.round(value) : '—'}</span>}
        </div>
      )}
      <div className={`h-2 rounded-full ${getScoreBgColor(value)} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${getScoreColor(value)}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

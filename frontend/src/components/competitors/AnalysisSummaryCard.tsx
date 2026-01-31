'use client'

import { AnalysisSummary } from '@/types/competitor'
import { ScoreBar } from './ScoreBar'

interface AnalysisSummaryCardProps {
  summary: AnalysisSummary | null | undefined
  overallScore: number | null | undefined
}

const positionLabels: Record<string, string> = {
  leader: 'Market Leader',
  challenger: 'Challenger',
  follower: 'Follower',
  niche: 'Niche Player',
}

const positionColors: Record<string, string> = {
  leader: 'bg-green-100 text-green-800',
  challenger: 'bg-blue-100 text-blue-800',
  follower: 'bg-yellow-100 text-yellow-800',
  niche: 'bg-purple-100 text-purple-800',
}

export function AnalysisSummaryCard({ summary, overallScore }: AnalysisSummaryCardProps) {
  if (!summary) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <p className="text-gray-500">No analysis summary available yet.</p>
      </div>
    )
  }

  const position = summary.market_position || 'niche'

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
            {summary.summary && (
              <p className="text-gray-600 mt-2">{summary.summary}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${positionColors[position]}`}>
              {positionLabels[position]}
            </span>
            {overallScore != null && (
              <div className="w-24">
                <ScoreBar score={overallScore} label="Score" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SWOT Grid */}
      {summary.swot && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SWOT Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
              <h4 className="font-medium text-green-800 mb-2">Strengths</h4>
              <ul className="text-sm text-green-700 space-y-1">
                {summary.swot.strengths?.map((s, i) => (
                  <li key={i}>&#8226; {s}</li>
                ))}
              </ul>
            </div>
            <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
              <h4 className="font-medium text-red-800 mb-2">Weaknesses</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {summary.swot.weaknesses?.map((w, i) => (
                  <li key={i}>&#8226; {w}</li>
                ))}
              </ul>
            </div>
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
              <h4 className="font-medium text-blue-800 mb-2">Opportunities</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {summary.swot.opportunities?.map((o, i) => (
                  <li key={i}>&#8226; {o}</li>
                ))}
              </ul>
            </div>
            <div className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
              <h4 className="font-medium text-orange-800 mb-2">Threats</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {summary.swot.threats?.map((t, i) => (
                  <li key={i}>&#8226; {t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations && summary.recommendations.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
          <ul className="space-y-3">
            {summary.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

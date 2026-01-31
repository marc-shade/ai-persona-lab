'use client'

import { ScoreBar } from './ScoreBar'
import { Competitor } from '@/types/competitor'

interface ComparisonTableProps {
  productName: string
  competitors: Competitor[]
}

const dimensions = [
  { key: 'featureScore', label: 'Features' },
  { key: 'pricingScore', label: 'Pricing' },
  { key: 'uxScore', label: 'UX' },
  { key: 'marketScore', label: 'Market' },
  { key: 'overallScore', label: 'Overall' },
] as const

export function ComparisonTable({ productName, competitors }: ComparisonTableProps) {
  if (competitors.length === 0) {
    return <p className="text-gray-500 text-sm">No competitors to compare.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 pr-4 text-sm font-medium text-gray-500 w-28">Dimension</th>
            {competitors.map((c) => (
              <th key={c.id} className="text-left py-3 px-2 text-sm font-medium text-gray-900 min-w-[140px]">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dimensions.map((dim) => (
            <tr key={dim.key} className="border-b last:border-0">
              <td className="py-3 pr-4 text-sm text-gray-600 font-medium">{dim.label}</td>
              {competitors.map((c) => (
                <td key={c.id} className="py-3 px-2">
                  <ScoreBar score={c[dim.key]} showValue={true} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { competitorsApi } from '@/lib/api'
import { CompetitorAnalysis } from '@/types/competitor'
import { Plus, Swords, Loader2, Trash2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCRAPING: 'bg-blue-100 text-blue-700',
  ANALYZING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

export default function CompetitorsPage() {
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyses()
  }, [])

  async function loadAnalyses() {
    try {
      const data = await competitorsApi.getAll()
      setAnalyses(data)
    } catch (err) {
      console.error('Failed to load analyses:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this analysis and all its competitors?')) return
    try {
      await competitorsApi.delete(id)
      setAnalyses((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitor Analysis</h1>
          <p className="text-gray-500 mt-1">
            Analyze your competitive landscape with AI-powered insights
          </p>
        </div>
        <Link href="/dashboard/competitors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </Link>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Swords className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No analyses yet</h3>
            <p className="text-gray-500 mb-4">Create your first competitor analysis to get started.</p>
            <Link href="/dashboard/competitors/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/competitors/${analysis.id}`}>
                      <CardTitle className="text-lg hover:text-primary transition-colors truncate">
                        {analysis.name}
                      </CardTitle>
                    </Link>
                    <CardDescription className="mt-1 truncate">
                      {analysis.productName}
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[analysis.status] || statusColors.DRAFT}>
                    {analysis.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {analysis.competitors?.length || 0} competitor{(analysis.competitors?.length || 0) !== 1 ? 's' : ''}
                  </span>
                  {analysis.overallScore != null && (
                    <span className="font-medium">
                      Score: {Math.round(analysis.overallScore)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Link href={`/dashboard/competitors/${analysis.id}`}>
                    <Button variant="outline" size="sm">View Details</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(analysis.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

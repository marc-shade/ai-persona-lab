'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { competitorsApi } from '@/lib/api'
import { CompetitorAnalysis } from '@/types/competitor'
import { ScoreBar } from '@/components/competitors/ScoreBar'
import { ComparisonTable } from '@/components/competitors/ComparisonTable'
import { AnalysisSummaryCard } from '@/components/competitors/AnalysisSummaryCard'
import { ArrowLeft, Loader2, RefreshCw, Globe } from 'lucide-react'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCRAPING: 'bg-blue-100 text-blue-700',
  ANALYZING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

export default function CompetitorAnalysisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const id = params.id as string

  useEffect(() => {
    loadAnalysis()
  }, [id])

  async function loadAnalysis() {
    try {
      const data = await competitorsApi.getById(id)
      setAnalysis(data)
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRunAnalysis() {
    setRunning(true)
    try {
      await competitorsApi.scrape(id)
      const result = await competitorsApi.analyze(id)
      setAnalysis(result)
    } catch (err) {
      console.error('Analysis failed:', err)
      await loadAnalysis()
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Analysis not found.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    )
  }

  const summary = analysis.summary as any

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push('/dashboard/competitors')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Analyses
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{analysis.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={statusColors[analysis.status]}>
              {analysis.status}
            </Badge>
            <span className="text-gray-500 text-sm">
              {analysis.competitors.length} competitor{analysis.competitors.length !== 1 ? 's' : ''}
            </span>
            {analysis.productUrl && (
              <a
                href={analysis.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Globe className="h-3 w-3" /> {analysis.productName}
              </a>
            )}
          </div>
        </div>
        <Button onClick={handleRunAnalysis} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {analysis.status === 'COMPLETED' ? 'Re-Analyze' : 'Run Analysis'}
        </Button>
      </div>

      {/* Analysis Summary */}
      {analysis.status === 'COMPLETED' && summary && (
        <>
          <AnalysisSummaryCard summary={summary} overallScore={analysis.overallScore} />

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Competitor Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ComparisonTable
                productName={analysis.productName}
                competitors={analysis.competitors}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Draft / In-Progress state */}
      {(analysis.status === 'DRAFT' || analysis.status === 'SCRAPING' || analysis.status === 'ANALYZING') && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            {(analysis.status === 'SCRAPING' || analysis.status === 'ANALYZING') ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {analysis.status === 'SCRAPING' ? 'Scraping competitor data...' : 'Running AI analysis...'}
                </h3>
                <p className="text-gray-500">This may take a moment. Refresh to check progress.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Ready to analyze</h3>
                <p className="text-gray-500 mb-4">Click &quot;Run Analysis&quot; to scrape competitor data and generate AI insights.</p>
                <Button onClick={handleRunAnalysis} disabled={running}>
                  {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Run Analysis
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {analysis.status === 'FAILED' && (
        <Card className="border-red-200">
          <CardContent className="py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-800 mb-1">Analysis Failed</h3>
              <p className="text-red-600 mb-4">The analysis encountered an error. You can try running it again.</p>
              <Button onClick={handleRunAnalysis} disabled={running}>
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Retry Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Competitor Cards */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Competitors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.competitors.map((comp) => (
            <Card key={comp.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{comp.name}</CardTitle>
                    {comp.url && (
                      <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        {comp.url}
                      </a>
                    )}
                  </div>
                  {comp.overallScore != null && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">{Math.round(comp.overallScore)}</div>
                      <div className="text-xs text-gray-500">Overall</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {comp.description && (
                  <p className="text-sm text-gray-600">{comp.description}</p>
                )}

                {comp.overallScore != null && (
                  <div className="space-y-2">
                    <ScoreBar score={comp.featureScore} label="Features" />
                    <ScoreBar score={comp.pricingScore} label="Pricing" />
                    <ScoreBar score={comp.uxScore} label="UX" />
                    <ScoreBar score={comp.marketScore} label="Market" />
                  </div>
                )}

                {comp.strengths.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Strengths:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comp.strengths.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-green-700 border-green-300">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {comp.weaknesses.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Weaknesses:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comp.weaknesses.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-red-700 border-red-300">{w}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {comp.features.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Features:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comp.features.slice(0, 5).map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {f.length > 40 ? f.slice(0, 40) + '...' : f}
                        </Badge>
                      ))}
                      {comp.features.length > 5 && (
                        <Badge variant="secondary" className="text-xs">+{comp.features.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

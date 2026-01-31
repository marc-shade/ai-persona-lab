export interface Competitor {
  id: string
  name: string
  url?: string | null
  description?: string | null
  category?: string | null
  tagline?: string | null
  features: string[]
  pricing?: string | null
  strengths: string[]
  weaknesses: string[]
  scrapedAt?: string | null
  scrapeStatus: ScrapeStatus
  scrapeError?: string | null
  rawScrapedData?: any
  overallScore?: number | null
  featureScore?: number | null
  pricingScore?: number | null
  uxScore?: number | null
  marketScore?: number | null
  scores?: any
  createdAt: string
  updatedAt: string
  analysisId: string
}

export interface CompetitorAnalysis {
  id: string
  name: string
  description?: string | null
  status: CompetitorAnalysisStatus
  productName: string
  productUrl?: string | null
  productCategory?: string | null
  productDescription?: string | null
  productStrengths: string[]
  productWeaknesses: string[]
  summary?: AnalysisSummary | null
  overallScore?: number | null
  createdAt: string
  updatedAt: string
  userId: string
  organizationId?: string | null
  competitors: Competitor[]
}

export interface AnalysisSummary {
  summary?: string
  market_position?: 'leader' | 'challenger' | 'follower' | 'niche'
  competitor_scores?: CompetitorScore[]
  swot?: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  recommendations?: string[]
  // Also accept the generic analyzeExperimentResults fields
  insights?: string[]
  patterns?: any[]
  metrics_analysis?: any
}

export interface CompetitorScore {
  name: string
  competitorId?: string
  overallScore: number
  featureScore: number
  pricingScore: number
  uxScore: number
  marketScore: number
  strengths?: string[]
  weaknesses?: string[]
}

export interface ScrapedData {
  title: string
  description: string
  tagline: string
  features: string[]
  pricing: string
  bodyText: string
  url: string
  scrapedAt: string
}

export interface CompetitorFormData {
  name: string
  url: string
  description: string
  features: string[]
}

export type CompetitorAnalysisStatus = 'DRAFT' | 'SCRAPING' | 'ANALYZING' | 'COMPLETED' | 'FAILED'
export type ScrapeStatus = 'PENDING' | 'SCRAPING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'

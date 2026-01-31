import { prisma } from '../server';
import { getAIProvider } from './ai-provider';
import { scrapeUrl, ScrapedData } from './scraper';

interface CompetitorInput {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
  features: string[];
}

interface ProductInput {
  name: string;
  url?: string | null;
  description?: string | null;
  strengths: string[];
  weaknesses: string[];
  category?: string | null;
}

export async function scrapeCompetitor(competitorId: string): Promise<ScrapedData | null> {
  const competitor = await prisma.competitor.findUnique({ where: { id: competitorId } });
  if (!competitor || !competitor.url) return null;

  await prisma.competitor.update({
    where: { id: competitorId },
    data: { scrapeStatus: 'SCRAPING' },
  });

  try {
    const data = await scrapeUrl(competitor.url);

    await prisma.competitor.update({
      where: { id: competitorId },
      data: {
        scrapeStatus: 'COMPLETED',
        scrapedAt: new Date(),
        rawScrapedData: data as any,
        tagline: data.tagline || competitor.tagline,
        description: data.description || competitor.description,
        features: data.features.length > 0 ? data.features : competitor.features,
        pricing: data.pricing || competitor.pricing,
      },
    });

    return data;
  } catch (err: any) {
    await prisma.competitor.update({
      where: { id: competitorId },
      data: {
        scrapeStatus: 'FAILED',
        scrapeError: err.message || 'Scrape failed',
      },
    });
    return null;
  }
}

export async function scrapeAllPending(analysisId: string): Promise<number> {
  const competitors = await prisma.competitor.findMany({
    where: { analysisId, scrapeStatus: 'PENDING', url: { not: null } },
  });

  await prisma.competitorAnalysis.update({
    where: { id: analysisId },
    data: { status: 'SCRAPING' },
  });

  let scraped = 0;
  for (const c of competitors) {
    const result = await scrapeCompetitor(c.id);
    if (result) scraped++;
  }

  return scraped;
}

export async function runAnalysis(analysisId: string, userId: string): Promise<any> {
  const analysis = await prisma.competitorAnalysis.findUnique({
    where: { id: analysisId },
    include: { competitors: true },
  });

  if (!analysis) throw new Error('Analysis not found');

  await prisma.competitorAnalysis.update({
    where: { id: analysisId },
    data: { status: 'ANALYZING' },
  });

  try {
    const aiProvider = getAIProvider();

    const product: ProductInput = {
      name: analysis.productName,
      url: analysis.productUrl,
      description: analysis.productDescription,
      strengths: analysis.productStrengths,
      weaknesses: analysis.productWeaknesses,
      category: analysis.productCategory,
    };

    const competitors: CompetitorInput[] = analysis.competitors.map((c) => ({
      id: c.id,
      name: c.name,
      url: c.url,
      description: c.description,
      features: c.features,
    }));

    // Build prompt for LLM
    const prompt = buildAnalysisPrompt(product, competitors, analysis.competitors);

    // Use analyzeExperimentResults with type 'competitor_analysis'
    const result = await aiProvider.analyzeExperimentResults(
      'competitor_analysis',
      analysis.competitors.map((c) => ({
        competitorId: c.id,
        name: c.name,
        description: c.description,
        features: c.features,
        pricing: c.pricing,
        tagline: c.tagline,
        scrapedText: (c.rawScrapedData as any)?.bodyText || '',
      })),
      {
        product,
        competitorCount: competitors.length,
        analysisPrompt: prompt,
      },
      userId
    );

    // Parse scores from LLM result and update competitors
    const competitorScores = result?.competitor_scores || result?.patterns || [];
    if (Array.isArray(competitorScores)) {
      for (const score of competitorScores) {
        if (score.competitorId || score.name) {
          const match = analysis.competitors.find(
            (c) => c.id === score.competitorId || c.name === score.name
          );
          if (match) {
            await prisma.competitor.update({
              where: { id: match.id },
              data: {
                overallScore: score.overallScore ?? score.overall ?? null,
                featureScore: score.featureScore ?? score.features ?? null,
                pricingScore: score.pricingScore ?? score.pricing ?? null,
                uxScore: score.uxScore ?? score.ux ?? null,
                marketScore: score.marketScore ?? score.market ?? null,
                scores: score,
                strengths: score.strengths || match.strengths,
                weaknesses: score.weaknesses || match.weaknesses,
              },
            });
          }
        }
      }
    }

    // Calculate overall score as average of competitor scores
    const allScores = competitorScores
      .map((s: any) => s.overallScore ?? s.overall)
      .filter((s: any) => typeof s === 'number');
    const overallScore = allScores.length > 0
      ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length
      : null;

    await prisma.competitorAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        summary: result,
        overallScore,
      },
    });

    return result;
  } catch (err: any) {
    await prisma.competitorAnalysis.update({
      where: { id: analysisId },
      data: { status: 'FAILED' },
    });
    throw err;
  }
}

function buildAnalysisPrompt(
  product: ProductInput,
  competitors: CompetitorInput[],
  rawCompetitors: any[]
): string {
  const competitorDetails = rawCompetitors.map((c) => {
    const scraped = c.rawScrapedData as any;
    return `
Competitor: ${c.name}
URL: ${c.url || 'N/A'}
Description: ${c.description || scraped?.description || 'N/A'}
Tagline: ${c.tagline || scraped?.tagline || 'N/A'}
Features: ${(c.features?.length ? c.features : scraped?.features || []).join(', ') || 'N/A'}
Pricing: ${c.pricing || scraped?.pricing || 'N/A'}
Page Content: ${(scraped?.bodyText || '').slice(0, 1500)}`;
  }).join('\n---\n');

  return `Analyze the competitive landscape for the following product against its competitors.

YOUR PRODUCT:
Name: ${product.name}
Category: ${product.category || 'N/A'}
Description: ${product.description || 'N/A'}
Strengths: ${product.strengths.join(', ') || 'N/A'}
Weaknesses: ${product.weaknesses.join(', ') || 'N/A'}

COMPETITORS:
${competitorDetails}

Respond with valid JSON containing:
{
  "summary": "Executive summary of the competitive landscape (2-3 sentences)",
  "market_position": "leader" | "challenger" | "follower" | "niche",
  "competitor_scores": [
    {
      "name": "Competitor Name",
      "overallScore": 0-100,
      "featureScore": 0-100,
      "pricingScore": 0-100,
      "uxScore": 0-100,
      "marketScore": 0-100,
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."]
    }
  ],
  "swot": {
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "opportunities": ["...", "..."],
    "threats": ["...", "..."]
  },
  "recommendations": ["...", "...", "..."]
}`;
}

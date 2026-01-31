import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../server';
import { scrapeUrl } from '../services/scraper';
import { scrapeAllPending, scrapeCompetitor, runAnalysis } from '../services/competitor-analysis';

const router = express.Router();

router.use(authMiddleware);

// List all analyses for current user/org
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const orgId = user.organizationId || null;
    const list = await prisma.competitorAnalysis.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(orgId ? [{ organizationId: orgId }] : []),
        ],
      },
      include: { competitors: { select: { id: true, name: true, overallScore: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch analyses' });
  }
});

// Get single analysis with all competitors
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const analysis = await prisma.competitorAnalysis.findUnique({
      where: { id: req.params.id },
      include: { competitors: true },
    });
    if (!analysis) return res.status(404).json({ error: 'Not found' });
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch analysis' });
  }
});

// Create analysis with initial competitors
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const orgId = user.organizationId || null;
    const body = req.body || {};

    const analysis = await prisma.competitorAnalysis.create({
      data: {
        name: body.name || `${body.productName} Analysis`,
        description: body.description || null,
        productName: body.productName,
        productUrl: body.productUrl || null,
        productCategory: body.productCategory || null,
        productDescription: body.productDescription || null,
        productStrengths: body.productStrengths || [],
        productWeaknesses: body.productWeaknesses || [],
        userId: user.id,
        organizationId: orgId,
        competitors: {
          create: (body.competitors || []).map((c: any) => ({
            name: c.name,
            url: c.url || null,
            description: c.description || null,
            category: c.category || null,
            features: c.features || [],
            pricing: c.pricing || null,
          })),
        },
      },
      include: { competitors: true },
    });

    res.status(201).json(analysis);
  } catch (err: any) {
    console.error('Create competitor analysis error:', err);
    res.status(400).json({ error: err.message || 'Failed to create analysis' });
  }
});

// Update analysis metadata
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const analysis = await prisma.competitorAnalysis.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        description: body.description,
        productName: body.productName,
        productUrl: body.productUrl,
        productCategory: body.productCategory,
        productDescription: body.productDescription,
        productStrengths: body.productStrengths,
        productWeaknesses: body.productWeaknesses,
      },
    });
    res.json(analysis);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update analysis' });
  }
});

// Delete analysis (cascades to competitors)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.competitorAnalysis.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete analysis' });
  }
});

// Add competitor to analysis
router.post('/:id/competitors', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const competitor = await prisma.competitor.create({
      data: {
        name: body.name,
        url: body.url || null,
        description: body.description || null,
        category: body.category || null,
        features: body.features || [],
        pricing: body.pricing || null,
        analysisId: req.params.id,
      },
    });
    res.status(201).json(competitor);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add competitor' });
  }
});

// Remove competitor
router.delete('/:id/competitors/:cid', async (req: Request, res: Response) => {
  try {
    await prisma.competitor.delete({ where: { id: req.params.cid } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to remove competitor' });
  }
});

// One-off URL scrape preview
router.post('/scrape-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const data = await scrapeUrl(url);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to scrape URL' });
  }
});

// Bulk scrape all pending competitors
router.post('/:id/scrape', async (req: Request, res: Response) => {
  try {
    const scraped = await scrapeAllPending(req.params.id);
    const analysis = await prisma.competitorAnalysis.findUnique({
      where: { id: req.params.id },
      include: { competitors: true },
    });
    res.json({ scraped, analysis });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to scrape competitors' });
  }
});

// Trigger LLM analysis
router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const result = await runAnalysis(req.params.id, user.id);
    const analysis = await prisma.competitorAnalysis.findUnique({
      where: { id: req.params.id },
      include: { competitors: true },
    });
    res.json(analysis);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to run analysis' });
  }
});

export default router;

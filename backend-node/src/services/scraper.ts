import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedData {
  title: string;
  description: string;
  tagline: string;
  features: string[];
  pricing: string;
  bodyText: string;
  url: string;
  scrapedAt: string;
}

const SCRAPE_TIMEOUT = 15000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_BODY_TEXT = 5000;

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  // Validate URL protocol
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs are supported');
  }

  const response = await axios.get(url, {
    timeout: SCRAPE_TIMEOUT,
    maxContentLength: MAX_RESPONSE_SIZE,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PersonaLabBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    responseType: 'text',
  });

  const $ = cheerio.load(response.data);

  // Remove scripts, styles, nav, footer to focus on main content
  $('script, style, nav, footer, header, noscript, iframe').remove();

  const title = $('title').first().text().trim() || '';

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const tagline =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    '';

  // Extract features from list items in sections likely containing features
  const features: string[] = [];
  $('li').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 200 && features.length < 20) {
      features.push(text);
    }
  });

  // Look for pricing info
  let pricing = '';
  const pricingSelectors = [
    '[class*="pricing"]', '[class*="price"]', '[id*="pricing"]', '[id*="price"]',
    '[data-section="pricing"]',
  ];
  for (const sel of pricingSelectors) {
    const pricingEl = $(sel).first();
    if (pricingEl.length) {
      pricing = pricingEl.text().trim().slice(0, 1000);
      break;
    }
  }

  // Get body text, truncated
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_BODY_TEXT);

  return {
    title,
    description,
    tagline,
    features,
    pricing,
    bodyText,
    url,
    scrapedAt: new Date().toISOString(),
  };
}

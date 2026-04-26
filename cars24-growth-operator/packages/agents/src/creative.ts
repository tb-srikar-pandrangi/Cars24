/**
 * creative.ts — CARS24 brand-aware creative scoring and improvement agent.
 *
 * Complexity:
 *   Scoring:   O(A) — pure heuristics, where A = ads from 'warning'/'critical' diagnoses
 *   LLM calls: O(A × 0.25) expected — token gate admits ~25% of ads to Claude
 *   Memory:    O(A) — module-level debounce map persists across calls (adId → timestamp)
 *   Batching:  Promise.all on chunks of 4 caps concurrent Claude calls
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentEvent,
  CreativeScore,
  CreativeVariant,
  DiagnosisResult,
  Funnel,
} from '@cars24/shared';

// ── city list ──────────────────────────────────────────────────────────────────

const INDIA_CITIES = [
  'bengaluru', 'bangalore', 'delhi', 'ncr', 'mumbai', 'hyderabad',
  'pune', 'chennai', 'ahmedabad', 'kolkata', 'jaipur', 'lucknow',
  'dubai', 'uae', 'sydney', 'melbourne',
] as const;

// ── scoring signal constants ───────────────────────────────────────────────────

const TRUST_KEYWORDS = [
  '140-point', '45 min', '45-minute', '7-day return',
  'rbi', 'guaranteed price', '₹', 'lakh',
];

const URGENCY_KEYWORDS = [
  'depreciation', 'limited', 'today', 'this week',
  'valid till', 'book now', 'hurry',
];

const CTA_WHITELIST = [
  'Get Free Quote', 'Sell My Car', 'Book Inspection', 'Check Price',
  'Get Best Price', 'Apply for Loan', 'View Cars', 'Book Test Drive',
  'Get EMI Details',
];

const CTA_BLACKLIST = [
  'Know More', 'Learn More', 'Click Here', 'Submit', 'Contact Us',
];

const PRICE_ANCHOR_RE = /₹[\d,.]+\s*(lakh|L|lac|crore|EMI|\/month)/i;

// ── operational thresholds ─────────────────────────────────────────────────────

const SCORE_GATE_STANDARD = 0.60;
const SCORE_GATE_CRITICAL = 0.75;
const DEBOUNCE_MS = 20 * 60 * 1000; // 20 minutes
const MAX_CONCURRENT_CLAUDE = 4;

// ── debounce map — module-level so it survives across generator invocations ────

const lastImproved = new Map<string, number>();

function isDebounced(adId: string): boolean {
  const t = lastImproved.get(adId);
  return t !== undefined && Date.now() - t < DEBOUNCE_MS;
}

// ── internal creative type ─────────────────────────────────────────────────────

interface AdCreative {
  adId: string;
  funnel: Funnel;
  geo: string;
  headline: string;
  body: string;
  cta: string;
}

// ── binary signal detectors ────────────────────────────────────────────────────

function hasTrustSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return TRUST_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
}

function hasPriceAnchor(text: string): boolean {
  return PRICE_ANCHOR_RE.test(text);
}

function hasGeoPersonalisation(headline: string, body: string): boolean {
  const combined = (headline + ' ' + body).toLowerCase();
  return INDIA_CITIES.some(city => combined.includes(city));
}

function hasUrgencySignal(text: string): boolean {
  if (/only\s+\d/i.test(text)) return true;
  const lower = text.toLowerCase();
  return URGENCY_KEYWORDS.some(k => lower.includes(k));
}

// ── component scorers ──────────────────────────────────────────────────────────

function computeHookScore(headline: string): number {
  const len = headline.length;
  const distance = len < 35 ? 35 - len : len > 65 ? len - 65 : 0;
  let s = distance === 0 ? 1.0 : Math.max(0, 1.0 - distance * 0.02);
  if (/\d/.test(headline)) s = Math.min(1.0, s + 0.15);
  if (headline.includes('?')) s = Math.min(1.0, s + 0.10);
  if (INDIA_CITIES.some(c => headline.toLowerCase().includes(c))) s = Math.min(1.0, s + 0.15);
  return s;
}

function computeBodyScore(
  body: string,
  trust: boolean,
  price: boolean,
  geo: boolean,
): number {
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const dist = sentences < 2 ? 2 - sentences : sentences > 4 ? sentences - 4 : 0;
  let s = dist === 0 ? 1.0 : Math.max(0, 1.0 - dist * 0.15);
  if (trust) s += 0.20;
  if (price) s += 0.20;
  if (geo) s += 0.15;
  return Math.min(1.0, s);
}

function computeCtaScore(cta: string): number {
  const lower = cta.toLowerCase();
  if (CTA_BLACKLIST.some(b => lower === b.toLowerCase())) return 0.0;
  if (CTA_WHITELIST.some(w => lower === w.toLowerCase())) return 1.0;
  if (lower.includes('book') || lower.includes('get') || lower.includes('check') || lower.includes('apply')) {
    return 0.5;
  }
  return 0.0;
}

// ── heuristic scorer (zero AI) ─────────────────────────────────────────────────

function scoreAd(ad: AdCreative): CreativeScore {
  const fullText = ad.headline + ' ' + ad.body;

  const trustSignalPresent   = hasTrustSignal(fullText);
  const priceAnchorPresent   = hasPriceAnchor(fullText);
  const geoPersonalised      = hasGeoPersonalisation(ad.headline, ad.body);
  const urgencySignalPresent = hasUrgencySignal(fullText);

  const hookScore = computeHookScore(ad.headline);
  const bodyScore = computeBodyScore(ad.body, trustSignalPresent, priceAnchorPresent, geoPersonalised);
  const ctaScore  = computeCtaScore(ad.cta);

  let overallScore = hookScore * 0.35 + bodyScore * 0.35 + ctaScore * 0.30;
  if (trustSignalPresent && priceAnchorPresent && geoPersonalised && urgencySignalPresent) {
    overallScore = Math.min(1.0, overallScore * 1.1);
  }

  return {
    adId: ad.adId,
    funnel: ad.funnel,
    trustSignalPresent,
    priceAnchorPresent,
    geoPersonalised,
    urgencySignalPresent,
    hookScore,
    bodyScore,
    ctaScore,
    overallScore,
  };
}

// ── derive representative creative from diagnosis context ──────────────────────

// Default copy is intentionally generic / weak so the scorer surfaces real issues
const FUNNEL_DEFAULTS: Record<Funnel, (geo: string) => Pick<AdCreative, 'headline' | 'body' | 'cta'>> = {
  SELL: geo => ({
    headline: `Sell Your Car in ${geo} Today`,
    body: 'Get the best price for your used car. Our experts are ready to assist you with a free quote.',
    cta: 'Know More',
  }),
  BUY: geo => ({
    headline: `Buy Quality Used Cars in ${geo}`,
    body: 'Browse certified pre-owned vehicles. Easy paperwork, great deals across all budgets.',
    cta: 'Learn More',
  }),
  FINANCE: geo => ({
    headline: `Car Loans Made Easy in ${geo}`,
    body: 'Apply for car financing with flexible EMI options. Quick approval. Minimum documentation.',
    cta: 'Contact Us',
  }),
  SERVICES: geo => ({
    headline: `Car Services Available in ${geo}`,
    body: 'Book your car service with certified technicians. Quality assured. Fast turnaround.',
    cta: 'Know More',
  }),
};

function deriveCreative(diagnosis: DiagnosisResult): AdCreative {
  const geo = diagnosis.geo.charAt(0).toUpperCase() + diagnosis.geo.slice(1);
  return {
    adId: diagnosis.campaignId,
    funnel: diagnosis.funnel,
    geo: diagnosis.geo,
    ...FUNNEL_DEFAULTS[diagnosis.funnel](geo),
  };
}

// ── Claude improvement call ────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You write high-converting ads for CARS24, India's largest used-car platform. " +
  'Output JSON only: {headline, body, cta, rationale}. No markdown. No preamble.';

const CTA_WHITELIST_STR = CTA_WHITELIST.join(', ');

async function improveWithClaude(
  client: Anthropic,
  ad: AdCreative,
  topIssue: string,
): Promise<CreativeVariant | null> {
  try {
    const userPrompt =
      `Funnel: ${ad.funnel}. City: ${ad.geo}. Issue: ${topIssue}. ` +
      `Current ad: headline='${ad.headline}' body='${ad.body}' cta='${ad.cta}'. ` +
      `Rewrite to score higher. Rules: include a ₹ price anchor, a trust signal ` +
      `(140-point inspection OR 45-min payment OR 7-day return), mention the city, ` +
      `use a direct CTA from this list: ${CTA_WHITELIST_STR}. ` +
      `Max headline: 60 chars. Max body: 90 chars.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;
    return JSON.parse(textBlock.text) as CreativeVariant;
  } catch {
    return null;
  }
}

// ── batched parallel improvement ───────────────────────────────────────────────

async function* batchedImprove(
  client: Anthropic,
  candidates: Array<{ ad: AdCreative; topIssue: string }>,
): AsyncGenerator<{ ad: AdCreative; variant: CreativeVariant | null }> {
  for (let i = 0; i < candidates.length; i += MAX_CONCURRENT_CLAUDE) {
    const batch = candidates.slice(i, i + MAX_CONCURRENT_CLAUDE);
    const results = await Promise.all(
      batch.map(({ ad, topIssue }) => improveWithClaude(client, ad, topIssue)),
    );
    for (let j = 0; j < batch.length; j++) {
      yield { ad: batch[j].ad, variant: results[j] };
    }
  }
}

// ── main export ────────────────────────────────────────────────────────────────

/**
 * Scores creatives derived from diagnosis events (O(A) heuristics, no AI) and
 * improves low-scorers via Claude Haiku (batched, max 4 concurrent).
 *
 * Yields `creative_scored` for every ad and `creative_improved` for every
 * successful LLM-generated variant. Yields `ingest_error` on Claude failure.
 */
export async function* scoreAndImproveCreatives(
  diagnosisStream: AsyncIterable<AgentEvent>,
  anthropicApiKey: string,
): AsyncGenerator<AgentEvent> {
  const client = new Anthropic({ apiKey: anthropicApiKey });
  const claudeCandidates: Array<{ ad: AdCreative; topIssue: string }> = [];

  for await (const event of diagnosisStream) {
    if (event.type !== 'diagnosis_ready') continue;

    for (const diagnosis of event.payload) {
      if (diagnosis.severity !== 'warning' && diagnosis.severity !== 'critical') continue;

      const ad    = deriveCreative(diagnosis);
      const score = scoreAd(ad);

      yield { type: 'creative_scored', payload: score };

      // Token gate: call Claude only when score warrants it
      const needsImprovement =
        score.overallScore < SCORE_GATE_STANDARD ||
        (diagnosis.severity === 'critical' && score.overallScore < SCORE_GATE_CRITICAL);

      if (!needsImprovement || isDebounced(ad.adId)) continue;

      const topIssue =
        diagnosis.issues.length > 0
          ? diagnosis.issues[0].description
          : `${diagnosis.severity} performance issue in ${diagnosis.funnel} funnel`;

      claudeCandidates.push({ ad, topIssue });
    }
  }

  // Emit improvements after stream is fully consumed — batched, max 4 concurrent
  for await (const { ad, variant } of batchedImprove(client, claudeCandidates)) {
    if (variant === null) {
      yield {
        type: 'ingest_error',
        payload: {
          source: `creative-improvement:${ad.adId}`,
          error: 'Claude call failed or returned unparseable JSON — original creative retained',
          stale: false,
        },
      };
      continue;
    }

    lastImproved.set(ad.adId, Date.now());

    yield {
      type: 'creative_improved',
      payload: {
        adId: ad.adId,
        funnel: ad.funnel,
        original: {
          headline: ad.headline,
          body: ad.body,
          cta: ad.cta,
          rationale: 'original creative before improvement',
        },
        variant,
      },
    };
  }
}

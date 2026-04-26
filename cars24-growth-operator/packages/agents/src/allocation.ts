/**
 * allocation.ts — CARS24 CMA-driven budget and bid optimizer.
 *
 * Complexity:
 *   allocateCampaigns         O(C log C) per cycle; O(C × 24) steady-state memory.
 *   rankByCma                 O(C log C)
 *   computeBudgetShifts       O(C) — sort already paid by rankByCma
 *   adjustBidByCma            O(1)
 *   adjustBidByFunnelPriority O(1)
 *   shouldExpandAudience      O(1)
 *   expansionReason           O(1)
 *   evaluateGeoDecisions      O(G), G = unique campaignId+geo pairs
 *   insertDecisionLog         O(1) ring-buffer write
 *
 * Memory: O(C × 24) decision logs + O(C × 7) CMA history = O(C) total.
 * Zero AI calls. All decision functions are pure and exported.
 */

import type {
  AgentEvent,
  AllocationDecision,
  CampaignMetrics,
  DiagnosisResult,
  Funnel,
} from '@cars24/shared';

// ── Constants ─────────────────────────────────────────────────────────────────

const DECISION_LOG_CAPACITY = 24;
const MS_PER_DAY = 86_400_000;
const MIN_DAILY_BUDGET_DEFAULT = 500;

const BID_CLAMP_MIN = -0.30;
const BID_CLAMP_MAX = 0.25;

const CMA_IMPROVING_DELTA = 0.15;
const CMA_FLAT_DELTA = 0.05;
const CMA_LOSS_DELTA = -0.20;
const CPL_SPIKE_DELTA = -0.12;
const FREQUENCY_BURN_DELTA = -0.18;

const MAX_ADJUSTMENTS_24H = 4;
const DIMINISHING_RETURNS_FACTOR = 0.5;

const BUDGET_DONOR_MAX_FRACTION = 0.18;
const MAX_CYCLE_SHIFT_FRACTION = 0.15;
const QUARTILE_FRACTION = 0.25;

const CTR_EXPANSION_THRESHOLD = 0.012;
const MIN_CAMPAIGN_AGE_DAYS = 10;

const GEO_ZERO_TX_PAUSE_DAYS = 5;
const GEO_PAUSE_SPEND_FLOOR = 2_000;
const GEO_EXPAND_SPEND_CEILING = 5_000;

const HIGH_APPOINTMENT_THRESHOLD = 10;
const INTENT_DILUTION_CTR_DROP = -0.15;

const METRO_GEOS = new Set([
  'bengaluru', 'ncr', 'mumbai', 'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad',
]);

// ── Exported Types ────────────────────────────────────────────────────────────

/** Runtime configuration threaded into every allocation cycle. */
export type AllocationConfig = {
  /** INR floor per campaign per day. Default ₹500. */
  minDailyBudget?: number;
  /** CMA value above which a geo qualifies for expansion. Default 0. */
  cmaBenchmark?: number;
  /** Yield decisions but skip mock-apply events. */
  dryRun?: boolean;
};

/** Per-geo performance snapshot; keyed by `${campaignId}:${geo}`. */
export type GeoMetrics = {
  campaignId: string;
  geo: string;
  totalSpend: number;
  totalTransactions: number;
  consecutiveZeroDays: number;
  cma: number;
};

export type DecisionLogEntry = {
  timestamp: number;
  bidAdjustment: number;
  budgetShift: number;
  reason: string;
};

/**
 * Per-campaign mutable state threaded through the allocation cycle.
 * O(24) for decisionLog + O(7) for cmaHistory7d = O(1) per campaign.
 */
export type CampaignHistory = {
  campaignId: string;
  /** Rolling 7-day CMA values, oldest first; used to detect trend direction. */
  cmaHistory7d: number[];
  /** Adjustments applied within the last 24h; pruned lazily on each read. */
  adjustmentsIn24h: Array<{ timestamp: number; amount: number }>;
  hasCplSpike: boolean;
  hasFrequencyBurn: boolean;
  consecutiveZeroTransactionDays: number;
  /** Unix ms when first observed; gates audience-expansion eligibility. */
  firstSeenAt: number;
  /** Fixed-size ring buffer; length always === DECISION_LOG_CAPACITY. */
  decisionLog: Array<DecisionLogEntry | null>;
  /** Next write slot (wraps modulo DECISION_LOG_CAPACITY). */
  decisionLogHead: number;
};

/** Donor → recipient budget transfer for a single cycle. */
export type BudgetShiftPair = {
  donorId: string;
  recipientId: string;
  /** INR to transfer. Always > 0. */
  amount: number;
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function geoKey(campaignId: string, geo: string): string {
  return `${campaignId}:${geo}`;
}

// ── Circular Buffer ───────────────────────────────────────────────────────────

/** O(1). Overwrites the oldest entry once the buffer is full. */
export function insertDecisionLog(
  history: CampaignHistory,
  entry: DecisionLogEntry,
): void {
  history.decisionLog[history.decisionLogHead] = entry;
  history.decisionLogHead = (history.decisionLogHead + 1) % DECISION_LOG_CAPACITY;
}

// ── Ranking ───────────────────────────────────────────────────────────────────

/** O(C log C). Returns a new array sorted by CMA descending. */
export function rankByCma(campaigns: CampaignMetrics[]): CampaignMetrics[] {
  return [...campaigns].sort((a, b) => b.cma - a.cma);
}

// ── Bid Adjustment ────────────────────────────────────────────────────────────

/**
 * O(1). CMA-driven bid multiplier. Diagnosis flags are read from history
 * (populated by applyDiagnosisToHistory before this is called).
 * Clamps to [-0.30, +0.25]; halves when ≥4 adjustments in 24h.
 */
export function adjustBidByCma(
  m: CampaignMetrics,
  history: CampaignHistory,
): number {
  // Prune stale entries lazily; in practice n ≤ MAX_ADJUSTMENTS_24H
  const cutoff = Date.now() - MS_PER_DAY;
  history.adjustmentsIn24h = history.adjustmentsIn24h.filter(a => a.timestamp >= cutoff);

  let delta: number;

  if (m.cma > 0) {
    const avg7d =
      history.cmaHistory7d.length > 0
        ? history.cmaHistory7d.reduce((s, v) => s + v, 0) / history.cmaHistory7d.length
        : m.cma;
    delta = m.cma > avg7d ? CMA_IMPROVING_DELTA : CMA_FLAT_DELTA;
  } else {
    delta = CMA_LOSS_DELTA;
  }

  if (history.hasCplSpike) delta += CPL_SPIKE_DELTA;
  if (history.hasFrequencyBurn) delta += FREQUENCY_BURN_DELTA;

  // Clamp before diminishing-returns so halving cannot reopen the window
  delta = clamp(delta, BID_CLAMP_MIN, BID_CLAMP_MAX);

  if (history.adjustmentsIn24h.length >= MAX_ADJUSTMENTS_24H) {
    delta *= DIMINISHING_RETURNS_FACTOR;
  }

  return clamp(delta, BID_CLAMP_MIN, BID_CLAMP_MAX);
}

/** O(1). Funnel-priority overlay applied on top of the CMA adjustment. */
export function adjustBidByFunnelPriority(
  funnel: Funnel,
  diagnosis: DiagnosisResult | undefined,
  metrics: CampaignMetrics,
): number {
  switch (funnel) {
    case 'SERVICES':
      // Highest-margin funnel: never reduce without explicit critical evidence
      return diagnosis?.severity === 'critical' ? -0.10 : 0;

    case 'FINANCE':
      // Protect conversion pipeline while loan applications are flowing
      return metrics.loanApplications > 0 ? 0.05 : 0;

    case 'SELL': {
      const hasGeoQualityFailure =
        diagnosis?.issues.some(
          i =>
            i.severity === 'critical' &&
            (i.affectedMetric === 'cpl' ||
              i.affectedMetric === 'ctr' ||
              i.code.toUpperCase().includes('GEO')),
        ) ?? false;
      return hasGeoQualityFailure ? -0.15 : 0;
    }

    case 'BUY': {
      if (metrics.appointments >= HIGH_APPOINTMENT_THRESHOLD) return 0.05;
      const hasIntentDilution =
        diagnosis?.issues.some(
          i => i.affectedMetric === 'ctr' && i.delta < INTENT_DILUTION_CTR_DROP,
        ) ?? false;
      return hasIntentDilution ? -0.10 : 0;
    }

    default: {
      // Exhaustiveness guard — new Funnel values will cause a compile error here
      const _: never = funnel;
      void _;
      return 0;
    }
  }
}

// ── Budget Shifts ─────────────────────────────────────────────────────────────

/**
 * O(C) after sort. Pairs bottom-quartile donors with top-quartile recipients.
 * Hard rules: SERVICES never donates; floor = minDailyBudget; 15% portfolio cap.
 */
export function computeBudgetShifts(
  ranked: CampaignMetrics[],
  config: AllocationConfig,
): BudgetShiftPair[] {
  const minBudget = config.minDailyBudget ?? MIN_DAILY_BUDGET_DEFAULT;
  const c = ranked.length;
  if (c < 4) return [];

  const totalPortfolio = ranked.reduce((s, m) => s + m.spend, 0);
  const maxTotalShift = totalPortfolio * MAX_CYCLE_SHIFT_FRACTION;
  const quartileSize = Math.max(1, Math.floor(c * QUARTILE_FRACTION));

  // Top 25% with positive CMA → eligible to receive
  const recipients = ranked.slice(0, quartileSize).filter(m => m.cma > 0);
  // Bottom 25%, excluding SERVICES and already-floored campaigns
  const donors = ranked
    .slice(c - quartileSize)
    .filter(m => m.funnel !== 'SERVICES' && m.spend > minBudget);

  if (recipients.length === 0 || donors.length === 0) return [];

  const pairs: BudgetShiftPair[] = [];
  let shiftedSoFar = 0;
  let ri = 0;

  for (const donor of donors) {
    if (shiftedSoFar >= maxTotalShift || ri >= recipients.length) break;

    const headroom = Math.min(
      donor.spend * BUDGET_DONOR_MAX_FRACTION,
      donor.spend - minBudget,
    );
    const amount = Math.min(headroom, maxTotalShift - shiftedSoFar);
    if (amount <= 0) continue;

    pairs.push({ donorId: donor.campaignId, recipientId: recipients[ri].campaignId, amount });
    shiftedSoFar += amount;
    ri = (ri + 1) % recipients.length;
  }

  return pairs;
}

// ── Audience Expansion ────────────────────────────────────────────────────────

/** O(1). True when CTR, CMA, campaign age, and frequency signals all qualify. */
export function shouldExpandAudience(
  m: CampaignMetrics,
  history: CampaignHistory,
): boolean {
  const ageDays = (Date.now() - history.firstSeenAt) / MS_PER_DAY;
  return (
    m.ctr > CTR_EXPANSION_THRESHOLD &&
    m.cma > 0 &&
    ageDays > MIN_CAMPAIGN_AGE_DAYS &&
    !history.hasFrequencyBurn
  );
}

/** O(1). Human-readable expansion rationale; returns '' when expansion not warranted. */
export function expansionReason(m: CampaignMetrics, history: CampaignHistory): string {
  if (!shouldExpandAudience(m, history)) return '';

  // Rising metro CPT signals buyers shifting to cheaper cars — Tier-2 demand window
  if (m.funnel === 'SELL' && METRO_GEOS.has(m.geo) && m.cpt > 0) {
    return (
      `Tier-2 city expansion — ${m.geo} CPT ₹${m.cpt.toFixed(0)} signals buyers ` +
      `shifting to affordable segment; Tier-2 demand window opening`
    );
  }

  if (m.funnel === 'FINANCE' && m.leads > 0) {
    return `Lookalike expansion off ${m.leads} converting loan leads`;
  }

  return (
    `Audience expansion — CTR ${(m.ctr * 100).toFixed(2)}% > 1.2% threshold, ` +
    `CMA ₹${m.cma.toFixed(0)} positive`
  );
}

// ── Geo Decisions ─────────────────────────────────────────────────────────────

/** O(G). Emits expand / pause / maintain for each campaignId+geo key. */
export function evaluateGeoDecisions(
  geoMetricsMap: Map<string, GeoMetrics>,
  config: AllocationConfig,
): Map<string, 'expand' | 'pause' | 'maintain'> {
  const cmaBenchmark = config.cmaBenchmark ?? 0;
  const result = new Map<string, 'expand' | 'pause' | 'maintain'>();

  for (const [key, geo] of geoMetricsMap) {
    if (
      geo.consecutiveZeroDays >= GEO_ZERO_TX_PAUSE_DAYS &&
      geo.totalSpend > GEO_PAUSE_SPEND_FLOOR
    ) {
      result.set(key, 'pause');
    } else if (geo.cma > cmaBenchmark && geo.totalSpend < GEO_EXPAND_SPEND_CEILING) {
      result.set(key, 'expand');
    } else {
      result.set(key, 'maintain');
    }
  }

  return result;
}

// ── Internal State Helpers ────────────────────────────────────────────────────

function getOrInitHistory(
  historyMap: Map<string, CampaignHistory>,
  campaignId: string,
): CampaignHistory {
  let h = historyMap.get(campaignId);
  if (h === undefined) {
    h = {
      campaignId,
      cmaHistory7d: [],
      adjustmentsIn24h: [],
      hasCplSpike: false,
      hasFrequencyBurn: false,
      consecutiveZeroTransactionDays: 0,
      firstSeenAt: Date.now(),
      decisionLog: new Array(DECISION_LOG_CAPACITY).fill(null) as Array<DecisionLogEntry | null>,
      decisionLogHead: 0,
    };
    historyMap.set(campaignId, h);
  }
  return h;
}

function applyDiagnosisToHistory(
  historyMap: Map<string, CampaignHistory>,
  d: DiagnosisResult,
): void {
  const h = getOrInitHistory(historyMap, d.campaignId);
  h.hasCplSpike = d.issues.some(
    i => i.affectedMetric === 'cpl' && i.severity === 'critical',
  );
  // Frequency burn: explicit code flag OR CTR drop >30% (audience fatigue proxy)
  h.hasFrequencyBurn = d.issues.some(
    i =>
      i.code.toUpperCase().includes('FREQUENCY') ||
      (i.affectedMetric === 'ctr' && i.delta < -0.30),
  );
}

function trackGeoMetrics(
  geoMetricsMap: Map<string, GeoMetrics>,
  m: CampaignMetrics,
): void {
  const key = geoKey(m.campaignId, m.geo);
  const existing = geoMetricsMap.get(key);

  if (existing === undefined) {
    geoMetricsMap.set(key, {
      campaignId: m.campaignId,
      geo: m.geo,
      totalSpend: m.spend,
      totalTransactions: m.transactions,
      consecutiveZeroDays: m.transactions === 0 ? 1 : 0,
      cma: m.cma,
    });
    return;
  }

  existing.totalSpend = m.spend;
  existing.totalTransactions = m.transactions;
  existing.cma = m.cma;
  existing.consecutiveZeroDays = m.transactions === 0 ? existing.consecutiveZeroDays + 1 : 0;
}

// ── Core Allocation Cycle ─────────────────────────────────────────────────────

function buildReason(
  bidAdj: number,
  budgetShift: number,
  geoAction: 'expand' | 'pause' | 'maintain',
  expReason: string,
  m: CampaignMetrics,
): string {
  const parts: string[] = [];

  if (bidAdj !== 0) {
    parts.push(`bid ${bidAdj > 0 ? '+' : ''}${(bidAdj * 100).toFixed(0)}% (CMA ₹${m.cma.toFixed(0)})`);
  }
  if (budgetShift < 0) {
    parts.push(`budget −₹${Math.abs(budgetShift).toFixed(0)} shifted out (bottom-quartile CMA)`);
  } else if (budgetShift > 0) {
    parts.push(`budget +₹${budgetShift.toFixed(0)} received (top-quartile CMA)`);
  }
  if (geoAction === 'pause') {
    parts.push(`geo paused — 0 transactions for ${GEO_ZERO_TX_PAUSE_DAYS}+ days`);
  }
  if (geoAction === 'expand') {
    parts.push('geo flagged for expansion (positive CMA, underspend)');
  }
  if (expReason) parts.push(expReason);

  return parts.length > 0 ? parts.join('; ') : 'no action required';
}

function runAllocationCycle(
  metricsMap: Map<string, CampaignMetrics>,
  diagnosisMap: Map<string, DiagnosisResult>,
  historyMap: Map<string, CampaignHistory>,
  geoMetricsMap: Map<string, GeoMetrics>,
  config: AllocationConfig,
): AllocationDecision[] {
  const allMetrics = [...metricsMap.values()];
  const ranked = rankByCma(allMetrics);
  const shifts = computeBudgetShifts(ranked, config);
  const geoDecisions = evaluateGeoDecisions(geoMetricsMap, config);

  // Index shift assignments for O(1) lookup inside the per-campaign loop
  const donorShifts = new Map<string, { amount: number; recipientId: string }>();
  const recipientShifts = new Map<string, number>();
  for (const s of shifts) {
    donorShifts.set(s.donorId, { amount: s.amount, recipientId: s.recipientId });
    recipientShifts.set(s.recipientId, (recipientShifts.get(s.recipientId) ?? 0) + s.amount);
  }

  const now = Date.now();
  const decisions: AllocationDecision[] = [];

  for (const m of allMetrics) {
    const diagnosis = diagnosisMap.get(m.campaignId);
    const history = getOrInitHistory(historyMap, m.campaignId);

    // Advance rolling 7-day CMA window (oldest entry evicted at length 8)
    history.cmaHistory7d.push(m.cma);
    if (history.cmaHistory7d.length > 7) history.cmaHistory7d.shift();

    const cmaAdj = adjustBidByCma(m, history);
    const funnelAdj = adjustBidByFunnelPriority(m.funnel, diagnosis, m);
    const bidAdjustment = clamp(cmaAdj + funnelAdj, BID_CLAMP_MIN, BID_CLAMP_MAX);

    history.adjustmentsIn24h.push({ timestamp: now, amount: bidAdjustment });

    const donorEntry = donorShifts.get(m.campaignId);
    const budgetShift = donorEntry
      ? -donorEntry.amount
      : (recipientShifts.get(m.campaignId) ?? 0);
    const budgetShiftTarget = donorEntry?.recipientId;

    const geoAction = geoDecisions.get(geoKey(m.campaignId, m.geo)) ?? 'maintain';
    const audienceExpansion = shouldExpandAudience(m, history);
    const expReason = expansionReason(m, history);
    const reason = buildReason(bidAdjustment, budgetShift, geoAction, expReason, m);

    // Conservative linear estimate: only positive bid changes on positive-CMA campaigns count
    const estimatedCmaImpact =
      Math.max(0, bidAdjustment) * Math.max(0, m.cma) * 0.5 +
      (budgetShift > 0 ? budgetShift * 0.01 : 0);

    const decision: AllocationDecision = {
      campaignId: m.campaignId,
      funnel: m.funnel,
      geo: m.geo,
      bidAdjustment,
      budgetShift,
      budgetShiftTarget,
      audienceExpansion,
      geoAction,
      reason,
      estimatedCmaImpact,
    };

    insertDecisionLog(history, { timestamp: now, bidAdjustment, budgetShift, reason });
    decisions.push(decision);
  }

  return decisions;
}

// ── Main Generator ────────────────────────────────────────────────────────────

/**
 * Consumes a mixed agent-event stream, merges `metrics_ready` and `diagnosis_ready`
 * payloads into local Maps, then yields allocation decisions and (unless dryRun)
 * per-campaign mock-apply confirmations. All other events are passed through unchanged.
 *
 * O(C log C) per cycle. O(C × 24) steady-state memory.
 */
export async function* allocateCampaigns(
  diagnosisStream: AsyncIterable<AgentEvent>,
  config: AllocationConfig,
): AsyncGenerator<AgentEvent> {
  const metricsMap = new Map<string, CampaignMetrics>();
  const diagnosisMap = new Map<string, DiagnosisResult>();
  const historyMap = new Map<string, CampaignHistory>();
  const geoMetricsMap = new Map<string, GeoMetrics>();

  let hasMetrics = false;

  for await (const event of diagnosisStream) {
    switch (event.type) {
      case 'metrics_ready':
        for (const m of event.payload) {
          metricsMap.set(m.campaignId, m);
          trackGeoMetrics(geoMetricsMap, m);
          getOrInitHistory(historyMap, m.campaignId);
        }
        hasMetrics = true;
        break;

      case 'diagnosis_ready':
        for (const d of event.payload) {
          diagnosisMap.set(d.campaignId, d);
          applyDiagnosisToHistory(historyMap, d);
        }
        break;

      default:
        yield event;
    }
  }

  if (!hasMetrics) return;

  const decisions = runAllocationCycle(
    metricsMap,
    diagnosisMap,
    historyMap,
    geoMetricsMap,
    config,
  );

  yield { type: 'allocation_decided', payload: decisions };

  if (config.dryRun) return;

  for (const decision of decisions) {
    yield {
      type: 'allocation_applied',
      payload: {
        campaignId: decision.campaignId,
        platform: metricsMap.get(decision.campaignId)?.platform ?? 'unknown',
        result: 'applied',
      },
    };
  }
}

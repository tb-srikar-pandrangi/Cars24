/**
 * @file diagnosis.ts
 * @description CARS24-specific campaign anomaly detector. No AI calls. Pure logic only.
 *
 * Complexity:
 *   Time:   O(C) per cycle — all checks run in parallel via Promise.all across C campaigns
 *   Memory: O(C × 7) — fixed-size circular history buffer per campaign (7 entries)
 *
 * SELL funnel degrades via lead quality collapse (CPL spike, low appointment rate).
 * BUY funnel degrades via intent mismatch (clicks/appointments divergence, keyword drift).
 * FINANCE funnel is demand-linked — macro signal, not campaign signal.
 * SERVICES funnel must never be paused — every ₹1 of insurance GMV carries 35%+ margin.
 */
import type {
  AgentEvent,
  CampaignMetrics,
  FunnelHealth,
  DiagnosisResult,
  Issue,
  Action,
} from '@cars24/shared';
import { SELL_BENCHMARKS, BUY_BENCHMARKS } from '@cars24/shared';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type CheckResult = { issues: Issue[]; actions: Action[] };

type CompetitorCheckResult = CheckResult & {
  alertPayload?: { keyword: string; competitor: string; impressionShareLost: number };
};

// ---------------------------------------------------------------------------
// Circular history buffer — O(1) insert, O(HISTORY_SIZE) read
// ---------------------------------------------------------------------------

const HISTORY_SIZE = 7;

type RingBuf = {
  data: (CampaignMetrics | null)[];
  /** Next write slot; wraps around on overflow, overwriting the oldest entry. */
  head: number;
  count: number;
};

function createBuf(): RingBuf {
  return { data: new Array<CampaignMetrics | null>(HISTORY_SIZE).fill(null), head: 0, count: 0 };
}

/** O(1) */
function pushBuf(buf: RingBuf, m: CampaignMetrics): void {
  buf.data[buf.head] = m;
  buf.head = (buf.head + 1) % HISTORY_SIZE;
  if (buf.count < HISTORY_SIZE) buf.count++;
}

/** O(HISTORY_SIZE) — returns entries oldest-to-newest. */
function readOrdered(buf: RingBuf): CampaignMetrics[] {
  if (buf.count === 0) return [];
  const oldest = buf.count < HISTORY_SIZE ? 0 : buf.head;
  const result: CampaignMetrics[] = [];
  for (let i = 0; i < buf.count; i++) {
    const entry = buf.data[(oldest + i) % HISTORY_SIZE];
    if (entry !== null) result.push(entry);
  }
  return result;
}

function getOrCreateBuf(map: Map<string, RingBuf>, id: string): RingBuf {
  const existing = map.get(id);
  if (existing) return existing;
  const buf = createBuf();
  map.set(id, buf);
  return buf;
}

// ---------------------------------------------------------------------------
// Loans24 / Finance config — module-level constants (never mutated → pure)
// ---------------------------------------------------------------------------

/** CARS24 Loans24 business parameters used by FINANCE funnel checks. */
export const FINANCE_CONFIG = {
  /** Average Loans24 disbursement value in INR. */
  avgLoanValue: 500_000,
  /** Net margin (take rate) per loan as a fraction. */
  loanTakeRate: 0.02,
  /** Expected fraction of campaign leads that submit a loan application. */
  loanConversionBenchmark: 0.30,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** CPM = (spend / impressions) × 1000. Returns 0 when impressions = 0. */
function cpm(m: CampaignMetrics): number {
  return m.impressions > 0 ? (m.spend / m.impressions) * 1_000 : 0;
}

// ---------------------------------------------------------------------------
// SELL funnel checks
// ---------------------------------------------------------------------------

/**
 * Detects CPL spikes above the 7-day rolling average.
 * warning: CPL > 1.35× avg | critical: CPL > 1.6× avg
 */
export function checkCplSpike(m: CampaignMetrics, history: CampaignMetrics[]): CheckResult {
  if (history.length === 0) return { issues: [], actions: [] };
  const avg7d = mean(history.map(h => h.cpl));
  if (avg7d === 0) return { issues: [], actions: [] };

  const ratio = m.cpl / avg7d;
  if (ratio <= 1.35) return { issues: [], actions: [] };

  const severity = ratio > 1.6 ? 'critical' : 'warning';
  const delta = ratio - 1;

  const issue: Issue = {
    code: severity === 'critical' ? 'SELL_CPL_SPIKE_CRITICAL' : 'SELL_CPL_SPIKE_WARNING',
    description: `CPL ₹${m.cpl.toFixed(0)} is ${(delta * 100).toFixed(0)}% above 7-day average (₹${avg7d.toFixed(0)})`,
    severity,
    affectedMetric: 'cpl',
    delta,
  };

  const action: Action = severity === 'critical'
    ? {
        type: 'budget_shift',
        payload: { campaignId: m.campaignId, reason: 'CPL spike critical — redirect budget to lower-CPL campaigns' },
        estimatedCmaImpact: 0.18,
        confidence: 'high',
      }
    : {
        type: 'bid_adjust',
        payload: { campaignId: m.campaignId, adjustment: -0.15, reason: 'Reduce max CPL bid 15% to curb spike' },
        estimatedCmaImpact: 0.08,
        confidence: 'medium',
      };

  return { issues: [issue], actions: [action] };
}

/**
 * Flags appointment rate drop vs the SELL benchmark — primary signal of audience quality collapse.
 * warning: leadToApptRate < benchmark × 0.80 | critical: rate < benchmark × 0.65
 */
export function checkApptRateDrop(fh: FunnelHealth): CheckResult {
  const rate = fh.leadToAppointmentRate;
  const benchmark = SELL_BENCHMARKS.leadToAppointmentRate;
  const ratio = rate / benchmark;

  if (ratio >= 0.80) return { issues: [], actions: [] };

  const severity = ratio < 0.65 ? 'critical' : 'warning';
  const delta = ratio - 1;

  const issue: Issue = {
    code: severity === 'critical' ? 'SELL_APPT_RATE_DROP_CRITICAL' : 'SELL_APPT_RATE_DROP_WARNING',
    description: `Lead-to-appointment rate ${(rate * 100).toFixed(1)}% is ${(Math.abs(delta) * 100).toFixed(0)}% below SELL benchmark — audience quality collapse likely`,
    severity,
    affectedMetric: 'appointments',
    delta,
  };

  const action: Action = severity === 'critical'
    ? {
        type: 'audience_expand',
        payload: { campaignId: fh.campaignId, reason: 'Audience quality collapsed — pivot to car-intent lookalikes or first-party retargeting' },
        estimatedCmaImpact: 0.22,
        confidence: 'high',
      }
    : {
        type: 'creative_swap',
        payload: { campaignId: fh.campaignId, reason: 'Test stronger inspection-CTA creative to recover appointment intent' },
        estimatedCmaImpact: 0.09,
        confidence: 'medium',
      };

  return { issues: [issue], actions: [action] };
}

/**
 * Detects a geo with sustained spend but zero transactions for 3+ consecutive days.
 * critical: spend > ₹5,000/day AND transactions = 0 across last 3 data points
 */
export function checkGeoQuality(m: CampaignMetrics, history: CampaignMetrics[]): CheckResult {
  const all = [...history, m];
  const recent = all.slice(-3);

  if (recent.length < 3) return { issues: [], actions: [] };
  if (!recent.every(e => e.spend > 5_000 && e.transactions === 0)) {
    return { issues: [], actions: [] };
  }

  const wastedSpend = recent.reduce((s, e) => s + e.spend, 0);

  const issue: Issue = {
    code: 'SELL_GEO_NO_CONVERSION_CRITICAL',
    description: `Geo '${m.geo}' spent ₹${wastedSpend.toFixed(0)} over 3 days with 0 transactions — geo-audience mismatch`,
    severity: 'critical',
    affectedMetric: 'transactions',
    delta: -1,
  };

  const action: Action = {
    type: 'geo_pause',
    payload: { campaignId: m.campaignId, geo: m.geo, reason: 'Pause geo and audit targeting — no transactions despite sustained spend' },
    estimatedCmaImpact: 0.15,
    confidence: 'high',
  };

  return { issues: [issue], actions: [action] };
}

/**
 * Detects creative fatigue: CPM rising AND CTR falling simultaneously for 3+ consecutive days.
 * warning: both trends hold for every consecutive pair in the last 3 data points
 */
export function checkFrequencyBurn(m: CampaignMetrics, history: CampaignMetrics[]): CheckResult {
  const all = [...history, m];
  if (all.length < 3) return { issues: [], actions: [] };

  const recent = all.slice(-3);

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    const prevCpm = cpm(prev);
    const currCpm = cpm(curr);
    if (prevCpm === 0 || prev.ctr === 0) return { issues: [], actions: [] };
    if (currCpm <= prevCpm || curr.ctr >= prev.ctr) return { issues: [], actions: [] };
  }

  const delta = recent[0].ctr > 0 ? (m.ctr - recent[0].ctr) / recent[0].ctr : -1;

  const issue: Issue = {
    code: 'SELL_FREQUENCY_BURN_WARNING',
    description: `CPM rising and CTR falling for 3+ consecutive days in '${m.geo}' — creative fatigue detected`,
    severity: 'warning',
    affectedMetric: 'ctr',
    delta,
  };

  const action: Action = {
    type: 'creative_swap',
    payload: { campaignId: m.campaignId, reason: 'Rotate creative to break frequency fatigue — try new hook format or UGC' },
    estimatedCmaImpact: 0.10,
    confidence: 'medium',
  };

  return { issues: [issue], actions: [action] };
}

// ---------------------------------------------------------------------------
// BUY funnel checks
// ---------------------------------------------------------------------------

/**
 * Flags clicks-to-appointments divergence — indicator of keyword match type drift.
 * warning: clicks >15% above 7-day avg but appointments flat or falling (≤+5% noise band)
 */
export function checkIntentDilution(m: CampaignMetrics, history: CampaignMetrics[]): CheckResult {
  if (history.length === 0) return { issues: [], actions: [] };

  const avgClicks = mean(history.map(h => h.clicks));
  const avgAppts = mean(history.map(h => h.appointments));

  if (avgClicks === 0) return { issues: [], actions: [] };

  const clicksGrowing = m.clicks > avgClicks * 1.15;
  const apptsFlat = m.appointments <= (avgAppts > 0 ? avgAppts * 1.05 : 0);

  if (!clicksGrowing || !apptsFlat) return { issues: [], actions: [] };

  const delta = avgAppts > 0 ? m.appointments / avgAppts - 1 : -1;

  const issue: Issue = {
    code: 'BUY_INTENT_DILUTION_WARNING',
    description: `Clicks +${((m.clicks / avgClicks - 1) * 100).toFixed(0)}% vs 7-day avg but appointments flat — broad-match keyword drift diluting intent`,
    severity: 'warning',
    affectedMetric: 'appointments',
    delta,
  };

  const action: Action = {
    type: 'bid_adjust',
    payload: { campaignId: m.campaignId, reason: 'Tighten to exact-match transactional keywords; reduce broad-match allocation' },
    estimatedCmaImpact: 0.12,
    confidence: 'medium',
  };

  return { issues: [issue], actions: [action] };
}

/**
 * Detects negative contribution margin — acquiring cars at a net loss on every unit.
 * critical: CMA < 0
 */
export function checkCmaCollapse(m: CampaignMetrics): CheckResult {
  if (m.cma >= 0) return { issues: [], actions: [] };

  const issue: Issue = {
    code: 'BUY_CMA_COLLAPSE_CRITICAL',
    description: `CMA is ₹${m.cma.toFixed(0)} — net loss on every acquisition; immediate action required`,
    severity: 'critical',
    affectedMetric: 'cma',
    delta: m.cpa > 0 ? m.cma / m.cpa : -1,
  };

  const bidAction: Action = {
    type: 'bid_adjust',
    payload: { campaignId: m.campaignId, adjustment: -0.30, reason: 'CMA negative — cut max CPC bid 30% immediately' },
    estimatedCmaImpact: 0.25,
    confidence: 'high',
  };

  const shiftAction: Action = {
    type: 'budget_shift',
    payload: { campaignId: m.campaignId, reason: 'Redirect daily budget to positive-CMA BUY campaigns' },
    estimatedCmaImpact: 0.20,
    confidence: 'high',
  };

  return { issues: [issue], actions: [bidAction, shiftAction] };
}

/**
 * Detects supply-side inventory gaps: strong demand (high appointment rate) but
 * low transaction rate. This is an ops signal, not a campaign signal.
 * warning: apptRate > BUY benchmark AND transactionRate < 30%
 */
export function checkInventoryMismatch(m: CampaignMetrics): CheckResult {
  if (m.leads === 0 || m.appointments === 0) return { issues: [], actions: [] };

  const apptRate = m.appointments / m.leads;
  const txRate = m.transactions / m.appointments;

  if (apptRate <= BUY_BENCHMARKS.leadToAppointmentRate || txRate >= 0.30) {
    return { issues: [], actions: [] };
  }

  const delta = txRate / 0.30 - 1;

  const issue: Issue = {
    code: 'BUY_INVENTORY_MISMATCH_WARNING',
    description: `Appointment rate ${(apptRate * 100).toFixed(1)}% is above benchmark but transaction rate ${(txRate * 100).toFixed(1)}% is low in '${m.geo}' — ops: check car inventory and pricing`,
    severity: 'warning',
    affectedMetric: 'transactions',
    delta,
  };

  const action: Action = {
    type: 'funnel_stage_fix',
    payload: {
      campaignId: m.campaignId,
      geo: m.geo,
      reason: 'Supply-side gap — ops team: verify car inventory and pricing in this geo; demand is healthy',
      escalate: true,
    },
    estimatedCmaImpact: 0.18,
    confidence: 'medium',
  };

  return { issues: [issue], actions: [action] };
}

// ---------------------------------------------------------------------------
// FINANCE funnel checks
// ---------------------------------------------------------------------------

/**
 * Flags Loans24 conversion rate falling below 75% of the expected benchmark.
 * warning: loanApplications / leads < FINANCE_CONFIG.loanConversionBenchmark × 0.75
 */
export function checkLoanConversionDrop(m: CampaignMetrics, fh: FunnelHealth): CheckResult {
  if (m.leads === 0) return { issues: [], actions: [] };

  const convRate = m.loanApplications / m.leads;
  const threshold = FINANCE_CONFIG.loanConversionBenchmark * 0.75;

  if (convRate >= threshold) return { issues: [], actions: [] };

  const delta = convRate / FINANCE_CONFIG.loanConversionBenchmark - 1;

  const issue: Issue = {
    code: 'FINANCE_LOAN_CONVERSION_DROP_WARNING',
    description: `Loan application rate ${(convRate * 100).toFixed(1)}% is ${(Math.abs(delta) * 100).toFixed(0)}% below Loans24 benchmark — FINANCE funnel underperforming`,
    severity: 'warning',
    affectedMetric: 'loanApplications',
    delta,
  };

  const action: Action = {
    type: 'audience_expand',
    payload: { campaignId: m.campaignId, reason: 'Target finance-intent audiences — EMI search terms, pre-approved loan lookalikes' },
    estimatedCmaImpact: 0.10,
    confidence: 'medium',
  };

  return { issues: [issue], actions: [action] };
}

/**
 * Checks whether CPA exceeds 3× Loans24 lifetime value — acquiring at a macro loss.
 * critical: CPA > avgLoanValue × loanTakeRate × 3
 */
export function checkCpaVsLTV(m: CampaignMetrics): CheckResult {
  const ltv3 = FINANCE_CONFIG.avgLoanValue * FINANCE_CONFIG.loanTakeRate * 3;

  if (m.cpa <= ltv3) return { issues: [], actions: [] };

  const delta = m.cpa / ltv3 - 1;

  const issue: Issue = {
    code: 'FINANCE_CPA_VS_LTV_CRITICAL',
    description: `CPA ₹${m.cpa.toFixed(0)} exceeds 3-loan LTV of ₹${ltv3.toFixed(0)} — Loans24 acquisition is loss-making even on 3-loan customer lifetime`,
    severity: 'critical',
    affectedMetric: 'cpa',
    delta,
  };

  const action: Action = {
    type: 'budget_shift',
    payload: { campaignId: m.campaignId, reason: 'Shift budget away from loss-making loan acquisition segments; pause worst-CPA ad sets' },
    estimatedCmaImpact: 0.22,
    confidence: 'high',
  };

  return { issues: [issue], actions: [action] };
}

// ---------------------------------------------------------------------------
// SERVICES funnel checks
// ---------------------------------------------------------------------------

/**
 * Flags under-investment in SERVICES — the highest-margin CARS24 funnel (35%+ margin).
 * warning: daily spend < ₹2,000 (compounding loss at 35%+ margin floor)
 */
export function checkServicesBudgetSufficiency(m: CampaignMetrics): CheckResult {
  if (m.spend >= 2_000) return { issues: [], actions: [] };

  const delta = m.spend / 2_000 - 1;

  const issue: Issue = {
    code: 'SERVICES_BUDGET_LOW_WARNING',
    description: `SERVICES daily spend ₹${m.spend.toFixed(0)} is below ₹2,000 minimum — under-investing in the 35%+ margin funnel`,
    severity: 'warning',
    affectedMetric: 'spend',
    delta,
  };

  const action: Action = {
    type: 'budget_shift',
    payload: { campaignId: m.campaignId, reason: 'Increase SERVICES budget — insurance GMV margin (35%+) justifies a higher floor spend' },
    estimatedCmaImpact: 0.15,
    confidence: 'high',
  };

  return { issues: [issue], actions: [action] };
}

/**
 * Detects a shrinking retargeting pool by tracking monotonically declining impressions.
 * warning: impressions declining for every consecutive pair in last 5 data points
 */
export function checkRetargetingAudienceSize(m: CampaignMetrics, history: CampaignMetrics[]): CheckResult {
  const all = [...history, m];
  if (all.length < 5) return { issues: [], actions: [] };

  const recent = all.slice(-5);

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].impressions >= recent[i - 1].impressions) return { issues: [], actions: [] };
  }

  const delta = recent[0].impressions > 0 ? (m.impressions - recent[0].impressions) / recent[0].impressions : -1;

  const issue: Issue = {
    code: 'SERVICES_RETARGETING_POOL_SHRINKING_WARNING',
    description: `Impressions declining for 5+ consecutive days — retargeting pool shrinking; SELL/BUY funnel volume may be insufficient to replenish it`,
    severity: 'warning',
    affectedMetric: 'impressions',
    delta,
  };

  const action: Action = {
    type: 'audience_expand',
    payload: { campaignId: m.campaignId, reason: 'Expand SERVICES retargeting to recent SELL/BUY converters; broaden lookalike seed audience' },
    estimatedCmaImpact: 0.08,
    confidence: 'medium',
  };

  return { issues: [issue], actions: [action] };
}

// ---------------------------------------------------------------------------
// Competitor pressure check — all funnels
// ---------------------------------------------------------------------------

/** campaignId substring → competitor display name. */
const COMPETITOR_KEYWORDS: Readonly<Record<string, string>> = {
  spinny: 'Spinny',
  cardekho: 'CarDekho',
  branded: 'competitor-branded',
};

/**
 * Fires a `competitor_alert` when impression share on branded/competitor campaigns drops >20%.
 * The caller MUST yield the `alertPayload` immediately — do not batch with diagnosis_ready.
 */
export function checkImpressionShareLoss(
  m: CampaignMetrics,
  history: CampaignMetrics[],
): CompetitorCheckResult {
  if (history.length === 0) return { issues: [], actions: [] };

  const idLower = m.campaignId.toLowerCase();
  const matchedKeyword = Object.keys(COMPETITOR_KEYWORDS).find(k => idLower.includes(k));
  if (!matchedKeyword) return { issues: [], actions: [] };

  const avgImpressions = mean(history.map(h => h.impressions));
  if (avgImpressions === 0) return { issues: [], actions: [] };

  const impressionShareLost = 1 - m.impressions / avgImpressions;
  if (impressionShareLost <= 0.20) return { issues: [], actions: [] };

  const competitor = COMPETITOR_KEYWORDS[matchedKeyword];

  const issue: Issue = {
    code: 'ALL_IMPRESSION_SHARE_LOSS_WARNING',
    description: `Impression share dropped ${(impressionShareLost * 100).toFixed(0)}% on '${matchedKeyword}' campaign — ${competitor} likely outbidding`,
    severity: 'warning',
    affectedMetric: 'impressions',
    delta: -impressionShareLost,
  };

  const action: Action = {
    type: 'bid_adjust',
    payload: {
      campaignId: m.campaignId,
      adjustment: 0.20,
      reason: `Counter ${competitor} impression grab — raise bids 20% on branded/competitor keywords`,
    },
    estimatedCmaImpact: 0.12,
    confidence: 'medium',
  };

  return {
    issues: [issue],
    actions: [action],
    alertPayload: { keyword: matchedKeyword, competitor, impressionShareLost },
  };
}

// ---------------------------------------------------------------------------
// Severity aggregation
// ---------------------------------------------------------------------------

function aggregateSeverity(issues: Issue[]): DiagnosisResult['severity'] {
  if (issues.some(i => i.severity === 'critical')) return 'critical';
  if (issues.filter(i => i.severity === 'warning').length >= 2) return 'warning';
  return 'ok';
}

// ---------------------------------------------------------------------------
// Funnel-specific check dispatcher
// ---------------------------------------------------------------------------

function getFunnelChecks(
  m: CampaignMetrics,
  fh: FunnelHealth,
  history: CampaignMetrics[],
): Promise<CheckResult>[] {
  switch (m.funnel) {
    case 'SELL':
      return [
        Promise.resolve(checkCplSpike(m, history)),
        Promise.resolve(checkApptRateDrop(fh)),
        Promise.resolve(checkGeoQuality(m, history)),
        Promise.resolve(checkFrequencyBurn(m, history)),
      ];
    case 'BUY':
      return [
        Promise.resolve(checkIntentDilution(m, history)),
        Promise.resolve(checkCmaCollapse(m)),
        Promise.resolve(checkInventoryMismatch(m)),
      ];
    case 'FINANCE':
      return [
        Promise.resolve(checkLoanConversionDrop(m, fh)),
        Promise.resolve(checkCpaVsLTV(m)),
      ];
    case 'SERVICES':
      return [
        Promise.resolve(checkServicesBudgetSufficiency(m)),
        Promise.resolve(checkRetargetingAudienceSize(m, history)),
      ];
    default: {
      // Unreachable — guards against future Funnel values added without updating this file
      const _exhaustive: never = m.funnel;
      void _exhaustive;
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Streaming anomaly detector. Consumes an AgentEvent stream and emits:
 *   - `competitor_alert`  immediately on impression share loss (does not wait for batch)
 *   - `alert`             immediately for every campaign with severity === 'critical'
 *   - `diagnosis_ready`   once per `funnel_health` batch with all campaign results
 *
 * Listens only for `metrics_ready` and `funnel_health` events; all others are ignored.
 *
 * @complexity O(C) time per cycle; O(C × 7) memory for history buffers.
 */
export async function* diagnoseCampaigns(
  metricsStream: AsyncIterable<AgentEvent>,
): AsyncGenerator<AgentEvent> {
  const metricsMap = new Map<string, CampaignMetrics>();
  const historyMap = new Map<string, RingBuf>();

  for await (const event of metricsStream) {
    if (event.type === 'metrics_ready') {
      for (const m of event.payload) {
        metricsMap.set(m.campaignId, m);
      }
      continue;
    }

    if (event.type !== 'funnel_health') continue;

    const diagnoses: DiagnosisResult[] = [];

    for (const fh of event.payload) {
      const m = metricsMap.get(fh.campaignId);
      if (!m) continue;

      const buf = getOrCreateBuf(historyMap, fh.campaignId);
      const history = readOrdered(buf);

      // All checks run in parallel — competitor check + all funnel-specific checks
      const [competitorResult, funnelResults] = await Promise.all([
        Promise.resolve(checkImpressionShareLoss(m, history)),
        Promise.all(getFunnelChecks(m, fh, history)),
      ]);

      // Push current entry to history only after checks have read it
      pushBuf(buf, m);

      const allIssues = [...competitorResult.issues, ...funnelResults.flatMap(r => r.issues)];
      const allActions = [...competitorResult.actions, ...funnelResults.flatMap(r => r.actions)];
      const severity = aggregateSeverity(allIssues);

      const result: DiagnosisResult = {
        campaignId: m.campaignId,
        funnel: m.funnel,
        geo: m.geo,
        severity,
        issues: allIssues,
        recommendedActions: allActions,
        competitorPressure: competitorResult.alertPayload !== undefined,
      };

      // Competitor alert: yield immediately, do not wait for diagnosis_ready batch
      if (competitorResult.alertPayload) {
        yield { type: 'competitor_alert', payload: competitorResult.alertPayload };
      }

      // Critical alert: yield immediately so downstream agents can react without delay
      if (severity === 'critical') {
        yield { type: 'alert', payload: result };
      }

      diagnoses.push(result);
    }

    yield { type: 'diagnosis_ready', payload: diagnoses };
  }
}

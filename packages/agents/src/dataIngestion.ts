/**
 * dataIngestion.ts — CARS24 live campaign metrics ingestion across all 4 funnels.
 *
 * Normalisation pipeline: O(n) where n = total active campaigns across platforms.
 * Cache writes: O(1) amortised per campaign (Map.set overwrites in place).
 * Memory: O(n) steady-state — one CampaignMetrics entry (~320 bytes) per campaign.
 * Parallelism: all platform fetches run concurrently via Promise.all; never serial.
 *
 * Platform routing:
 *   SELL     → Meta (lead-gen C24_SELL_*) + Google (branded + "sell my car [city]")
 *   BUY      → Google (non-branded high-intent) + YouTube (awareness C24_BUY_*)
 *   FINANCE  → Google Search ("car loan", "used car EMI") + Meta (Loans24 lookalikes)
 *   SERVICES → Meta (retargeting recent buyers/sellers) + Google (remarketing)
 */

import type {
  AgentEvent,
  CampaignMetrics,
  Funnel,
  FunnelHealth,
  StageDropoff,
} from '@cars24/shared';

// ─── Benchmark constants (ingestion-layer copy; includes cost benchmarks) ─────

const FUNNEL_BENCHMARKS = {
  SELL: {
    cpl: 1_000,
    cpa: 3_500,
    cpt: 8_000,
    leadToApptRate: 0.45,
    apptToInspRate: 0.72,
    inspToTxnRate: 0.61,
  },
  BUY: {
    cpl: 1_800,
    cpa: 4_500,
    cpt: 12_000,
    leadToApptRate: 0.38,
    apptToInspRate: 0.65,
    inspToTxnRate: 0.55,
  },
  FINANCE: {
    cpl: 700,
    cpa: 2_000,
    cpt: 6_000,
    leadToApptRate: 0.52,
    apptToInspRate: 0.80,
    inspToTxnRate: 0.70,
  },
  SERVICES: {
    cpl: 300,
    cpa: 900,
    cpt: 2_500,
    leadToApptRate: 0.60,
    apptToInspRate: 0.85,
    inspToTxnRate: 0.75,
  },
} as const satisfies Record<
  Funnel,
  {
    cpl: number; cpa: number; cpt: number;
    leadToApptRate: number; apptToInspRate: number; inspToTxnRate: number;
  }
>;

// ─── Meta action-type → funnel field mapping ──────────────────────────────────

const META_LEAD_ACTIONS = new Set([
  'lead',
  'onsite_conversion.lead_grouped',
  'onsite_conversion.messaging_first_reply',
]);
const META_APPT_ACTIONS = new Set([
  'schedule',
  'onsite_conversion.schedule',
  'onsite_conversion.book_appointment',
]);
const META_TXN_ACTIONS = new Set([
  'purchase',
  'onsite_conversion.purchase',
  'fb_mobile_purchase',
]);
const META_LOAN_ACTIONS = new Set([
  'complete_registration',
  'submit_application',
  'onsite_conversion.submit_application',
]);

// ─── Google Ads conversion action → funnel field mapping ──────────────────────

const GOOGLE_LEAD_ACTIONS = new Set([
  'Submit Lead Form',
  'Call from Ads',
  'Lead Form Submission',
  'Website Lead',
]);
const GOOGLE_APPT_ACTIONS = new Set([
  'Book Appointment',
  'Inspection Booking',
  'Test Drive Booking',
]);
const GOOGLE_TXN_ACTIONS = new Set([
  'Purchase',
  'Deal Closed',
  'Car Sold',
  'Car Purchased',
]);
const GOOGLE_LOAN_ACTIONS = new Set([
  'Loan Application',
  'Loans24 Application',
  'Finance Application',
]);

// ─── Campaign naming convention ───────────────────────────────────────────────

const FUNNEL_CODE_TO_FUNNEL: Record<string, Funnel> = {
  SELL: 'SELL',
  BUY: 'BUY',
  FIN: 'FINANCE',
  SVC: 'SERVICES',
};

const GEO_ABBR_TO_SLUG: Record<string, string> = {
  BLR: 'bengaluru',
  NCR: 'ncr',
  MUM: 'mumbai',
  HYD: 'hyderabad',
  PUN: 'pune',
  CHN: 'chennai',
  AMD: 'ahmedabad',
  KOL: 'kolkata',
  UAE: 'uae',
  AUS: 'australia',
};

// ─── Public types ─────────────────────────────────────────────────────────────

export type IngestionConfig = {
  /**
   * 'mock'   — deterministic seeded data; no external calls (default in dev).
   * 'meta'   — Meta Graph API only.
   * 'google' — Google Ads API only.
   * 'all'    — Meta + Google in parallel.
   */
  mode: 'meta' | 'google' | 'all' | 'mock';

  // Meta
  metaAccessToken?: string;
  metaAdAccountId?: string;

  // Google Ads
  googleDeveloperToken?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  googleCustomerId?: string;

  /** Polling interval ms. Default: 60_000 (prod) | 5_000 (mock). */
  intervalMs?: number;

  /** Stop after this many cycles. Undefined = run until generator is abandoned. */
  maxCycles?: number;

  /** CARS24 retail margin fraction for SELL/BUY CMA calculation. Default 0.193. */
  retailMarginPct?: number;

  /** Average transaction value per funnel in INR. */
  avgTransactionValue?: Partial<Record<Funnel, number>>;

  /**
   * Loans24 take rate: CARS24's commission fraction on a disbursed loan.
   * Default 0.02 (2% of loan principal).
   */
  loanTakeRate?: number;

  /** Average Loans24 disbursement size in INR. Default 600_000. */
  avgLoanSize?: number;
};

// ─── Internal types ───────────────────────────────────────────────────────────

/** Platform-normalised data before derived-metric computation. */
type RawCampaignData = {
  campaignId: string;
  funnel: Funnel;
  platform: CampaignMetrics['platform'];
  geo: string;
  impressions: number;
  clicks: number;
  /** INR */
  spend: number;
  leads: number;
  appointments: number;
  transactions: number;
  loanApplications: number;
  /** 0–1 from platform */
  ctr: number;
  /** INR */
  cpc: number;
};

type DateRange = { since: string; until: string };

type ResolvedConfig = Required<
  Pick<
    IngestionConfig,
    | 'intervalMs'
    | 'retailMarginPct'
    | 'loanTakeRate'
    | 'avgLoanSize'
  >
> &
  IngestionConfig & {
    avgTransactionValue: Record<Funnel, number>;
  };

// Meta Graph API v19 internal shapes
type MetaActionValue = { action_type: string; value: string };
type MetaInsightRow = {
  campaign_id: string;
  campaign_name: string;
  impressions: string;
  clicks: string;
  spend: string;
  cpm: string;
  cpc: string;
  ctr: string;
  actions?: MetaActionValue[];
};
type MetaInsightsPage = {
  data: MetaInsightRow[];
  paging?: { next?: string };
};

// Google Ads REST API v16 internal shapes
type GoogleAdsRow = {
  campaign: { id: string; name: string };
  metrics: {
    impressions: string;
    clicks: string;
    cost_micros: string;
    conversions: string;
    ctr: string;
    average_cpc: string;
  };
  segments: { conversion_action_name?: string };
};
type GoogleSearchPage = { results?: GoogleAdsRow[]; nextPageToken?: string };

// ─── Utilities ────────────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

class RateLimitError extends Error {
  override readonly name = 'RateLimitError';
  constructor(readonly source: string) {
    super(`${source}: HTTP 429 rate-limited`);
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  source: string,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RateLimitError && attempt < maxRetries) {
        await sleep(2 ** attempt * 1_000); // 1 s → 2 s → 4 s
        continue;
      }
      throw err;
    }
  }
  // Unreachable: loop always throws or returns, but required for TS control-flow.
  throw new RateLimitError(source);
}

/** FNV-1a 32-bit hash — deterministic, no collisions for short strings. */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — fast, high quality, seedable. */
function mulberry32(seed: number): () => number {
  let s = seed;
  return function rng(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Returns a random float in [lo, hi] using the provided PRNG. */
function rngRange(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

/** Format a Date as YYYY-MM-DD in local time. */
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(lookbackDays = 1): DateRange {
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - (lookbackDays - 1));
  return { since: toYMD(since), until: toYMD(until) };
}

/**
 * Parses C24_SELL_BLR_*, C24_FIN_NCR_*, etc.
 * Returns null if the name doesn't match the convention — those campaigns are skipped.
 */
function parseCampaignName(
  name: string,
): { funnel: Funnel; geo: string } | null {
  const parts = name.toUpperCase().split('_');
  if (parts[0] !== 'C24' || parts.length < 3) return null;
  const funnel = FUNNEL_CODE_TO_FUNNEL[parts[1] ?? ''];
  if (!funnel) return null;
  const geoAbbr = parts[2] ?? '';
  const geo = GEO_ABBR_TO_SLUG[geoAbbr] ?? geoAbbr.toLowerCase();
  return { funnel, geo };
}

function resolveConfig(c: IngestionConfig): ResolvedConfig {
  const isMock = c.mode === 'mock';
  return {
    ...c,
    intervalMs: c.intervalMs ?? (isMock ? 5_000 : 60_000),
    retailMarginPct: c.retailMarginPct ?? 0.193,
    loanTakeRate: c.loanTakeRate ?? 0.02,
    avgLoanSize: c.avgLoanSize ?? 600_000,
    avgTransactionValue: {
      SELL: 800_000,
      BUY: 950_000,
      FINANCE: 0,
      SERVICES: 5_000,
      ...c.avgTransactionValue,
    },
  };
}

// ─── Derived metric computation ───────────────────────────────────────────────

/**
 * Converts a RawCampaignData row into a fully computed CampaignMetrics.
 * O(1) per row — no iteration, only arithmetic.
 */
function computeDerivedMetrics(
  raw: RawCampaignData,
  cfg: ResolvedConfig,
): CampaignMetrics {
  const { funnel, leads, appointments, transactions, loanApplications, spend } = raw;

  const cpl = leads > 0 ? spend / leads : 0;
  const cpa = appointments > 0 ? spend / appointments : 0;
  const cpt = transactions > 0 ? spend / transactions : 0;
  const avgTxn = cfg.avgTransactionValue[funnel];

  let cma = 0;
  if (funnel === 'SELL' || funnel === 'BUY') {
    // Contribution margin = retail margin on avg car value minus per-transaction acquisition cost
    cma = transactions > 0 ? avgTxn * cfg.retailMarginPct - cpt : 0;
  } else if (funnel === 'FINANCE') {
    // CARS24 commission on Loans24 disbursements minus cost per appointment
    cma = loanApplications > 0 ? cfg.loanTakeRate * cfg.avgLoanSize - cpa : 0;
  } else if (funnel === 'SERVICES') {
    cma = transactions > 0 ? avgTxn - cpt : 0;
  }

  let roas = 0;
  if (funnel === 'SELL' || funnel === 'BUY') {
    roas = spend > 0 ? (transactions * avgTxn) / spend : 0;
  } else if (funnel === 'FINANCE') {
    roas =
      spend > 0
        ? (loanApplications * cfg.avgLoanSize * cfg.loanTakeRate) / spend
        : 0;
  }

  return {
    campaignId: raw.campaignId,
    funnel: raw.funnel,
    platform: raw.platform,
    geo: raw.geo,
    impressions: raw.impressions,
    clicks: raw.clicks,
    spend,
    leads,
    appointments,
    transactions,
    loanApplications,
    cpl,
    cpa,
    cpt,
    cma,
    roas,
    ctr: raw.ctr,
    cpc: raw.cpc,
    timestamp: new Date(),
  };
}

// ─── FunnelHealth computation ─────────────────────────────────────────────────

/**
 * Derives FunnelHealth from a batch of CampaignMetrics.
 * Uses appointment count as proxy for inspection bookings (offline event not in platform data).
 * inspectionToTransactionRate = transactions / (appointments × benchmark_appt_to_insp_rate)
 * O(n) where n = campaigns in the batch.
 */
function computeFunnelHealth(batch: CampaignMetrics[]): FunnelHealth[] {
  return batch.map((m) => {
    const b = FUNNEL_BENCHMARKS[m.funnel];

    const leadToApptRate = m.leads > 0 ? m.appointments / m.leads : 0;

    // appointmentToInspectionRate: platform data has no inspection count.
    // Use benchmark as prior; adjust down proportionally when transactions are low.
    const impliedInspections = m.appointments * b.apptToInspRate;
    const apptToInspRate =
      impliedInspections > 0
        ? Math.min(1, m.transactions / (impliedInspections * b.inspToTxnRate))
        : 0;

    const inspToTxnRate =
      impliedInspections > 0 ? m.transactions / impliedInspections : 0;

    const stages: Array<{ stage: StageDropoff['stage']; current: number; benchmark: number }> = [
      { stage: 'lead_to_appt', current: leadToApptRate, benchmark: b.leadToApptRate },
      { stage: 'appt_to_inspection', current: apptToInspRate, benchmark: b.apptToInspRate },
      { stage: 'inspection_to_transaction', current: inspToTxnRate, benchmark: b.inspToTxnRate },
    ];

    const stageDropoffFlags: StageDropoff[] = stages.map(({ stage, current, benchmark }) => {
      const drop = benchmark > 0 ? (benchmark - current) / benchmark : 0;
      const severity: StageDropoff['severity'] =
        drop > 0.2 ? 'critical' : drop > 0.1 ? 'warning' : 'ok';
      return {
        stage,
        currentRate: current,
        benchmarkRate: benchmark,
        dropPct: drop,
        severity,
      };
    });

    return {
      campaignId: m.campaignId,
      funnel: m.funnel,
      leadToAppointmentRate: leadToApptRate,
      appointmentToInspectionRate: apptToInspRate,
      inspectionToTransactionRate: inspToTxnRate,
      stageDropoffFlags,
    };
  });
}

// ─── Platform adapter interface ───────────────────────────────────────────────

interface PlatformAdapter {
  readonly adapterName: string;
  fetchCampaigns(range: DateRange): Promise<RawCampaignData[]>;
}

// ─── MetaAdapter ──────────────────────────────────────────────────────────────

class MetaAdapter implements PlatformAdapter {
  readonly adapterName = 'meta';
  private readonly accessToken: string;
  private readonly adAccountId: string;

  constructor(cfg: IngestionConfig) {
    if (!cfg.metaAccessToken) throw new Error('MetaAdapter: metaAccessToken required');
    if (!cfg.metaAdAccountId) throw new Error('MetaAdapter: metaAdAccountId required');
    this.accessToken = cfg.metaAccessToken;
    this.adAccountId = cfg.metaAdAccountId;
  }

  async fetchCampaigns(range: DateRange): Promise<RawCampaignData[]> {
    const rows = await this.fetchAllPages(range);
    return rows.flatMap((row) => {
      const parsed = parseCampaignName(row.campaign_name);
      if (!parsed) return [];

      const actions = row.actions ?? [];
      const sumActions = (set: Set<string>): number =>
        actions
          .filter((a) => set.has(a.action_type))
          .reduce((acc, a) => acc + parseFloat(a.value), 0);

      return [
        {
          campaignId: row.campaign_id,
          funnel: parsed.funnel,
          platform: 'meta' as const,
          geo: parsed.geo,
          impressions: parseInt(row.impressions, 10),
          clicks: parseInt(row.clicks, 10),
          spend: parseFloat(row.spend),
          leads: Math.round(sumActions(META_LEAD_ACTIONS)),
          appointments: Math.round(sumActions(META_APPT_ACTIONS)),
          transactions: Math.round(sumActions(META_TXN_ACTIONS)),
          loanApplications: Math.round(sumActions(META_LOAN_ACTIONS)),
          ctr: parseFloat(row.ctr) / 100,
          cpc: parseFloat(row.cpc),
        } satisfies RawCampaignData,
      ];
    });
  }

  private async fetchAllPages(range: DateRange): Promise<MetaInsightRow[]> {
    const fields = [
      'campaign_id',
      'campaign_name',
      'impressions',
      'clicks',
      'spend',
      'cpm',
      'cpc',
      'ctr',
      'actions',
    ].join(',');

    const params = new URLSearchParams({
      fields,
      time_range: JSON.stringify({ since: range.since, until: range.until }),
      level: 'campaign',
      limit: '50',
      access_token: this.accessToken,
    });

    let url: string | null =
      `https://graph.facebook.com/v19.0/act_${this.adAccountId}/insights?${params}`;

    const results: MetaInsightRow[] = [];

    while (url !== null) {
      const res = await fetch(url);
      if (res.status === 429) throw new RateLimitError('meta');
      if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);
      const page = (await res.json()) as MetaInsightsPage;
      results.push(...page.data);
      url = page.paging?.next ?? null;
    }

    return results;
  }
}

// ─── GoogleAdapter ────────────────────────────────────────────────────────────

class GoogleAdapter implements PlatformAdapter {
  readonly adapterName = 'google';
  private readonly developerToken: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly customerId: string;
  private accessToken: string | null = null;

  constructor(cfg: IngestionConfig) {
    if (!cfg.googleDeveloperToken) throw new Error('GoogleAdapter: googleDeveloperToken required');
    if (!cfg.googleClientId) throw new Error('GoogleAdapter: googleClientId required');
    if (!cfg.googleClientSecret) throw new Error('GoogleAdapter: googleClientSecret required');
    if (!cfg.googleRefreshToken) throw new Error('GoogleAdapter: googleRefreshToken required');
    if (!cfg.googleCustomerId) throw new Error('GoogleAdapter: googleCustomerId required');
    this.developerToken = cfg.googleDeveloperToken;
    this.clientId = cfg.googleClientId;
    this.clientSecret = cfg.googleClientSecret;
    this.refreshToken = cfg.googleRefreshToken;
    this.customerId = cfg.googleCustomerId;
  }

  async fetchCampaigns(range: DateRange): Promise<RawCampaignData[]> {
    const token = await this.ensureToken();
    const rows = await this.runGaqlQuery(token, range);
    return this.aggregateRows(rows);
  }

  private async ensureToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
    const json = (await res.json()) as { access_token: string };
    this.accessToken = json.access_token;
    // Tokens expire in ~1 h; clear after 55 min so the next cycle refreshes.
    setTimeout(() => { this.accessToken = null; }, 55 * 60 * 1_000);
    return this.accessToken;
  }

  private async runGaqlQuery(token: string, range: DateRange): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        segments.conversion_action_name
      FROM campaign
      WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'
        AND campaign.status = 'ENABLED'
      ORDER BY campaign.id
    `.trim();

    const baseUrl = `https://googleads.googleapis.com/v16/customers/${this.customerId}/googleAds:search`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'developer-token': this.developerToken,
      'Content-Type': 'application/json',
    };

    const results: GoogleAdsRow[] = [];
    let pageToken: string | undefined;

    do {
      const body = JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) });
      const res = await fetch(baseUrl, { method: 'POST', headers, body });

      if (res.status === 429) {
        this.accessToken = null; // force re-auth on next attempt
        throw new RateLimitError('google');
      }
      if (res.status === 401) {
        this.accessToken = null;
        throw new Error('Google API 401: token expired, will retry');
      }
      if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);

      const page = (await res.json()) as GoogleSearchPage;
      results.push(...(page.results ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);

    return results;
  }

  /**
   * Google returns one row per (campaign × conversion_action_name).
   * Base metrics (impressions, clicks, cost) are identical across all rows for a campaign;
   * we take them from the first row and sum conversions by action name.
   */
  private aggregateRows(rows: GoogleAdsRow[]): RawCampaignData[] {
    type Partial_ = {
      campaignId: string;
      campaignName: string;
      impressions: number;
      clicks: number;
      spend: number;
      ctr: number;
      cpc: number;
      leads: number;
      appointments: number;
      transactions: number;
      loanApplications: number;
      baseSet: boolean;
    };

    const map = new Map<string, Partial_>();

    for (const row of rows) {
      const id = row.campaign.id;
      let entry = map.get(id);

      if (!entry) {
        entry = {
          campaignId: id,
          campaignName: row.campaign.name,
          impressions: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
          cpc: 0,
          leads: 0,
          appointments: 0,
          transactions: 0,
          loanApplications: 0,
          baseSet: false,
        };
        map.set(id, entry);
      }

      // Base metrics are duplicated across rows — only set once.
      if (!entry.baseSet) {
        entry.impressions = parseInt(row.metrics.impressions, 10);
        entry.clicks = parseInt(row.metrics.clicks, 10);
        entry.spend = parseInt(row.metrics.cost_micros, 10) / 1_000_000; // micros → INR
        entry.ctr = parseFloat(row.metrics.ctr);
        entry.cpc = parseInt(row.metrics.average_cpc, 10) / 1_000_000;
        entry.baseSet = true;
      }

      const actionName = row.segments.conversion_action_name ?? '';
      const count = Math.round(parseFloat(row.metrics.conversions));
      if (GOOGLE_LEAD_ACTIONS.has(actionName)) entry.leads += count;
      else if (GOOGLE_APPT_ACTIONS.has(actionName)) entry.appointments += count;
      else if (GOOGLE_TXN_ACTIONS.has(actionName)) entry.transactions += count;
      else if (GOOGLE_LOAN_ACTIONS.has(actionName)) entry.loanApplications += count;
    }

    const result: RawCampaignData[] = [];
    for (const entry of map.values()) {
      const parsed = parseCampaignName(entry.campaignName);
      if (!parsed) continue;
      result.push({
        campaignId: entry.campaignId,
        funnel: parsed.funnel,
        platform: 'google',
        geo: parsed.geo,
        impressions: entry.impressions,
        clicks: entry.clicks,
        spend: entry.spend,
        leads: entry.leads,
        appointments: entry.appointments,
        transactions: entry.transactions,
        loanApplications: entry.loanApplications,
        ctr: entry.ctr,
        cpc: entry.cpc,
      });
    }
    return result;
  }
}

// ─── MockAdapter ──────────────────────────────────────────────────────────────

/**
 * Deterministic mock data seeded per (campaignId + date).
 * Stable across reloads; simulates realistic seasonal variation.
 */
class MockAdapter implements PlatformAdapter {
  readonly adapterName = 'mock';

  private static readonly GEOS = [
    'bengaluru', 'ncr', 'mumbai', 'hyderabad', 'pune',
    'chennai', 'ahmedabad', 'kolkata', 'uae', 'australia',
  ] as const;

  private static readonly GEO_MULTIPLIER: Record<string, number> = {
    mumbai: 1.5, ncr: 1.4, bengaluru: 1.3, hyderabad: 1.2, chennai: 1.1,
    pune: 1.0, ahmedabad: 0.9, kolkata: 0.8, uae: 0.7, australia: 0.4,
  };

  private static readonly FUNNEL_PLATFORM_CFG = {
    SELL: [
      { platform: 'meta' as const, baseCTR: 0.025, leadRate: 0.030, baseSpend: 50_000 },
      { platform: 'google' as const, baseCTR: 0.040, leadRate: 0.035, baseSpend: 55_000 },
    ],
    BUY: [
      { platform: 'google' as const, baseCTR: 0.045, leadRate: 0.020, baseSpend: 45_000 },
      { platform: 'youtube' as const, baseCTR: 0.004, leadRate: 0.005, baseSpend: 30_000 },
    ],
    FINANCE: [
      { platform: 'google' as const, baseCTR: 0.035, leadRate: 0.050, baseSpend: 35_000 },
      { platform: 'meta' as const, baseCTR: 0.020, leadRate: 0.045, baseSpend: 30_000 },
    ],
    SERVICES: [
      { platform: 'meta' as const, baseCTR: 0.025, leadRate: 0.040, baseSpend: 20_000 },
      { platform: 'google' as const, baseCTR: 0.030, leadRate: 0.035, baseSpend: 18_000 },
    ],
  } as const;

  /**
   * Time-of-day multiplier. `now` should be in IST (UTC+5:30).
   * SELL peaks: 9–11 am and 6–9 pm. BUY peaks: evenings. Finance/Services flat.
   */
  private static timeMultiplier(funnel: Funnel, now: Date): number {
    const istHour = (now.getUTCHours() + 5.5) % 24;
    const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;

    if (funnel === 'SELL') {
      const peak = (istHour >= 9 && istHour < 11) || (istHour >= 18 && istHour < 21);
      return (peak ? 1.4 : 0.85) * (isWeekend ? 0.70 : 1.0);
    }
    if (funnel === 'BUY') {
      const peak = istHour >= 17 && istHour < 22;
      return (peak ? 1.3 : 0.90) * (isWeekend ? 1.20 : 1.0);
    }
    if (funnel === 'FINANCE') {
      const peak = istHour >= 10 && istHour < 14;
      return (peak ? 1.2 : 0.90) * (isWeekend ? 0.80 : 1.0);
    }
    // SERVICES — retargeting, relatively flat
    const peak = istHour >= 17 && istHour < 20;
    return peak ? 1.1 : 0.95;
  }

  async fetchCampaigns(_range: DateRange): Promise<RawCampaignData[]> {
    const now = new Date();
    const dateKey = toYMD(now);
    const funnels: Funnel[] = ['SELL', 'BUY', 'FINANCE', 'SERVICES'];
    const results: RawCampaignData[] = [];

    for (const funnel of funnels) {
      const b = FUNNEL_BENCHMARKS[funnel];
      const timeMul = MockAdapter.timeMultiplier(funnel, now);
      const platCfgs = MockAdapter.FUNNEL_PLATFORM_CFG[funnel];

      for (const geo of MockAdapter.GEOS) {
        const geoMul = MockAdapter.GEO_MULTIPLIER[geo] ?? 1.0;

        for (const platCfg of platCfgs) {
          const geoAbbr = Object.entries(GEO_ABBR_TO_SLUG)
            .find(([, slug]) => slug === geo)?.[0] ?? geo.toUpperCase().slice(0, 3);
          const funnelCode = funnel === 'FINANCE' ? 'FIN' : funnel === 'SERVICES' ? 'SVC' : funnel;
          const platformCode = platCfg.platform.toUpperCase().slice(0, 3);
          const campaignId = `C24_${funnelCode}_${geoAbbr}_${platformCode}_001`;

          const seed = hashStr(`${campaignId}:${dateKey}`);
          const rng = mulberry32(seed);
          const variance = () => rngRange(rng, 0.82, 1.18);

          const adjustedSpend = platCfg.baseSpend * geoMul * timeMul * variance();
          const cpc = (b.cpl * platCfg.leadRate) * variance();
          const ctr = platCfg.baseCTR * variance();
          const clicks = cpc > 0 ? Math.round(adjustedSpend / cpc) : 0;
          const impressions = ctr > 0 ? Math.round(clicks / ctr) : 0;
          const leads = Math.round(clicks * platCfg.leadRate * variance());
          const appointments = Math.round(leads * b.leadToApptRate * variance());
          const impliedInspections = Math.round(appointments * b.apptToInspRate);
          const transactions = Math.round(impliedInspections * b.inspToTxnRate * variance());

          let loanApplications = 0;
          if (funnel === 'FINANCE') {
            loanApplications = leads;
          } else if (funnel === 'SELL') {
            loanApplications = Math.round(transactions * rngRange(rng, 0.25, 0.35));
          } else if (funnel === 'BUY') {
            loanApplications = Math.round(transactions * rngRange(rng, 0.35, 0.45));
          }

          results.push({
            campaignId,
            funnel,
            platform: platCfg.platform,
            geo,
            impressions,
            clicks,
            spend: Math.round(adjustedSpend),
            leads,
            appointments,
            transactions,
            loanApplications,
            ctr,
            cpc: Math.round(cpc),
          });
        }
      }
    }

    return results;
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Polls all configured platforms in parallel, normalises metrics, updates cache,
 * and yields `metrics_ready` then `funnel_health` per cycle.
 *
 * On rate-limit exhaustion (3 retries), yields `ingest_error` with stale:true
 * and falls back to cached data for the affected platform.
 *
 * Callers abandon the generator by breaking the `for await` loop; no cleanup needed.
 *
 * @example
 * ```ts
 * for await (const event of ingestCampaigns({ mode: 'mock' })) {
 *   bus.forward(event);
 * }
 * ```
 */
export async function* ingestCampaigns(
  config: IngestionConfig,
): AsyncGenerator<AgentEvent, void, unknown> {
  const cfg = resolveConfig(config);

  const adapters: PlatformAdapter[] =
    cfg.mode === 'mock'
      ? [new MockAdapter()]
      : [
          ...(cfg.mode === 'meta' || cfg.mode === 'all' ? [new MetaAdapter(cfg)] : []),
          ...(cfg.mode === 'google' || cfg.mode === 'all' ? [new GoogleAdapter(cfg)] : []),
        ];

  // O(n) steady-state cache: one entry per campaignId, overwritten in place each cycle.
  const cache = new Map<string, CampaignMetrics>();
  let cycle = 0;

  while (cfg.maxCycles === undefined || cycle < cfg.maxCycles) {
    const range = getDateRange();
    const rawBatches: RawCampaignData[] = [];

    // Fetch all platforms concurrently — never serial per the constraint.
    const fetches = await Promise.allSettled(
      adapters.map((adapter) =>
        withRetry(() => adapter.fetchCampaigns(range), adapter.adapterName),
      ),
    );

    for (let i = 0; i < fetches.length; i++) {
      const result = fetches[i];
      if (result === undefined) continue;

      if (result.status === 'fulfilled') {
        rawBatches.push(...result.value);
      } else {
        const adapterName = adapters[i]?.adapterName ?? 'unknown';
        const isStale = result.reason instanceof RateLimitError;
        yield {
          type: 'ingest_error',
          payload: {
            source: adapterName,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
            stale: isStale,
          },
        };
        // Supplement with stale cached data for this platform's campaigns.
        if (isStale) {
          // 'mock' adapter covers all platforms — serve entire cache on its failure.
          const platformFilter: CampaignMetrics['platform'] | 'all' =
            adapterName === 'mock' ? 'all'
            : adapterName === 'meta' ? 'meta'
            : adapterName === 'google' ? 'google'
            : 'all';
          for (const cached of cache.values()) {
            if (platformFilter === 'all' || cached.platform === platformFilter) {
              rawBatches.push({
                campaignId: cached.campaignId,
                funnel: cached.funnel,
                platform: cached.platform,
                geo: cached.geo,
                impressions: cached.impressions,
                clicks: cached.clicks,
                spend: cached.spend,
                leads: cached.leads,
                appointments: cached.appointments,
                transactions: cached.transactions,
                loanApplications: cached.loanApplications,
                ctr: cached.ctr,
                cpc: cached.cpc,
              });
            }
          }
        }
      }
    }

    // Normalise raw rows to CampaignMetrics and update cache in O(n).
    const metricsThisCycle: CampaignMetrics[] = [];
    for (const raw of rawBatches) {
      const m = computeDerivedMetrics(raw, cfg);
      cache.set(m.campaignId, m); // O(1)
      metricsThisCycle.push(m);
    }

    if (metricsThisCycle.length > 0) {
      yield { type: 'metrics_ready', payload: metricsThisCycle };

      const health = computeFunnelHealth(metricsThisCycle);
      yield { type: 'funnel_health', payload: health };
    }

    cycle++;
    if (cfg.maxCycles === undefined || cycle < cfg.maxCycles) {
      await sleep(cfg.intervalMs);
    }
  }
}

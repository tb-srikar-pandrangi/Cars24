/**
 * @cars24/shared — canonical domain types for the growth operator.
 * All types are plain data; no class instances, no runtime cost.
 * O(1) — compile-time only.
 */
/** The 4 funnels CARS24 runs in parallel. */
export type Funnel = 'SELL' | 'BUY' | 'FINANCE' | 'SERVICES';
/** Core campaign metrics — normalised across Meta and Google. */
export type CampaignMetrics = {
    campaignId: string;
    funnel: Funnel;
    platform: 'meta' | 'google' | 'youtube';
    /** City or region slug e.g. 'bengaluru', 'ncr', 'uae'. */
    geo: string;
    impressions: number;
    clicks: number;
    /** Spend in INR. */
    spend: number;
    /** Form fills / calls. */
    leads: number;
    /** Inspection bookings (SELL) or test drive bookings (BUY). */
    appointments: number;
    /** Completed buy/sell. */
    transactions: number;
    /** Loans24 applications initiated. */
    loanApplications: number;
    /** Cost per lead. */
    cpl: number;
    /** Cost per appointment. */
    cpa: number;
    /** Cost per transaction. */
    cpt: number;
    /** Contribution margin per acquisition — north star metric. */
    cma: number;
    roas: number;
    ctr: number;
    cpc: number;
    timestamp: Date;
};
export type StageDropoff = {
    stage: 'lead_to_appt' | 'appt_to_inspection' | 'inspection_to_transaction';
    currentRate: number;
    /** SELL benchmarks: 0.45 / 0.72 / 0.61 */
    benchmarkRate: number;
    dropPct: number;
    severity: 'critical' | 'warning' | 'ok';
};
/** Funnel-stage conversion rates — SELL funnel: lead→appointment→inspection→transaction. */
export type FunnelHealth = {
    campaignId: string;
    funnel: Funnel;
    leadToAppointmentRate: number;
    appointmentToInspectionRate: number;
    inspectionToTransactionRate: number;
    stageDropoffFlags: StageDropoff[];
};
export type Issue = {
    code: string;
    description: string;
    severity: 'critical' | 'warning';
    affectedMetric: keyof CampaignMetrics;
    /** % change from benchmark. */
    delta: number;
};
export type Action = {
    type: 'bid_adjust' | 'budget_shift' | 'creative_swap' | 'audience_expand' | 'geo_pause' | 'funnel_stage_fix';
    payload: Record<string, unknown>;
    /** Estimated improvement in CMA. */
    estimatedCmaImpact: number;
    confidence: 'high' | 'medium' | 'low';
};
export type DiagnosisResult = {
    campaignId: string;
    funnel: Funnel;
    geo: string;
    severity: 'critical' | 'warning' | 'ok';
    issues: Issue[];
    recommendedActions: Action[];
    /** true if Spinny/CarDekho bidding on same keywords. */
    competitorPressure: boolean;
};
export type CreativeVariant = {
    headline: string;
    body: string;
    cta: string;
    rationale: string;
};
export type CreativeScore = {
    adId: string;
    funnel: Funnel;
    /** "140-point", "45-min payment", "7-day return", "RBI licensed". */
    trustSignalPresent: boolean;
    /** EMI figure or "₹X lakh" present. */
    priceAnchorPresent: boolean;
    /** City name in copy. */
    geoPersonalised: boolean;
    /** "depreciation", "limited stock", "book now". */
    urgencySignalPresent: boolean;
    /** 0–1 */
    hookScore: number;
    /** 0–1 */
    bodyScore: number;
    /** 0–1 */
    ctaScore: number;
    /** 0–1 */
    overallScore: number;
    suggestedVariant?: CreativeVariant;
};
export type AllocationDecision = {
    campaignId: string;
    funnel: Funnel;
    geo: string;
    /** Multiplier, e.g. +0.15 = +15%. */
    bidAdjustment: number;
    /** INR amount to move. */
    budgetShift: number;
    /** campaignId to receive shifted budget. */
    budgetShiftTarget?: string;
    audienceExpansion: boolean;
    geoAction: 'expand' | 'pause' | 'maintain';
    reason: string;
    estimatedCmaImpact: number;
};
/** Union of all events the agents yield. */
export type AgentEvent = {
    type: 'metrics_ready';
    payload: CampaignMetrics[];
} | {
    type: 'funnel_health';
    payload: FunnelHealth[];
} | {
    type: 'diagnosis_ready';
    payload: DiagnosisResult[];
} | {
    type: 'alert';
    payload: DiagnosisResult;
} | {
    type: 'creative_scored';
    payload: CreativeScore;
} | {
    type: 'creative_improved';
    payload: {
        adId: string;
        funnel: Funnel;
        original: CreativeVariant;
        variant: CreativeVariant;
    };
} | {
    type: 'allocation_decided';
    payload: AllocationDecision[];
} | {
    type: 'allocation_applied';
    payload: {
        campaignId: string;
        platform: string;
        result: string;
    };
} | {
    type: 'ingest_error';
    payload: {
        source: string;
        error: string;
        stale: boolean;
    };
} | {
    type: 'competitor_alert';
    payload: {
        keyword: string;
        competitor: string;
        impressionShareLost: number;
    };
};
//# sourceMappingURL=types.d.ts.map
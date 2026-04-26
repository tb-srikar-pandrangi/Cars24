/**
 * CARS24 internal benchmarks and platform constants.
 * All values are sourced from internal performance data.
 * O(1) — plain object lookups, no computation.
 */

export const SELL_BENCHMARKS = {
  leadToAppointmentRate: 0.45,
  appointmentToInspectionRate: 0.72,
  inspectionToTransactionRate: 0.61,
} as const;

export const BUY_BENCHMARKS = {
  leadToAppointmentRate: 0.38,
  appointmentToInspectionRate: 0.65,
  inspectionToTransactionRate: 0.55,
} as const;

export const FINANCE_BENCHMARKS = {
  leadToAppointmentRate: 0.42,
  appointmentToInspectionRate: 0.68,
  inspectionToTransactionRate: 0.50,
} as const;

export const SERVICES_BENCHMARKS = {
  leadToAppointmentRate: 0.35,
  appointmentToInspectionRate: 0.60,
  inspectionToTransactionRate: 0.48,
} as const;

/** Drop thresholds (fraction) beyond which a stage triggers a flag. */
export const STAGE_SEVERITY_THRESHOLDS = {
  critical: 0.20,
  warning: 0.10,
} as const;

export const TRUST_SIGNALS = [
  '140-point',
  '45-min payment',
  '7-day return',
  'RBI licensed',
] as const;

export const URGENCY_SIGNALS = [
  'depreciation',
  'limited stock',
  'book now',
  'today only',
  'offer ends',
] as const;

export const COMPETITORS = ['Spinny', 'CarDekho', 'OLX Autos', 'Droom'] as const;

export const GEO_SLUGS = [
  'bengaluru',
  'ncr',
  'mumbai',
  'hyderabad',
  'pune',
  'chennai',
  'kolkata',
  'ahmedabad',
  'uae',
] as const;

export type GeoSlug = (typeof GEO_SLUGS)[number];

export const FUNNELS = ['SELL', 'BUY', 'FINANCE', 'SERVICES'] as const;

/** Minimum overall CreativeScore before a swap is recommended. */
export const CREATIVE_SCORE_SWAP_THRESHOLD = 0.6;

/** Maximum INR budget that can be shifted in a single allocation run. */
export const MAX_BUDGET_SHIFT_INR = 500_000;

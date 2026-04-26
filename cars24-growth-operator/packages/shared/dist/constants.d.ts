/**
 * CARS24 internal benchmarks and platform constants.
 * All values are sourced from internal performance data.
 * O(1) — plain object lookups, no computation.
 */
export declare const SELL_BENCHMARKS: {
    readonly leadToAppointmentRate: 0.45;
    readonly appointmentToInspectionRate: 0.72;
    readonly inspectionToTransactionRate: 0.61;
};
export declare const BUY_BENCHMARKS: {
    readonly leadToAppointmentRate: 0.38;
    readonly appointmentToInspectionRate: 0.65;
    readonly inspectionToTransactionRate: 0.55;
};
export declare const FINANCE_BENCHMARKS: {
    readonly leadToAppointmentRate: 0.42;
    readonly appointmentToInspectionRate: 0.68;
    readonly inspectionToTransactionRate: 0.5;
};
export declare const SERVICES_BENCHMARKS: {
    readonly leadToAppointmentRate: 0.35;
    readonly appointmentToInspectionRate: 0.6;
    readonly inspectionToTransactionRate: 0.48;
};
/** Drop thresholds (fraction) beyond which a stage triggers a flag. */
export declare const STAGE_SEVERITY_THRESHOLDS: {
    readonly critical: 0.2;
    readonly warning: 0.1;
};
export declare const TRUST_SIGNALS: readonly ["140-point", "45-min payment", "7-day return", "RBI licensed"];
export declare const URGENCY_SIGNALS: readonly ["depreciation", "limited stock", "book now", "today only", "offer ends"];
export declare const COMPETITORS: readonly ["Spinny", "CarDekho", "OLX Autos", "Droom"];
export declare const GEO_SLUGS: readonly ["bengaluru", "ncr", "mumbai", "hyderabad", "pune", "chennai", "kolkata", "ahmedabad", "uae"];
export type GeoSlug = (typeof GEO_SLUGS)[number];
export declare const FUNNELS: readonly ["SELL", "BUY", "FINANCE", "SERVICES"];
/** Minimum overall CreativeScore before a swap is recommended. */
export declare const CREATIVE_SCORE_SWAP_THRESHOLD = 0.6;
/** Maximum INR budget that can be shifted in a single allocation run. */
export declare const MAX_BUDGET_SHIFT_INR = 500000;
//# sourceMappingURL=constants.d.ts.map